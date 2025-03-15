// Replace these with your actual file paths
const videoFile =
  "/Users/thraize/Documents/Programming/video-creator/media/videos/y2mate.com - 14 Minutes Minecraft Parkour Gameplay Free to Use Download_1080pFHR.mp4";
const audioFile =
  "/Users/thraize/Documents/Programming/video-creator/media/audios/t3_1bg53kq.mp3";
const outputFile =
  "/Users/thraize/Documents/Programming/video-creator/media/outputs/test.mp4";

import ffmpeg from "fluent-ffmpeg";

const command = ffmpeg()
    .input(audioFile)
    .input(videoFile)
    .withOptions("-c:v", "copy", "-shortest", "-map", "0:a:0", "-map", "1:v:0")
    .output(outputFile);

command.run();