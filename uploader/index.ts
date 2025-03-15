import fs from "fs";
import { google } from "googleapis";

export async function uploadToYoutube(
  filePath: string,
  title: string,
  description: string,
  privacy: string = "private"
) {
  // OAuth2 configuration
  const oauth2Client = new google.auth.OAuth2(
    "YOUR_CLIENT_ID",
    "YOUR_CLIENT_SECRET",
    "YOUR_REDIRECT_URI"
  );

  // Set credentials (you need to handle token management)
  oauth2Client.setCredentials({
    access_token: "YOUR_ACCESS_TOKEN",
    refresh_token: "YOUR_REFRESH_TOKEN",
  });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const fileSize = fs.statSync(filePath).size;

    const response = await youtube.videos.insert({
      part: ["snippet,status"],
      requestBody: {
        snippet: {
          title: title,
          description: description,
        },
        status: {
          privacyStatus: privacy, // 'private', 'public', or 'unlisted'
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    return {
      success: true,
      videoId: response.data.id,
      videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
