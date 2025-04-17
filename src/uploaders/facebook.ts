import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import type { StreamSrc } from "../types";

export async function uploadToFacebook(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "SELF",
  options: Record<string, any> = {}
) {
  try {
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      throw new Error("Facebook access token not found in environment variables");
    }

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const pageId = options.pageId || process.env.FACEBOOK_PAGE_ID;

    // Step 1: Initialize the video upload
    const initResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/videos`,
      {
        access_token: accessToken,
        upload_phase: "start",
        file_size: fs.statSync(output.src).size,
      }
    );

    const uploadSessionId = initResponse.data.upload_session_id;

    // Step 2: Upload the video chunks
    const fileStream = output.stream;
    const formData = new FormData();
    formData.append("access_token", accessToken);
    formData.append("upload_phase", "transfer");
    formData.append("upload_session_id", uploadSessionId);
    formData.append("video_file_chunk", fileStream);

    await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/videos`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Step 3: Finalize the upload
    const finalizeResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/videos`,
      {
        access_token: accessToken,
        upload_phase: "finish",
        upload_session_id: uploadSessionId,
        title: title,
        description: description,
        privacy: { value: privacy },
      }
    );

    const videoId = finalizeResponse.data.id;
    return {
      success: true,
      videoUrl: `https://facebook.com/${videoId}`,
    };
  } catch (error) {
    console.error("Facebook upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
