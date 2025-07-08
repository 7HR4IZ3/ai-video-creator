# Video Creator Web Interface - Complete Setup Guide

## Overview

This guide will help you set up and use the SvelteKit web interface for the Video Creator tool. The web interface provides an intuitive way to generate videos from Reddit stories, manage uploads, and configure platform settings.

## 🚀 Quick Start

### Prerequisites

1. **Bun runtime** - Install from [bun.sh](https://bun.sh)
2. **Working video creator** - Ensure the main CLI tool works
3. **Platform API credentials** - For uploading to social media platforms

### Installation

1. **Install dependencies**:
```bash
cd video-creator/client
bun install
```

2. **Start the web interface**:
```bash
# From the video-creator root directory
bun run web
# OR
./start-web.sh
# OR
cd client && bun run dev
```

3. **Open your browser** to `http://localhost:3000`

## 🎯 Features

### 1. Video Generation
- **Subreddit Selection**: Choose from stories, AITAH, or todayilearned
- **Generation Options**:
  - Skip video generation (audio only)
  - Use dialogue mode for better audio
  - Target specific story IDs
- **Real-time Progress**: Monitor generation status

### 2. Upload Management
- **Multi-platform Support**: YouTube, TikTok, Instagram, Local storage
- **Privacy Controls**: Private, Public, or Unlisted
- **Batch Operations**: Upload multiple videos at once

### 3. Story Browser
- **Reddit Integration**: Browse stories from configured subreddits
- **Story Preview**: View titles, content, and metadata
- **Selection Interface**: Click to select stories for generation

### 4. Video History
- **Complete Archive**: View all generated videos
- **Status Tracking**: See completion status and file availability
- **Management Tools**: Download, regenerate, or delete videos
- **Detailed View**: Full story content and metadata

### 5. Platform Configuration
- **API Credentials**: Secure storage of platform credentials
- **Generation Settings**: Default preferences for video creation
- **Storage Management**: Monitor disk usage and clear cache

## 🛠️ Technical Architecture

### Frontend (SvelteKit)
```
client/
├── src/
│   ├── lib/
│   │   ├── components/ui/          # shadcn-svelte components
│   │   ├── api/                    # API client wrapper
│   │   └── video-generator-service.ts  # Backend integration
│   ├── routes/
│   │   ├── api/                    # Server-side API endpoints
│   │   ├── history/                # Video history page
│   │   ├── settings/               # Configuration page
│   │   └── +page.svelte           # Main dashboard
│   └── types.ts                   # TypeScript definitions
└── package.json
```

### Backend Integration
- **CLI Wrapper**: Direct integration with the main video creator CLI
- **File System**: Reads from and writes to the media directory
- **Process Management**: Spawns CLI processes for generation and upload

### API Endpoints
- `POST /api/generate` - Start video generation
- `POST /api/upload` - Upload videos to platforms
- `GET /api/stories` - Fetch available stories
- `GET /api/media` - Serve generated media files

## 📋 Usage Instructions

### Generating Your First Video

1. **Select Subreddit**: Choose from the dropdown (stories, AITAH, todayilearned)
2. **Configure Options**:
   - Leave Story ID empty for random selection
   - Check "Skip video" for audio-only generation
   - Check "Use dialogue" for better audio quality
3. **Click Generate**: Monitor progress in the interface
4. **View Results**: Generated videos appear in the history

### Setting Up Platform Uploads

#### YouTube Setup
1. Go to **Settings > Platform Configuration**
2. Enable YouTube integration
3. Add your **Client ID** and **Client Secret** from Google Cloud Console
4. Set **Redirect URI** to `http://localhost:3000/oauth/callback`
5. Test the connection

#### TikTok Setup
1. Enable TikTok in platform settings
2. Add your **Client Key** and **Client Secret**
3. Configure redirect URI in TikTok developer console

#### Instagram Setup
1. Enable Instagram integration
2. Add your **Access Token** and **Business Account ID**
3. Ensure your Instagram account is configured for business use

### Managing Generated Content

#### Viewing History
- Navigate to **History** page
- See all generated videos with status indicators
- Use filters to find specific content
- Download or regenerate videos as needed

#### Storage Management
- Monitor disk usage in **Settings > Storage & Cache**
- Clear cache when needed
- Export/import settings for backup

## 🔧 Configuration

### Environment Variables
The web interface inherits environment variables from the main video creator:

```bash
# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Audio Generation
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key

# Platform APIs
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_key
TIKTOK_CLIENT_SECRET=your_tiktok_secret
```

### Default Settings
Configure default behavior in **Settings > Generation Settings**:
- **Default Subreddit**: Choose your preferred source
- **Audio Model**: Standard, Premium, or Dia
- **Video Quality**: Low (720p) to Ultra (4K)
- **Max Duration**: Set video length limits
- **Auto-upload**: Enable automatic platform uploads

## 🐛 Troubleshooting

### Common Issues

#### "Command not found" errors
- Ensure bun is installed and in your PATH
- Verify the main video creator CLI works independently
- Check file permissions for the start script

#### API connection failures
- Test CLI commands manually: `bun run generate --help`
- Verify the parent directory structure is correct
- Check that media directories exist

#### File not found errors
- Ensure media directories exist: `media/scripts`, `media/audios`, `media/outputs`
- Check file permissions for the web server
- Verify the main video creator generates files correctly

#### Platform upload failures
- Verify API credentials are correct
- Check platform-specific requirements
- Ensure redirect URIs match your setup

### Debugging Steps

1. **Check CLI Integration**:
```bash
cd video-creator
bun run generate --help
bun run upload --help
bun run list --help
```

2. **Verify File Structure**:
```bash
ls -la media/
ls -la media/scripts/
ls -la media/outputs/
```

3. **Test API Endpoints**:
```bash
curl http://localhost:3000/api/stories?subreddit=stories
```

4. **Check Server Logs**:
Monitor the terminal running the development server for error messages.

## 🚀 Production Deployment

### Building for Production

1. **Build the application**:
```bash
cd client
bun run build
```

2. **Preview the build**:
```bash
bun run preview
```

### Deployment Options

#### Self-Hosted
- Use the built-in SvelteKit adapter
- Deploy to a VPS or dedicated server
- Ensure the main video creator is installed on the server

#### Containerized
- Create a Docker image including both the web interface and CLI
- Use docker-compose for easy deployment
- Mount the media directory as a volume

#### Cloud Platforms
- Deploy to Vercel, Netlify, or similar platforms
- Note: Server-side CLI integration may require custom setup

## 📦 Development

### Adding New Features

1. **New API Endpoints**: Add routes in `src/routes/api/`
2. **New Pages**: Create routes in `src/routes/`
3. **New Components**: Add to `src/lib/components/`
4. **CLI Integration**: Extend `video-generator-service.ts`

### Code Structure

```typescript
// API Client (Frontend)
import { videoGeneratorAPI } from '$lib/api/video-generator';

// Service Layer (Backend)
import { videoGeneratorService } from '$lib/video-generator-service';

// Types
import type { RedditStory, UploadPlatform } from '../types';
```

### Testing

```bash
# Run type checking
bun run check

# Run linting
bun run lint

# Format code
bun run format
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (both web interface and CLI integration)
5. Submit a pull request

## 📝 Notes

- The web interface is a wrapper around the existing CLI tool
- All video generation happens through CLI process spawning
- File serving is handled through the `/api/media` endpoint
- Settings are stored in localStorage (consider database for production)
- Platform credentials should be stored securely in production

## 🔗 Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [shadcn-svelte Components](https://www.shadcn-svelte.com/)
- [Bun Documentation](https://bun.sh/docs)
- [Main Video Creator CLI](../README.md)

---

For support or questions, please refer to the main project documentation or create an issue in the repository.