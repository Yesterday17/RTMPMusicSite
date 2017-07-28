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
var main_cookie = [
    "MUSIC_U=ced7246c9b16c7788328d86b8fe5ae79c1ae184fff992d8efe699f9d8d4e0d7d2ec482ae31b90ad4cd67672ee0387699a8246a35c2da90bec3061cd18d77b7a0",
    "__utma=1.389579652.1496909591.1496909591.1496909591.1",
    "__csrf=6741eed22d326fa3c785abba0d16fa64",
    "__utmz=1.1496909591.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)",
    "__remember_me=true"];

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

        for(let k in main_cookie){
            j.setCookie(main_cookie[k], "http://localhost:3000/");
        }

        /*
        for (let k in cookie) {
            let ck = request.cookie(cookie[k].key + "=" + cookie[k].value);
            j.setCookie(ck, "http://localhost:3000/");
            //cookies.push(cookie[k].key + "=" + cookie[k].value);
        }
        */
        
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

    //私人FM读取
    //防止高频ip访问禁止
    let cookie = main_cookie,
        personalFM = await getPersonalFM(cookie);

    console.log(personalFM.code);
    if(personalFM.code == 405){
        cookie = await loginNetease();
        main_cookie = JSON.stringify(main_cookie);
        personalFM = await getPersonalFM(cookie);
    }
    for (var k in personalFM.data) {
        let url = await getSongUrl(personalFM.data[k].id);
        if (url != null)
            await play(url);
    }

    /*

    //歌单读取
    let playlist = await getPlaylist("766560163");
    for (var k in playlist.privileges) {
        let url = await getSongUrl(playlist.privileges[k].id);
        //await downloadFile(url, "public/" + playlist.privileges[k].id + ".mp3");
        //await play("public/" + playlist.privileges[k].id + ".mp3");
        if (url != null)
            await play(url);
    }

    //本地歌曲读取
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