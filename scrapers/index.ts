import { readAsReadable } from "../utils";
import { VIDEO_DIR } from "../constants";

export async function grabGameplayVideo() {
  return readAsReadable({ directoryPath: VIDEO_DIR });
}
