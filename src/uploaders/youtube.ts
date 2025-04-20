import fs from "fs";
import Redis from "ioredis";
import { google } from "googleapis";
import GoogleAuth from "google-auth-library";
import path from "path";
import type { StreamSrc } from "../types";

export async function uploadToYoutube(
  output: StreamSrc,
  title: string,
  description: string,
  privacy: string = "public"
) {

  // OAuth2 configuration
  const oauth = new google.auth.OAuth2();
  oauth.forceRefreshOnFailure = true;

  const redis = new Redis(
    Number.parseInt(process.env.REDIS_PORT!),
    process.env.REDIS_HOST!,
    {
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    }
  ); // Connects to 127.0.0.1:6379 by default

  // Define Redis keys
  const accessTokenKey = "youtube:access_token";
  const refreshTokenKey = "youtube:refresh_token";
  const tokenExpiryKey = "youtube:refresh_token";

  // Fetch initial tokens from Redis
  const initialAccessToken = await redis.get(accessTokenKey);
  const initialRefreshToken = await redis.get(refreshTokenKey);
  const initialExpiryDate = await redis.get(tokenExpiryKey);

  console.log("[youtube]", "Fetched initial tokens from Redis:", {
    hasAccessToken: !!initialAccessToken,
    hasRefreshToken: !!initialRefreshToken,
  });

  const usingRedisAccessToken = !!initialAccessToken;
  const usingRedisRefreshToken = !!initialRefreshToken;

  // Set credentials, prioritizing Redis tokens over environment variables
  const credentials = {
    scope: process.env.YT_SCOPE, token_type: "Bearer",
    access_token: initialAccessToken ?? process.env.YT_ACCESS_TOKEN,
    refresh_token: initialRefreshToken ?? process.env.YT_REFRESH_TOKEN,
    expiry_date: Number.parseInt(initialExpiryDate ?? process.env.YT_EXPIRY_DATE!),
  };

  console.log("[youtube]", `Using ${usingRedisAccessToken ? "Redis" : "ENV"} access token.`);
  console.log("[youtube]", 
    `Using ${usingRedisRefreshToken ? "Redis" : "ENV"} refresh token.`
  );

  if (!credentials.access_token || !credentials.refresh_token) {
    console.error(
      "Error: Missing access token or refresh token. Cannot proceed with YouTube upload."
    );
    return {
      success: false,
      error: "Missing YouTube API credentials.",
    };
  }

  console.log(credentials, { access: initialAccessToken, refresh: initialRefreshToken });

  oauth.setCredentials(credentials);

  const cacheTokens = async (tokens: any) => {
    if (tokens.access_token) {
      console.log("[youtube]", "Storing new access token...");
      await redis.set(accessTokenKey, tokens.access_token);
      // Optionally set an expiry close to the token's actual expiry time
      if (tokens.expiry_date) {
        await redis.set(tokenExpiryKey, tokens.expiry_date);

        const expiresInSeconds =
          Math.floor((tokens.expiry_date - Date.now()) / 1000) - 60; // Store for 1 min less than actual expiry
        if (expiresInSeconds > 0) {
          await redis.expire(accessTokenKey, expiresInSeconds);
        }
      }
    }
    if (tokens.refresh_token) {
      console.log("[youtube]", "Storing new refresh token...");
      await redis.set(refreshTokenKey, tokens.refresh_token);
    }
  }

  // Setup token refresh listener
  oauth.on("tokens", async (tokens) => {
   console.log("[youtube]", "Tokens updated:", tokens);
   await cacheTokens(tokens);
  });

  const youtube = google.youtube({
    version: "v3",
  });

  const { credentials: refreshedCredentials } = await oauth["refreshAccessTokenAsync"]();
  await cacheTokens(refreshedCredentials || {});

  try {
    console.log("[youtube]", `Attempting to upload video: ${title} from path: ${output.src}`);
    const fileSize = fs.statSync(output.src).size;
    console.log("[youtube]", `File size: ${fileSize} bytes`);

    const response = await youtube.videos.insert({
      auth: oauth,
      part: ["snippet", "status"], // Corrected: array of strings
      requestBody: {
        snippet: { title, description },
        status: {
          privacyStatus: privacy, // 'private', 'public', or 'unlisted'
        },
      },
      media: {
        body: fs.createReadStream(output.src),
      },
    });

    console.log("[youtube]", `Successfully uploaded video! Video ID: ${response.data.id}`);
    return {
      success: true,
      videoId: response.data.id,
      videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
    };
  } catch (error: any) {
    console.error("Error uploading video to YouTube:", error);
    // Attempt to log more specific Google API error details if available
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Unknown error during upload";
    return {
      success: false,
      error: errorMessage,
      details: error.response?.data?.error, // Include full error details if possible
    };
  }
}
