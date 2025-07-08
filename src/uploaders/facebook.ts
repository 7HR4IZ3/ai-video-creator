import axios from "axios";
import FormData from "form-data";
import fs, { readFileSync } from "fs";
import type { StreamSrc } from "../types";
import { randomUUID } from "crypto";

export async function uploadToFacebook(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "SELF",
  options: Record<string, any> = {}
) {
  try {
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      throw new Error(
        "Facebook access token not found in environment variables"
      );
    }

    const id = randomUUID();

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    const appId = options.appId || process.env.FACEBOOK_APP_ID;
    const pageId = options.pageId || process.env.FACEBOOK_PAGE_ID;

    // Step 1: Initialize the video upload
    const initResponse = await fetch(
      `https://graph.facebook.com/v22.0/${appId}/uploads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          file_name: id,
          file_type: "video/mp4",
          file_length: fs.statSync(output.src).size,
        }),
      }
    );

    if (!initResponse.ok) {
      throw new Error(
        `Failed to initialize video upload: ${initResponse.statusText}`
      );
    }

    const uploadSessionId = await initResponse
      .json()
      .then((data: any) => data.id);

    console.log(uploadSessionId);

    const uploadResponse = await fetch(
      `https://graph.facebook.com/v22.0/${uploadSessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `OAuth ${accessToken}`,
          "file-offset": "0",
        },
        body: readFileSync(output.src),
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
    }

    const uploadFileHandle = await uploadResponse
      .json()
      .then((data: any) => data.h);

    // Step 3: Finalize the upload
    const finalizeResponse = await fetch(
      `https://graph-video.facebook.com/v22.0/${pageId}/videos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `OAuth ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          description,
          access_token: accessToken,
          fbuploader_video_file_chunk: uploadFileHandle,
        }),
      }
    );

    const videoId = await finalizeResponse.json().then((data: any) => data.id);
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
