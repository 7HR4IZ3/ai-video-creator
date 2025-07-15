import { createHash, randomBytes, randomUUID } from "crypto";
import axios from "axios";
import Redis from "ioredis";
import type {
  OAuthProvider,
  OAuthTokens,
  AuthRequest,
  AuthResponse,
} from "./types.js";
import { createProviders } from "./providers.js";

const code_verifier = randomBytes(16).toString("utf-8");

export class AuthManager {
  private providers: Record<AuthRequest["platform"], OAuthProvider>;
  private pendingSessions = new Map<string, AuthRequest>();
  private redis: Redis;

  constructor() {
    this.providers = createProviders();
    this.redis = new Redis(
      Number.parseInt(process.env.REDIS_PORT || "6379"),
      process.env.REDIS_HOST || "localhost",
      {
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
      },
    );
  }

  generateAuthUrl(platform: AuthRequest["platform"]): {
    authUrl: string;
    sessionId: string;
  } {
    const provider = this.providers[platform];
    if (!provider) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const sessionId = randomUUID();
    const state = `${platform}:${sessionId}`;

    const searchParams: any = {
      state,
      response_type: "code",
      scope: provider.scopes.join(provider.name === "tiktok" ? "," : " "),
      redirect_uri: provider.redirectUri,
      access_type: platform === "youtube" ? "offline" : "",
      prompt: platform === "youtube" ? "consent" : "",
    };

    if (provider.name === "tiktok") {
      const hash = createHash("sha256");

      searchParams["client_key"] = provider.clientKey;
      searchParams["code_challenge_method"] = "S256";
      searchParams["code_challenge"] = hash.update(code_verifier).digest("hex");
    } else {
      searchParams["client_id"] = provider.clientId;
    }

    const params = new URLSearchParams(searchParams);

    // Remove undefined values
    Object.keys(params).forEach((key) => {
      if (params.get(key) === "undefined") {
        params.delete(key);
      }
    });

    const authUrl = `${provider.authUrl}?${params.toString()}`;

    // Store pending session
    this.pendingSessions.set(sessionId, {
      platform,
      sessionId,
    });

    return { authUrl, sessionId };
  }

  async handleCallback(
    platform: AuthRequest["platform"],
    code: string,
    state: string,
  ): Promise<OAuthTokens> {
    const provider = this.providers[platform];
    if (!provider) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const [platformFromState, sessionId] = state.split(":");
    if (platformFromState !== platform) {
      throw new Error("Invalid state parameter");
    }

    const tokenData = await this.exchangeCodeForTokens(provider, code);

    // For Facebook, also get page access tokens
    if (platform === "facebook" && tokenData.access_token) {
      try {
        const pageAccessToken = await this.getFacebookPageAccessToken(
          tokenData.access_token,
        );
        tokenData.page_access_token = pageAccessToken;
      } catch (error) {
        console.warn("Failed to get Facebook page access token:", error);
        // Continue without page token - user might not have page access
      }
    }

    // Store tokens in Redis
    await this.storeTokens(platform, tokenData);

    // Clean up pending session
    this.pendingSessions.delete(sessionId);

    return tokenData;
  }

