import type { AuthRequest, OAuthProvider } from "./types.js";

export const createProviders = (): Record<AuthRequest["platform"], OAuthProvider> => {
  const baseUrl = process.env.OAUTH_BASE_URL || "http://localhost:8090";
  const tiktokURl = "https://9cec-102-89-68-207.ngrok-free.app"

  return {
    youtube: {
      name: "youtube",
      clientId: process.env.YOUTUBE_CLIENT_ID!,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirectUri: `${baseUrl}/oauth2callback/youtube`,
      scopes: [
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.force-ssl",
      ],
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
    },
    facebook: {
      name: "facebook",
      clientId: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      redirectUri: `${baseUrl}/oauth2callback/facebook`,
      scopes: [
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_show_list",
      ],
      authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    },
    tiktok: {
      name: "tiktok",
      clientKey: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      redirectUri: `${tiktokURl}/oauth2callback/tiktok`,
      scopes: ["video.upload", "video.publish"],
      authUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    },
    snapchat: {
      name: "snapchat",
      clientId: process.env.SNAPCHAT_CLIENT_ID!,
      clientSecret: process.env.SNAPCHAT_CLIENT_SECRET!,
      redirectUri: `${baseUrl}/oauth2callback/snapchat`,
      scopes: [
        "snapchat-marketing-api",
        "snapchat-profile-api",
      ],
      authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
      tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    },
  };
};
