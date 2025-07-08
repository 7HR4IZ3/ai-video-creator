import axios from "axios";
import fs from "fs";
import type { StreamSrc } from "../types";
import { OAuthClient } from "../oauth-client";
import { randomUUID } from "crypto";

async function uploadFacebookReel(
  output: StreamSrc,
  description: string,
  accessToken: string,
  pageAccessToken: string,
  pageId: string
) {
  console.log("[Facebook] Uploading reel...");

  // Step 1: Initialize the reel upload
  const initResponse = await axios.post(
    `https://graph.facebook.com/v23.0/${pageId}/video_reels`,
    {
      upload_phase: "start",
      access_token: pageAccessToken,
      file_size: fs.statSync(output.src).size,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const uploadUrl = initResponse.data.upload_url;
  const videoId = initResponse.data.video_id;
  console.log("[Facebook] Reel upload session created, video ID:", videoId);

  // Step 2: Upload the video file for reel
  const uploadResponse = await axios.post(
    `https://rupload.facebook.com/video-upload/v23.0/${videoId}`,
    fs.readFileSync(output.src),
    {
      headers: {
        // "Content-Type": "application/octet-stream",
        Authorization: `OAuth ${pageAccessToken}`,
        offset: "0",
        file_size: fs.statSync(output.src).size,
      },
    }
  );

  console.log("[Facebook] Reel file uploaded, status:", uploadResponse.data);

  // Step 3: Publish the reel
  const publishResponse = await axios.post(
    `https://graph.facebook.com/v23.0/${pageId}/video_reels`,
    {
      upload_phase: "finish",
      video_id: videoId,
      video_state: "PUBLISHED",
      description: description,
      access_token: pageAccessToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const contentId = publishResponse.data.id || videoId;
  console.log(`[Facebook] ✅ Successfully uploaded reel! ID:`, contentId);

  return {
    success: true,
    reelId: contentId,
    videoId: contentId, // Keep for backward compatibility
    videoUrl: `https://facebook.com/${contentId}`,
    contentType: "reel",
  };
}

export async function uploadToFacebookOAuth(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "SELF",
  options: Record<string, any> = {}
) {
  // Extract reel option from options
  const uploadAsReel = options.reel || options.isReel || true;
  const oauthClient = new OAuthClient();

  try {
    // Ensure OAuth server is running
    await oauthClient.ensureServerRunning();

    // Get OAuth tokens
    console.log("[Facebook] Getting OAuth tokens...");
    const tokens = await oauthClient.authenticate("facebook");

    const accessToken = tokens.access_token;
    const pageAccessToken = tokens.page_access_token;
    const appId = options.appId || process.env.FACEBOOK_APP_ID;
    const pageId = options.pageId || process.env.FACEBOOK_PAGE_ID;

    if (!appId || !pageId) {
      throw new Error("Facebook App ID and Page ID are required");
    }

    if (!pageAccessToken) {
      throw new Error(
        "Facebook page access token is required for posting to pages"
      );
    }

    // Validate reel requirements
    if (uploadAsReel) {
      const fileSize = fs.statSync(output.src).size;
      const maxReelSize = 1024 * 1024 * 1024; // 1GB limit for reels
      if (fileSize > maxReelSize) {
        throw new Error("Reel file size exceeds 1GB limit");
      }
    }

    const fileSize = fs.statSync(output.src).size;
    console.log(
      `[Facebook] Uploading ${uploadAsReel ? "reel" : "video"}:`,
      title,
      "Size:",
      fileSize,
      "bytes"
    );

    if (uploadAsReel) {
      return await uploadFacebookReel(
        output,
        description,
        accessToken,
        pageAccessToken,
        pageId
      );
    }

    // Step 1: Initialize the video upload (for non-reel)
    const id = randomUUID();
    const initResponse = await axios.post(
      `https://graph.facebook.com/v23.0/${appId}/uploads`,
      {
        access_token: accessToken,
        file_name: title,
        file_type: "video/mp4",
        file_length: fileSize,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const uploadSessionId = initResponse.data.id;
    console.log("[Facebook] Upload session created:", uploadSessionId);

    // Step 2: Upload the video file (for non-reel)
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v23.0/${uploadSessionId}`,
      fs.readFileSync(output.src),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `OAuth ${accessToken}`,
          "file-offset": "0",
        },
      }
    );

    const uploadFileHandle = uploadResponse.data.h;
    console.log("[Facebook] File uploaded, handle:", uploadFileHandle);

    // Step 3: Finalize the upload and publish (for non-reel)
    const endpoint = `https://graph-video.facebook.com/v23.0/${pageId}/videos`;
    const requestBody = {
      title,
      description,
      access_token: pageAccessToken,
      fbuploader_video_file_chunk: uploadFileHandle,
      privacy: { value: privacy },
    };

    const finalizeResponse = await axios.post(endpoint, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `OAuth ${pageAccessToken}`,
      },
    });

    const contentId = finalizeResponse.data.id;
    console.log(`[Facebook] ✅ Successfully uploaded video! ID:`, contentId);

    return {
      success: true,
      videoId: contentId,
      videoUrl: `https://facebook.com/${contentId}`,
      contentType: "video",
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Unknown error during upload";
    const contentType = uploadAsReel ? "reel" : "video";
    console.error(`[Facebook] ❌ ${contentType} upload error:`, errorMessage);

    // Try to refresh tokens on auth errors
    if (error.response?.status === 401) {
      console.log("[Facebook] 🔄 Token may be expired, refreshing...");
      try {
        await oauthClient.refreshTokens("facebook");
        console.log(
          "[Facebook] ⚠️ You may need to re-authorize Facebook access"
        );
      } catch (refreshError) {
        console.error("[Facebook] Failed to refresh tokens:", refreshError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data?.error,
    };
  }
}
