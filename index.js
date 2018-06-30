const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

const inputs = [1];
const output = fs.createWriteStream("./public/release.flv");

function proceed(i) {
  const command = ffmpeg(`./public/${inputs[i]}.mp3`)
    .input(`./public/${inputs[i]}.jpg`)
    .videoCodec("libx264")
    .audioCodec("libmp3lame")
    .audioBitrate(320)
    .size("1920x1080")
    .fps(30)
    .format("flv")
    .on("start", function(commandLine) {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("error", function(err) {
      console.log("An error occurred: " + err.message);
    })
    .on("end", function() {
      console.log("Processing finished !");

      if (i !== inputs.length - 1) proceed(i + 1);
      else {
        output.end();
        output.close();
      }
    })
    .on("progress", function(progress) {
      console.log("Processing: " + progress.percent + "% done");
    });

  const stream = command.pipe();
  stream.on("data", function(chunk) {
    output.write(chunk);
  });
}

proceed(0);
