import { uploadToYoutube } from "./youtube";
import { uploadToYoutubeOAuth } from "./youtube-oauth";
import { uploadToFacebook } from "./facebook";
import { uploadToFacebookOAuth } from "./facebook-oauth";
import { uploadToTikTok } from "./tiktok";
import { uploadToTikTokOAuth } from "./tiktok-oauth";
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
  // Check if we should use OAuth-based uploaders (default)
  const useOAuth = process.env.USE_OAUTH !== "false";

  switch (platform) {
    case "youtube":
      return useOAuth
        ? uploadToYoutubeOAuth(output, title, description, privacy)
        : uploadToYoutube(output, title, description, privacy);
    case "facebook":
      return useOAuth
        ? uploadToFacebookOAuth(output, title, description, privacy, options)
        : uploadToFacebook(output, title, description, privacy, options);
    case "tiktok":
      return useOAuth
        ? uploadToTikTokOAuth(output, title, description, privacy, options)
        : uploadToTikTok(output, title, description, privacy, options);
    case "filesystem":
      return saveToFilesystem(output, title, description, options);
    default:
      return {
        success: false,
        error: `Unsupported platform: ${platform}`,
      };
  }
}
