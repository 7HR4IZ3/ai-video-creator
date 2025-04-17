import { uploadToYoutube } from "./youtube";
import { uploadToFacebook } from "./facebook";
import { uploadToTikTok } from "./tiktok";
import { saveToFilesystem } from "./filesystem";

export type UploadPlatform = "youtube" | "facebook" | "tiktok" | "filesystem";

export interface UploadResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export async function uploadVideo(
  platform: UploadPlatform,
  filePath: string,
  title: string,
  description: string,
  privacy: string = "private",
  options: Record<string, any> = {}
): Promise<UploadResult> {
  switch (platform) {
    case "youtube":
      return uploadToYoutube(filePath, title, description, privacy);
    case "facebook":
      return uploadToFacebook(filePath, title, description, privacy, options);
    case "tiktok":
      return uploadToTikTok(filePath, title, description, privacy, options);
    case "filesystem":
      return saveToFilesystem(filePath, title, description, options);
    default:
      return {
        success: false,
        error: `Unsupported platform: ${platform}`,
      };
  }
}
