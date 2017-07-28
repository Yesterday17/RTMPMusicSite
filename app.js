const express = require('express');
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');
const mp3Duration = require('mp3-duration');
const fs = require('fs');
const request = require('request');
const bililive = require('bilibili-live');

var imagePath = "public/bg.jpg";
var rtmp = "rtmp://txy.live-send.acg.tv/live-txy/",
    code = "?streamname=live_5756570_9523584&key=4538034d78aa78c768f5d47fac9e2ec7";

var outputPath = rtmp + code;

//var main_cookie = null;
var main_cookie = `["__remember_me=true; Expires=Sat, 12 Aug 2017 14:37:09 GMT; Path=/; HttpOnly; hostOnly=true; aAge=2ms; cAge=5ms","MUSIC_U=ced7246c9b16c7788328d86b8fe5ae79eaadb63c6b5cfb97a9f2f26e059ef982801d544a8026e149ada05087280cb40efd8838aa19117b01; Expires=Sat, 12 Aug 2017 14:37:09 GMT; Path=/; HttpOnly; hostOnly=true; aAge=2ms; cAge=5ms","__csrf=7ca317c75a07441e81b4c541ccb6764e; Expires=Sat, 12 Aug 2017 14:37:19 GMT; Path=/; hostOnly=true; aAge=3ms; cAge=6ms"]`;

var sleep = function (time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    })
};

var startDate = Date();

var play = liveMusic = function (musicStream) {
    return new Promise(function (resolve, reject) {
        console.log("Playing " + musicStream);
        mp3Duration(musicStream, function (err, duration) {
            var proc = ffmpeg(musicStream);
            proc //.loop()
                .fps(20)
                //.input("concat:public/test.mp3|public/test2.mp3|public/test3.mp3")
                .input(imagePath)
                .loop()
                .audioCodec("libmp3lame")
                .audioBitrate(128)
                .on('start', function (cmd) {
                    console.log('Spawned FFmpeg with command: ' + cmd);

                    startDate = Date.now();
                })
                .on('error', function (err, stdout, stderr) {
                    console.error('error: ' + err.message);
                    console.error('stdout: ' + stdout);
                    console.error('stderr: ' + stderr);
                })
                .on('end', function () {
                    console.log('Processing finished !');
                    resolve();
                })
                .on('codecData', function (data) {
                    console.log(data.audio);
                })
                .on("progress", function (prog) {
                    console.log((new Date() - startDate) / 1000 + "/" + duration);

                    console.log(prog.percent + "\n" + prog.currentKbps);

                    /*
                    if ((new Date() - startDate) / 1000 >= duration) {
                        proc.kill('SIGKILL');
                        resolve();
                    }
                    */

                    if (prog.percent >= 110) {
                        proc.kill('SIGKILL');
                        resolve();
                    }
                })
                .addOptions([
                    '-vcodec libx264',
                    '-preset veryfast',
                    '-c:a aac',
                    '-crf 22',
                    '-maxrate 1000k',
                    '-bufsize 3000k',
                    "-ac 2",
                    "-ar 44100",
                    '-b:a 96k'
                ])
                .format('flv')
                .output(outputPath, {
                    end: true
                })
                .run();
        });
    })

}

function downloadFile(uri, filename) {
    return new Promise(function (resolve, reject) {
        var stream = fs.createWriteStream(filename);
        request(uri).pipe(stream).on('close', function () {
            resolve();
        });
    });
}

var loginNetease = function (phone, passwd) {
    return new Promise(function (resolve, reject) {
        var j = request.jar()
        request({
            uri: 'http://localhost:3000/login/cellphone?phone=13641726341&password=qq1546923417',
            jar: j
        }, function () {
            var cookies = j.getCookies('http://localhost:3000/login/cellphone?phone=13641726341&password=qq1546923417');
            console.log(cookies);
            resolve(cookies);
        });
    })
}

var getPersonalFM = function (cookie) {
    return new Promise(function (resolve, reject) {
        var cookies = new Array();
        var j = request.jar()

        for (let k in cookie) {
            let ck = request.cookie(cookie[k].key + "=" + cookie[k].value);
            j.setCookie(ck, "http://localhost:3000/");
            //cookies.push(cookie[k].key + "=" + cookie[k].value);
        }
        //var ck = request.cookie(cookies[2]);
        request({
            uri: "http://localhost:3000/personal_fm",
            jar: j
        }, function (error, response, body) {
            resolve(JSON.parse(body));
        });
    })
}

var getPlaylist = function (id) {
    return new Promise(function (resolve, reject) {
        http.get("http://localhost:3000/playlist/detail?id=" + id, function (res) {
            var resData = "";
            res.on("data", function (data) {
                resData += data;
            });
            res.on("end", function () {
                resolve(JSON.parse(resData));
            });
        });
    });
}

var getSongUrl = function (songid) {
    return new Promise(function (resolve, reject) {
        http.get("http://localhost:3000/music/url?id=" + songid, function (res) {
            var resData = "";
            res.on("data", function (data) {
                resData += data;
            });
            res.on("end", function () {
                resolve(JSON.parse(resData).data[0].url);
            });
        });
    });
}

var start = async function () {
    //防止高频ip访问禁止
    let cookie = main_cookie == null ? await loginNetease() : JSON.parse(main_cookie);
    let personalFM = await getPersonalFM(cookie);
    console.log(JSON.stringify(personalFM));


    //Play songlists
    /*
    let playlist = await getPlaylist("766560163");

    for (var k in playlist.privileges) {
        let url = await getSongUrl(playlist.privileges[k].id);
        //await downloadFile(url, "public/" + playlist.privileges[k].id + ".mp3");
        //await play("public/" + playlist.privileges[k].id + ".mp3");
        if (url != null)
            await play(url);
    }
    */

    //Play local files
    /*
    for (var j = -1; j <= 4; j++) {
        await play("public/" + j + ".mp3");
        await sleep(1000);
    }
    */
}

var parseDanmaku = function (str) {
    //
}

/*
bililive.initRoom({
    roomId: 28525
}).then(room => {
    room.on('comment', (msg) => {
        if (msg.user.isAdmin) {
            parseDanmaku(msg.comment);
        }
    })
})
*/

start();