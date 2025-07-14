export interface TiktokOAuthProvider {
  name: "tiktok";
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}
export interface OtherOAuthProvider {
  name: "youtube" | "facebook" | "snapchat";
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export type OAuthProvider = OtherOAuthProvider | TiktokOAuthProvider;

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
  page_access_token?: string; // For Facebook page access tokens
}

export interface AuthRequest {
  platform: "youtube" | "facebook" | "tiktok" | "snapchat";
  sessionId: string;
}

export interface AuthResponse {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
  authUrl?: string;
}

export interface WebSocketMessage {
  type: "auth_request" | "auth_complete" | "auth_error" | "ping" | "pong";
  platform?: "youtube" | "facebook" | "tiktok";
  sessionId?: string;
  tokens?: OAuthTokens;
  authUrl?: string;
  error?: string;
}
