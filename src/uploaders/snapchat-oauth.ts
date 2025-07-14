import axios from "axios";
import fs from "fs";
import type { StreamSrc } from "../types";
import { OAuthClient } from "../oauth-client";

export async function uploadToSnapchatOAuth(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "PUBLIC",
  options: Record<string, any> = {}
) {
  const oauthClient = new OAuthClient();

  try {
    // Ensure OAuth server is running
    await oauthClient.ensureServerRunning();

    // Get OAuth tokens
    console.log("[Snapchat] Getting OAuth tokens...");
    const tokens = await oauthClient.authenticate("snapchat");

    const accessToken = tokens.access_token;

    console.log("[Snapchat] Uploading video:", title);

    // Step 1: Get upload URL
    const initResponse = await axios.post(
      "https://adsapi.snapchat.com/v1/adaccounts/{ad_account_id}/videos",
      {
        name: title,
        file_size: fs.statSync(output.src).size,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const uploadUrl = initResponse.data.video.upload_url;
    const videoId = initResponse.data.video.id;
    console.log("[Snapchat] Upload URL obtained:", uploadUrl);

    // Step 2: Upload video file
    await axios.put(uploadUrl, fs.readFileSync(output.src), {
      headers: {
        "Content-Type": "video/mp4",
      },
    });

    console.log("[Snapchat] Video file uploaded successfully.");

    // Step 3: Process video (this might be an async process on Snapchat's side)
    // You might need to poll an endpoint to check the status of the video processing
    // For now, we'll assume it's immediately available or will be soon.

    console.log("[Snapchat] ✅ Successfully uploaded video! Video ID:", videoId);

    return {
      success: true,
      videoId,
      videoUrl: `https://www.snapchat.com/watch/${videoId}`, // Placeholder URL
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.error_description ||
      error.message ||
      "Unknown error during upload";
    console.error("[Snapchat] ❌ Upload error:", errorMessage);

    // Try to refresh tokens on auth errors
    if (error.response?.status === 401) {
      console.log("[Snapchat] 🔄 Token may be expired, refreshing...");
      try {
        await oauthClient.refreshTokens("snapchat");
        console.log("[Snapchat] ⚠️ You may need to re-authorize Snapchat access");
      } catch (refreshError) {
        console.error("[Snapchat] Failed to refresh tokens:", refreshError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data,
    };
  }
}