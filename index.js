const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

const command = ffmpeg()
  .input("./public/index.jpg")
  .format("mp4")

  .loop(5)

  .size("1920x1080")
  .aspect("16:9")
  .autopad(true, "blue")
  .on("start", function(commandLine) {
    console.log("Spawned Ffmpeg with command: " + commandLine);
  })
  .on("error", function(err) {
    console.log("An error occurred: " + err.message);
  })
  .on("end", function() {
    console.log("Processing finished !");
  })
  .saveToFile("./public/index.mp4");
