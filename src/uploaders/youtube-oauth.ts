import fs from "fs";
import { google } from "googleapis";
import type { StreamSrc } from "../types";
import { OAuthClient } from "../oauth-client";

export async function uploadToYoutubeOAuth(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "public",
  retrying: boolean = false
) {
  const oauthClient = new OAuthClient();

  try {
    // Ensure OAuth server is running
    await oauthClient.ensureServerRunning();

    // Get OAuth tokens
    console.log("[YouTube] Getting OAuth tokens...");
    const tokens = await oauthClient.authenticate("youtube");

    // Create OAuth2 client
    const oauth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI ||
        "http://localhost:3001/oauth2callback/youtube"
    );

    oauth.setCredentials(tokens);

    // Set up token refresh listener
    oauth.on("tokens", async (refreshedTokens) => {
      console.log("[YouTube] Tokens refreshed automatically");
      // The OAuth server handles token storage
    });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth,
    });

    console.log(
      "[YouTube] Attempting to upload video:",
      title,
      "from path:",
      output.src
    );

    const fileSize = fs.statSync(output.src).size;
    console.log("[YouTube] File size:", fileSize, "bytes");

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description,
          channelId: process.env.YOUTUBE_CHANNEL_ID,
        },
        status: {
          privacyStatus: privacy as any,
        },
      },
      media: {
        body: fs.createReadStream(output.src),
      },
    });

    console.log(
      "[YouTube] ✅ Successfully uploaded video! Video ID:",
      response.data.id
    );

    return {
      success: true,
      videoId: response.data.id,
      videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
    };
  } catch (error: any) {
    console.error("[YouTube] ❌ Error uploading video:", error);

    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Unknown error during upload";

    // Try token refresh on auth errors
    if (error.response?.status === 401 && !retrying) {
      console.log("[YouTube] 🔄 Refreshing tokens and retrying...");
      try {
        await oauthClient.refreshTokens("youtube");
        return await uploadToYoutubeOAuth(
          output,
          title,
          description,
          privacy,
          true
        );
      } catch (refreshError) {
        console.error("[YouTube] Failed to refresh tokens:", refreshError);
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data?.error,
    };
  }
}
