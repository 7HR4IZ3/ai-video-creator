import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import type { StreamSrc } from "../types";
import { OAuthClient } from "../oauth-client";

export async function uploadToTikTokOAuth(
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
    console.log("[TikTok] Getting OAuth tokens...");
    const tokens = await oauthClient.authenticate("tiktok");

    const accessToken = tokens.access_token;

    console.log("[TikTok] Uploading video:", title);

    // Step 1: Initialize upload
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fs.statSync(output.src).size,
          chunk_size: fs.statSync(output.src).size, // Upload as single chunk
          total_chunk_count: 1,
        },
        post_info: {
          title: title,
          description: description,
          disable_comment: options.disableComments || false,
          disable_duet: options.disableDuet || false,
          disable_stitch: options.disableStitch || false,
          // visibility: options.visibility || "public",
          // auto_add_music: options.autoAddMusic || false,
          privacy_level: "SELF_ONLY",
          video_cover_timestamp_ms: 1000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    const { publish_id, upload_url } = initResponse.data.data;
    console.log("[TikTok] Upload initialized, publish ID:", publish_id);

    // Step 2: Upload video file
    const fileBuffer = fs.readFileSync(output.src);
    const formData = new FormData();
    formData.append("video", fileBuffer, {
      filename: "video.mp4",
      contentType: "video/mp4",
    });

    await axios.put(upload_url, fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${fileBuffer.length - 1}/${
          fileBuffer.length
        }`,
      },
    });

    console.log("[TikTok] Video file uploaded successfully");

    // // Step 3: Publish video
    // const publishResponse = await axios.post(
    //   "https://open.tiktokapis.com/v2/post/publish/video/init/",
    //   {
    //     source_info: {
    //       source: "FILE_UPLOAD",
    //       upload_id: publish_id,
    //     },
    //     post_info: {
    //       title,
    //       description,
    //       disable_comment: options.disableComments || false,
    //       disable_duet: options.disableDuet || false,
    //       disable_stitch: options.disableStitch || false,
    //       visibility: options.visibility || "public",
    //       auto_add_music: options.autoAddMusic || false,
    //     },
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    // const publishData = publishResponse.data;
    // if (publishData.error.code !== "ok") {
    //   throw new Error(`Failed to publish video: ${publishData.error.message}`);
    // }

    const videoId = publish_id;
    console.log("[TikTok] ✅ Successfully uploaded video! Video ID:", videoId);

    return {
      success: true,
      videoId,
      videoUrl: `https://www.tiktok.com/@user/video/${videoId}`,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.error_description ||
      error.message ||
      "Unknown error during upload";
    console.error("[TikTok] ❌ Upload error:", errorMessage);

    // Try to refresh tokens on auth errors
    if (error.response?.status === 401) {
      console.log("[TikTok] 🔄 Token may be expired, refreshing...");
      try {
        await oauthClient.refreshTokens("tiktok");
        console.log("[TikTok] ⚠️ You may need to re-authorize TikTok access");
      } catch (refreshError) {
        console.error("[TikTok] Failed to refresh tokens:", refreshError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data,
    };
  }
}