  private async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
  ): Promise<OAuthTokens> {
    const data: Record<string, string> = {
      client_secret: provider.clientSecret,
      code,
      redirect_uri: provider.redirectUri,
    };

    // Platform-specific parameters
    if (provider.name === "youtube" || provider.name === "facebook" || provider.name === "snapchat") {
      data.client_id = provider.clientId;
      data.grant_type = "authorization_code";
    } else if (provider.name === "tiktok") {
      data.client_key = provider.clientKey;
      data.grant_type = "authorization_code";
    }

    try {
      const response = await axios.post(
        provider.tokenUrl,
        new URLSearchParams(data),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        },
      );

      const tokens: OAuthTokens = response.data;

      // Standardize token format
      if (tokens.expires_in) {
        tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
      }

      return tokens;
    } catch (error: any) {
      console.error(
        `Token exchange failed for ${provider.name}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to exchange code for tokens: ${
          error.response?.data?.error_description || error.message
        }`,
      );
    }
  }

  private async getFacebookPageAccessToken(
    userAccessToken: string,
  ): Promise<string> {
    try {
      // Get user's pages
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts`,
        {
          params: {
            access_token: userAccessToken,
            fields: "access_token,name,id",
          },
        },
      );

      const pages = pagesResponse.data.data;
      if (!pages || pages.length === 0) {
        throw new Error("No Facebook pages found for user");
      }

      // Use the first page's access token or find specific page if PAGE_ID is set
      const pageId = process.env.FACEBOOK_PAGE_ID;
      if (pageId) {
        const targetPage = pages.find((page: any) => page.id === pageId);
        if (!targetPage) {
          throw new Error(`Page with ID ${pageId} not found in user's pages`);
        }
        return targetPage.access_token;
      }

      // Use first page if no specific page ID is configured
      return pages[0].access_token;
    } catch (error: any) {
      console.error(
        "Error fetching Facebook page access token:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  private async storeTokens(
    platform: AuthRequest["platform"],
    tokens: OAuthTokens,
  ): Promise<void> {
    console.log("Storing tokens for platform:", platform, tokens);
    const keyPrefix = `${platform}:`;

    if (tokens.access_token) {
      await this.redis.set(`${keyPrefix}access_token`, tokens.access_token);

      if (tokens.expiry_date) {
        await this.redis.set(
          `${keyPrefix}expiry_date`,
          tokens.expiry_date.toString(),
        );

        // Set expiration on the access token key
        const expiresInSeconds =
          Math.floor((tokens.expiry_date - Date.now()) / 1000) - 60;
        if (expiresInSeconds > 0) {
          await this.redis.expire(`${keyPrefix}access_token`, expiresInSeconds);
        }
      }
    }

    if (tokens.refresh_token) {
      await this.redis.set(`${keyPrefix}refresh_token`, tokens.refresh_token);
    }

    if (tokens.token_type) {
      await this.redis.set(`${keyPrefix}token_type`, tokens.token_type);
    }

    if (tokens.scope) {
      await this.redis.set(`${keyPrefix}scope`, tokens.scope);
    }

    if (tokens.page_access_token) {
      await this.redis.set(
        `${keyPrefix}page_access_token`,
        tokens.page_access_token,
      );
    }
  }

  async getStoredTokens(platform: AuthRequest["platform"]): Promise<OAuthTokens | null> {
    const keyPrefix = `${platform}:`;

    const [
      access_token,
      refresh_token,
      expiry_date,
      token_type,
      scope,
      page_access_token,
    ] = await Promise.all([
      this.redis.get(`${keyPrefix}access_token`),
      this.redis.get(`${keyPrefix}refresh_token`),
      this.redis.get(`${keyPrefix}expiry_date`),
      this.redis.get(`${keyPrefix}token_type`),
      this.redis.get(`${keyPrefix}scope`),
      this.redis.get(`${keyPrefix}page_access_token`),
    ]);

    console.log({
      access_token,
      refresh_token: refresh_token || undefined,
      expiry_date: expiry_date ? parseInt(expiry_date) : undefined,
      token_type: token_type || "Bearer",
      scope: scope || undefined,
      page_access_token: page_access_token || undefined,
    });

    if (!access_token && !refresh_token) {
      return null;
    }

    return {
      access_token: access_token || "",
      refresh_token: refresh_token || undefined,
      expiry_date: expiry_date ? parseInt(expiry_date) : undefined,
      token_type: token_type || "Bearer",
      scope: scope || undefined,
      page_access_token: page_access_token || undefined,
    };
  }

  getPendingSession(sessionId: string): AuthRequest | undefined {
    return this.pendingSessions.get(sessionId);
  }

  async refreshTokens(platform: AuthRequest["platform"]): Promise<OAuthTokens | null> {
    const provider = this.providers[platform];
    const storedTokens = await this.getStoredTokens(platform);

    if (!provider || !storedTokens?.refresh_token) {
      return null;
    }

    try {
      const searchParams: any = {
        client_secret: provider.clientSecret,
        refresh_token: storedTokens.refresh_token,
        grant_type: "refresh_token",
      };

      if (provider.name === "tiktok") {
        searchParams["client_key"] = provider.clientKey;
      } else {
        searchParams["client_id"] = provider.clientId;
      }

      const data = new URLSearchParams(searchParams);

      const response = await axios.post(provider.tokenUrl, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });

      const tokens: OAuthTokens = response.data;

      // Keep the existing refresh token if not provided
      if (!tokens.refresh_token) {
        tokens.refresh_token = storedTokens.refresh_token;
      }

      // Standardize token format
      if (tokens.expires_in) {
        tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
      }

      await this.storeTokens(platform, tokens);
      return tokens;
    } catch (error: any) {
      console.error(
        `Token refresh failed for ${platform}:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }
}
