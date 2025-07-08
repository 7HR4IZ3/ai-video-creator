# OAuth Proxy Server

This server handles OAuth authentication for YouTube, Facebook, and TikTok video uploads. It provides a WebSocket-based communication system that allows the CLI to authenticate users seamlessly.

## Features

- OAuth 2.0 flows for YouTube, Facebook, and TikTok
- WebSocket communication with CLI
- Token storage and refresh handling
- Automatic browser opening for authorization
- Token caching in Redis

## Setup

1. **Install dependencies:**
   ```bash
   cd oauth-server
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your OAuth credentials
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## OAuth App Setup

### YouTube (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3001/oauth2callback/youtube`
7. Copy Client ID and Client Secret to your `.env` file

**Required scopes:**
- `https://www.googleapis.com/auth/youtube`
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.force-ssl`

### Facebook

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Set up OAuth redirect URI: `http://localhost:3001/oauth2callback/facebook`
5. Get a Page Access Token with required permissions
6. Copy App ID, App Secret, and Page ID to your `.env` file

**Required permissions:**
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`
- `publish_video`

### TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Enable "Login Kit" and "Content Posting API"
4. Set redirect URI: `http://localhost:3001/oauth2callback/tiktok`
5. Copy Client Key and Client Secret to your `.env` file

**Required scopes:**
- `video.upload`
- `video.publish`

## API Endpoints

### POST /auth/start
Start OAuth flow for a platform.

**Request:**
```json
{
  "platform": "youtube" | "facebook" | "tiktok"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://...",
  "sessionId": "uuid",
  "platform": "youtube"
}
```

### GET /oauth2callback/:platform
OAuth callback endpoint (automatically handled by providers).

### GET /tokens/:platform
Get stored tokens for a platform.

### POST /tokens/:platform/refresh
Refresh tokens for a platform.

### WebSocket /ws
Real-time communication for OAuth flow completion.

**Message Types:**
- `auth_request` - Map session to connection
- `auth_complete` - OAuth flow completed successfully
- `auth_error` - OAuth flow failed
- `ping`/`pong` - Keep-alive messages

## Usage

The OAuth server is designed to work seamlessly with the main video creator CLI. When you run upload commands, the system will:

1. Check for existing valid tokens
2. Attempt to refresh expired tokens
3. Start new OAuth flow if needed
4. Open browser for user authorization
5. Receive callback and store tokens
6. Continue with upload automatically

## Development

Start in development mode with auto-reload:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OAUTH_SERVER_PORT` | Server port (default: 3001) | No |
| `OAUTH_SERVER_HOST` | Server host (default: localhost) | No |
| `OAUTH_BASE_URL` | Base URL for redirects | No |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `REDIS_USERNAME` | Redis username | No |
| `REDIS_PASSWORD` | Redis password | No |
| `YOUTUBE_CLIENT_ID` | YouTube OAuth client ID | For YouTube |
| `YOUTUBE_CLIENT_SECRET` | YouTube OAuth client secret | For YouTube |
| `FACEBOOK_APP_ID` | Facebook app ID | For Facebook |
| `FACEBOOK_APP_SECRET` | Facebook app secret | For Facebook |
| `FACEBOOK_PAGE_ID` | Facebook page ID | For Facebook |
| `TIKTOK_CLIENT_KEY` | TikTok client key | For TikTok |
| `TIKTOK_CLIENT_SECRET` | TikTok client secret | For TikTok |
