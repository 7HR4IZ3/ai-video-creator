# Video Creator - Web Interface

A SvelteKit web application that provides a user-friendly interface for the Video Creator tool. Generate engaging social media videos from Reddit stories with an intuitive web interface.

## Features

- **Generate Videos**: Create videos from Reddit stories with customizable options
- **Upload Management**: Upload generated videos to multiple platforms (YouTube, TikTok, Instagram)
- **Story Browser**: Browse and select stories from different subreddits
- **Video History**: View and manage previously generated videos
- **Platform Configuration**: Set up API credentials for various social media platforms
- **Real-time Progress**: Monitor video generation progress in real-time

## Tech Stack

- **Framework**: SvelteKit
- **UI Components**: shadcn-svelte
- **Styling**: Tailwind CSS
- **Runtime**: Bun
- **Backend Integration**: Direct CLI integration with the main video creator

## Prerequisites

- Bun runtime installed
- The main video creator project set up and working
- API credentials for platforms you want to upload to

## Installation

1. Navigate to the client directory:
```bash
cd video-creator/client
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Generating Videos

1. Go to the main dashboard
2. Select a subreddit from the dropdown
3. Configure generation options:
   - **Skip Video**: Generate audio only
   - **Use Dialogue**: Use dialogue-based audio generation
   - **Story ID**: Target a specific story (optional)
4. Click "Generate Video"

### Managing Uploads

1. Go to the "Upload Video" tab
2. Select the platform (YouTube, TikTok, Instagram, or Local)
3. Choose privacy settings
4. Enter the Story ID of the video you want to upload
5. Click "Upload Video"

### Browsing Stories

1. Go to the "Browse Stories" tab
2. View available stories from the selected subreddit
3. Click on any story to select it for generation
4. Use the "Refresh" button to load new stories

### Viewing History

1. Navigate to the "History" page
2. View all generated videos with their status
3. Download, regenerate, or delete videos as needed
4. Click "View" to see detailed story information

### Configuration

1. Go to the "Settings" page
2. Configure platform credentials in the "Platform Configuration" tab
3. Set default generation preferences in the "Generation Settings" tab
4. Save your settings

## API Integration

The web interface communicates with the main video creator through:

- **Generation**: `POST /api/generate` - Triggers video generation
- **Upload**: `POST /api/upload` - Uploads videos to platforms
- **Stories**: `GET /api/stories` - Fetches available stories
- **Media**: `GET /api/media` - Serves generated media files

## File Structure

```
client/
├── src/
│   ├── lib/
│   │   ├── components/ui/          # shadcn-svelte components
│   │   ├── api/                    # API client code
│   │   └── video-generator-service.ts  # Backend service wrapper
│   ├── routes/
│   │   ├── api/                    # API endpoints
│   │   ├── history/                # History page
│   │   ├── settings/               # Settings page
│   │   └── +page.svelte           # Main dashboard
│   ├── types.ts                   # TypeScript definitions
│   └── app.css                    # Global styles
├── package.json
└── README.md
```

## Development

### Running in Development Mode

```bash
bun run dev
```

### Building for Production

```bash
bun run build
```

### Previewing Production Build

```bash
bun run preview
```

## Platform Setup

### YouTube
1. Create a Google Cloud project
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add credentials in Settings > Platform Configuration

### TikTok
1. Register for TikTok for Developers
2. Create an app and get client credentials
3. Add credentials in Settings > Platform Configuration

### Instagram
1. Set up Instagram Business Account
2. Create Facebook App with Instagram Basic Display
3. Get access tokens and account ID
4. Add credentials in Settings > Platform Configuration

## Troubleshooting

### Common Issues

1. **"Command not found" errors**: Ensure the main video creator is properly set up and bun is installed
2. **API connection failures**: Check that the main video creator CLI commands work independently
3. **File not found errors**: Verify the media directory structure exists in the parent project
4. **Permission errors**: Ensure the web server has read access to the media directory

### Debugging

- Check the browser console for client-side errors
- Check the terminal running the dev server for server-side errors
- Verify file paths and permissions for media files
- Test CLI commands independently to ensure they work

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Video Creator tool suite. See the main project for license information.