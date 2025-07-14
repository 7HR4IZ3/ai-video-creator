import WebSocket from "ws";
import axios from "axios";
import { spawn } from "child_process";
import { platform } from "os";

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
  page_access_token?: string; // For Facebook page access tokens
}

export interface WebSocketMessage {
  type: "auth_request" | "auth_complete" | "auth_error" | "ping" | "pong";
  platform?: "youtube" | "facebook" | "tiktok" | "snapchat";
  sessionId?: string;
  tokens?: OAuthTokens;
  authUrl?: string;
  error?: string;
}

export class OAuthClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws?: WebSocket;

  constructor() {
    this.baseUrl = process.env.OAUTH_SERVER_URL || "http://localhost:8090";
    this.wsUrl = this.baseUrl.replace("http", "ws") + "/ws";
  }

  async authenticate(
    platform: "youtube" | "facebook" | "tiktok" | "snapchat",
  ): Promise<OAuthTokens> {
    // First check if we already have valid tokens
    const existingTokens = await this.getStoredTokens(platform);
    if (existingTokens && this.areTokensValid(existingTokens)) {
      console.log(`[OAuth] Using existing valid tokens for ${platform}`);
      return existingTokens;
    }

    // Try to refresh if we have a refresh token
    if (existingTokens?.refresh_token) {
      console.log(`[OAuth] Attempting to refresh tokens for ${platform}`);
      const refreshedTokens = await this.refreshTokens(platform);
      if (refreshedTokens) {
        return refreshedTokens;
      }
    }

    // Start new OAuth flow
    console.log(`[OAuth] Starting new OAuth flow for ${platform}`);
    return this.startOAuthFlow(platform);
  }

  private async startOAuthFlow(
    platform: "youtube" | "facebook" | "tiktok",
  ): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      // Start auth flow
      this.startAuth(platform)
        .then(({ authUrl, sessionId }) => {
          console.log(
            `[OAuth] Please visit the following URL to authorize ${platform}:`,
          );
          console.log(`🔗 ${authUrl}`);

          // Connect to WebSocket to wait for callback
          this.connectWebSocket(sessionId, resolve, reject);

          // Open URL in browser
          this.openUrl(authUrl);
        })
        .catch(reject);
    });
  }

  private async startAuth(
    platform: "youtube" | "facebook" | "tiktok" | "snapchat",
  ): Promise<{ authUrl: string; sessionId: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/start`, {
        platform,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to start auth: ${error.response?.data?.error || error.message}`,
      );
    }
  }

  private connectWebSocket(
    sessionId: string,
    resolve: (tokens: OAuthTokens) => void,
    reject: (error: Error) => void,
  ) {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on("open", () => {
      console.log(
        "[OAuth] Connected to OAuth server, waiting for authorization...",
      );

      // Send session mapping
      this.ws!.send(
        JSON.stringify({
          type: "auth_request",
          sessionId,
        }),
      );
    });

    this.ws.on("message", (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "ping":
            this.ws!.send(JSON.stringify({ type: "pong" }));
            break;

          case "auth_complete":
            if (message.tokens) {
              console.log(
                `[OAuth] ✅ Authorization successful for ${message.platform}!`,
              );
              this.ws!.close();
              resolve(message.tokens);
            }
            break;

          case "auth_error":
            console.error(`[OAuth] ❌ Authorization failed: ${message.error}`);
            this.ws!.close();
            reject(new Error(message.error || "Unknown auth error"));
            break;
        }
      } catch (error) {
        console.error("[OAuth] Invalid WebSocket message:", error);
      }
    });

    this.ws.on("error", (error) => {
      console.error("[OAuth] WebSocket error:", error);
      reject(error);
    });

    this.ws.on("close", () => {
      console.log("[OAuth] WebSocket connection closed");
    });

    // Timeout after 5 minutes
    setTimeout(
      () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
          reject(new Error("OAuth flow timed out after 5 minutes"));
        }
      },
      5 * 60 * 1000,
    );
  }

  private openUrl(url: string) {
    const currentPlatform = platform();
    let command: string;
    let args: string[];

    if (currentPlatform === "darwin") {
      command = "open";
      args = [url];
    } else if (currentPlatform === "win32") {
      command = "cmd";
      args = ["/c", "start", url];
    } else {
      command = "xdg-open";
      args = [url];
    }

    try {
      spawn(command, args, { detached: true, stdio: "ignore" });
    } catch (error) {
      console.warn(
        "[OAuth] Could not automatically open browser. Please manually visit the URL above.",
      );
    }
  }

  async getStoredTokens(platform: string): Promise<OAuthTokens | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/tokens/${platform}`);
      return response.data.tokens;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to get stored tokens: ${
          error.response?.data?.error || error.message
        }`,
      );
    }
  }

  async refreshTokens(platform: string): Promise<OAuthTokens | null> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tokens/${platform}/refresh`,
        {},
      );
      console.log(`[OAuth] ✅ Tokens refreshed successfully for ${platform}`);
      return response.data.tokens;
    } catch (error: any) {
      console.warn(
        `[OAuth] Failed to refresh tokens for ${platform}: ${
          error.response?.data?.error || error.message
        }`,
      );
      return null;
    }
  }

  private areTokensValid(tokens: OAuthTokens): boolean {
    if (!tokens.access_token) {
      return false;
    }

    if (tokens.expiry_date) {
      // Check if token expires in less than 5 minutes
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      return tokens.expiry_date > fiveMinutesFromNow;
    }

    // If no expiry date, assume it's valid
    return true;
  }

  // Helper method to check if OAuth server is running
  async isServerRunning(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }

  // Start the OAuth server if it's not running
  async ensureServerRunning(): Promise<void> {
    if (await this.isServerRunning()) {
      return;
    }

    console.log("[OAuth] Starting OAuth server...");

    // Start the server in the background
    const serverProcess = spawn("npm", ["run", "dev"], {
      cwd: "./oauth-server",
      detached: true,
      stdio: "ignore",
    });

    serverProcess.unref();

    // Wait for server to be ready
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (await this.isServerRunning()) {
        console.log("[OAuth] ✅ OAuth server is ready");
        return;
      }
      attempts++;
    }

    throw new Error("OAuth server failed to start after 30 seconds");
  }
}
