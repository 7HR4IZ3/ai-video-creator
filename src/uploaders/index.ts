import { uploadToYoutube } from "./youtube";
import { uploadToFacebook } from "./facebook";
import { uploadToTikTok } from "./tiktok";
import { saveToFilesystem } from "./filesystem";
import type { StreamSrc } from "../types";

export type UploadPlatform = "youtube" | "facebook" | "tiktok" | "filesystem";

export interface UploadResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export async function uploadVideo(
  platform: UploadPlatform,
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "private",
  options: Record<string, any> = {}
): Promise<UploadResult> {
  switch (platform) {
    case "youtube":
      return uploadToYoutube(output, title, description, privacy);
    case "facebook":
      return uploadToFacebook(output, title, description, privacy, options);
    case "tiktok":
      return uploadToTikTok(output, title, description, privacy, options);
    case "filesystem":
      return saveToFilesystem(output, title, description, options);
    default:
      return {
        success: false,
        error: `Unsupported platform: ${platform}`,
      };
  }
}
