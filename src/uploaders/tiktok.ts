import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function uploadToTikTok(
  filePath: string,
  title: string,
  description: string,
  privacy: string = "PUBLIC",
  options: Record<string, any> = {}
) {
  try {
    if (!process.env.TIKTOK_ACCESS_TOKEN) {
      throw new Error("TikTok access token not found in environment variables");
    }

    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    
    // Step 1: Initialize upload
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        source_info: {
          source: "PULL_FROM_URL",
        },
      },
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const uploadId = initResponse.data.data.upload_id;
    
    // Step 2: Upload video
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append("video", fileBuffer, { filename: "video.mp4" });
    
    await axios.post(
      `https://open.tiktokapis.com/v2/post/publish/video/upload/?upload_id=${uploadId}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );
    
    // Step 3: Publish video
    const publishResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/publish/",
      {
        upload_id: uploadId,
        title: title,
        description: description,
        privacy_level: privacy || "SELF_ONLY",
        disable_comment: options.disableComment ?? false,
        disable_duet: options.disableDuet ?? false,
        disable_stitch: options.disableStitch ?? false,
      },
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const videoId = publishResponse.data.data.video_id;
    return {
      success: true,
      videoUrl: `https://www.tiktok.com/@${publishResponse.data.data.video_id}`,
    };
  } catch (error) {
    console.error("TikTok upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
