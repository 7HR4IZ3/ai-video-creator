import path from "node:path";

export const CWD = process.cwd();
export const TEMP_DIR = path.join(CWD, "temp");
export const VIDEO_DIR = path.join(CWD, "media/videos");
export const AUDIO_DIR = path.join(CWD, "media/audios");
export const OUTPUT_DIR = path.join(CWD, "media/outputs");
export const SCREENSHOT_DIR = path.join(CWD, "media/screenshots");
