const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

ffmpeg("./public/release.mp4")
  .addInputOption(["-re"])
  .audioCodec("libmp3lame")
  .audioBitrate(320)
  .on("start", function(commandLine) {
    console.log("Spawned Ffmpeg with command: " + commandLine);
  })
  .on("error", function(err) {
    console.log("An error occurred: " + err.message);
  })
  .on("end", function() {
    console.log("Processing finished !");
  })
  .on("progress", function(progress) {
    console.log("Processing: " + progress.percent + "% done");
  })
  .format("flv")
  .output(
    "rtmp://qn.live-send.acg.tv/live-qn/?streamname=live_5756570_9523584&key=4538034d78aa78c768f5d47fac9e2ec7",
    { end: true }
  )
  .run();
