# Video Creator OAuth Setup Guide

This guide will help you set up the OAuth-based authentication system for uploading videos to YouTube, Facebook, and TikTok.

## Overview

The system now uses a separate OAuth proxy server that handles authentication flows. When you run upload commands, the CLI will:

1. ✅ Check for existing valid tokens
2. 🔄 Attempt to refresh expired tokens automatically  
3. 🌐 Start OAuth flow if needed (opens browser)
4. ⚡ Continue upload automatically after authorization

## Quick Setup

1. **Run the setup script:**
   ```bash
   ./setup-oauth.sh
   ```

2. **Configure OAuth credentials** (see detailed steps below)

3. **Start the system:**
   ```bash
   # Option 1: Start OAuth server separately
   npm run oauth-server
   
   # Option 2: Start everything together
   ./start-with-oauth.sh
   ```

4. **Test with an upload:**
   ```bash
   npm run generate -- --story mystory --platform youtube
   ```

## Detailed OAuth App Setup

### 🔴 YouTube (Google Cloud)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Add authorized redirect URI: `http://localhost:3001/oauth2callback/youtube`
7. Copy **Client ID** and **Client Secret**

**Add to `.env` and `oauth-server/.env`:**
```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_CHANNEL_ID=your_channel_id_here
```

### 🔵 Facebook

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add **Facebook Login** product
4. Set Valid OAuth Redirect URI: `http://localhost:3001/oauth2callback/facebook`
5. Add **Pages API** and get permissions for your page
6. Generate a **Page Access Token** with these permissions:
   - `pages_manage_posts`
   - `pages_read_engagement` 
   - `pages_show_list`
   - `publish_video`

**Add to `.env` and `oauth-server/.env`:**
```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ID=your_page_id_here
```

### ⚫ TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Add **Login Kit** and **Content Posting API** products
4. Set Redirect URI: `http://localhost:3001/oauth2callback/tiktok`
5. Copy **Client Key** and **Client Secret**

**Add to `.env` and `oauth-server/.env`:**
```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
```

## Configuration Files

### Main `.env` file:
```env
# OAuth System
USE_OAUTH=true
OAUTH_SERVER_URL=http://localhost:3001

# Redis (shared)
REDIS_HOST=localhost
REDIS_PORT=6379

# Platform Credentials (same as oauth-server/.env)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_CHANNEL_ID=...

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...  
FACEBOOK_PAGE_ID=...

TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

### `oauth-server/.env` file:
```env
# Server Config
OAUTH_SERVER_PORT=3001
OAUTH_SERVER_HOST=localhost
OAUTH_BASE_URL=http://localhost:3001

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OAuth Credentials (same as main .env)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_PAGE_ID=...

TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

## Usage Examples

### Generate and Upload Video
```bash
# Single platform
npm run generate -- --story mystory --platform youtube

# Multiple platforms
npm run generate -- --story mystory --platform youtube,facebook,tiktok
```

### Upload Existing Video
```bash
# Single video to multiple platforms
npm run upload -- --story mystory --platform youtube,facebook,tiktok

# All videos to YouTube
npm run upload -- --story all --platform youtube
```

### List Available Stories
```bash
npm run list
```

### Platform Configuration Help
```bash
npm run configure -- --platform youtube
npm run configure -- --platform facebook
npm run configure -- --platform tiktok
```

## OAuth Flow Example

When you run an upload command:

1. **CLI starts:** `npm run generate -- --platform youtube`
2. **Check tokens:** System checks for existing valid YouTube tokens
3. **OAuth needed:** If no valid tokens, CLI outputs:
   ```
   [OAuth] Please visit the following URL to authorize youtube:
   🔗 https://accounts.google.com/o/oauth2/v2/auth?client_id=...
   [OAuth] Connected to OAuth server, waiting for authorization...
   ```
4. **Browser opens:** URL opens automatically in your default browser
5. **You authorize:** Complete the authorization flow in browser
6. **Success page:** Browser shows success page and auto-closes
7. **CLI continues:** 
   ```
   [OAuth] ✅ Authorization successful for youtube!
   [YouTube] Getting OAuth tokens...
   [YouTube] Attempting to upload video: My Story
   [YouTube] ✅ Successfully uploaded video! Video ID: abc123
   ```

## Troubleshooting

### OAuth Server Won't Start
```bash
# Check if port 3001 is already in use
lsof -i :3001

# Start on different port
OAUTH_SERVER_PORT=3002 npm run oauth-server
```

### Redis Connection Issues
```bash
# Install and start Redis
brew install redis  # macOS
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### Browser Doesn't Open Automatically
The CLI will print the authorization URL. Copy and paste it into your browser manually.

### Token Refresh Issues
If refresh fails, the system will automatically start a new OAuth flow. Just authorize again in the browser.

### Development with Existing Tokens
Set `USE_OAUTH=false` in `.env` to use the old token system during development.

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run setup` | Run initial setup script |
| `npm run oauth-server` | Start OAuth server only |
| `./start-oauth-server.sh` | Start OAuth server (alternative) |
| `./start-with-oauth.sh` | Start OAuth server + show usage examples |
| `npm run generate` | Generate videos with upload |
| `npm run upload` | Upload existing videos |
| `npm run list` | List available stories |
| `npm run configure` | Show platform setup instructions |

## Security Notes

- OAuth tokens are stored securely in Redis
- Access tokens have automatic expiration handling
- Refresh tokens are used to maintain long-term access
- All OAuth flows use secure HTTPS endpoints
- Local OAuth server only accepts localhost connections

## Getting Help

1. Check the logs in both CLI and OAuth server terminals
2. Verify your OAuth app configurations match the redirect URIs
3. Ensure Redis is running and accessible
4. Try re-running the setup script: `./setup-oauth.sh`
5. Test individual platform configs: `npm run configure -- --platform youtube`
