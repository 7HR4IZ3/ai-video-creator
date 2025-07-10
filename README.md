# Video Creator

A powerful tool to automatically generate and publish engaging social media videos from Reddit stories. This project includes a command-line interface (CLI) for core functionality, a web interface for user-friendly operation, and a dedicated server to handle secure OAuth authentication for video uploads.

## Features

- **Automated Video Generation**: Create videos from Reddit stories with a single command or click.
- **Customizable Output**: Options to generate audio-only content or use dialogue-based audio.
- **Multi-Platform Uploader**: Upload generated videos directly to YouTube, TikTok, and Facebook.
- **Intuitive Web Interface**: A SvelteKit-powered UI to browse stories, generate videos, and manage uploads.
- **Secure Authentication**: An OAuth proxy server handles authentication for social media platforms, keeping your credentials secure.
- **Story Browser**: View and select top stories from various subreddits.
- **History Management**: Track, view, and manage all previously generated videos.
- **Real-time Progress**: Monitor video generation and upload progress.

## Project Structure

The project is a monorepo composed of three main parts:

-   `./`: The root directory contains the core CLI logic for video generation and uploading.
-   `client/`: A SvelteKit web application that provides a graphical user interface for the tool.
-   `server/`: An Express-based OAuth proxy server that manages authentication with platforms like Google, Facebook, and TikTok.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Bun](https://bun.sh/) (v1.1.0 or higher)
-   [Node.js](https://nodejs.org/) (for the OAuth server)
-   [Redis](https://redis.io/) (for caching OAuth tokens)
-   `ffmpeg` (for video processing)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd video-creator
    ```

2.  **Install dependencies for all parts of the project:**
    ```bash
    # Root (CLI)
    bun install

    # Client (Web Interface)
    cd client
    bun install
    cd ..

    # Server (OAuth Proxy)
    cd server
    npm install
    cd ..
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project by copying the example from the server directory.
    ```bash
    cp server/.env.example .env
    ```
    Now, edit the `.env` file with your credentials and settings. See the [Configuration](#configuration) section for details on each variable.

## Usage

The Video Creator can be operated through the Web Interface or the Command-Line Interface (CLI). For either, you must first start the OAuth Proxy Server.

### 1. Start the OAuth Proxy Server

The server handles authentication for uploading videos.

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001` by default. If you are using a service like ngrok (which is integrated), it will also provide a public URL necessary for OAuth callbacks.

### 2. Using the Web Interface

The web UI is the most user-friendly way to use the tool.

```bash
cd client
bun run dev
```

The application will be available at `http://localhost:3000`. From there you can:
-   Browse and select Reddit stories.
-   Generate videos with custom settings.
-   Upload videos to your configured platforms.
-   View the history of generated content.

### 3. Using the Command-Line Interface (CLI)

The CLI provides direct access to the video generation and upload functions.

#### Generate a Video

```bash
bun run index.ts generate --storyId <story_id>
```

**Options:**
-   `--storyId <id>`: (Optional) The ID of a specific Reddit story to generate. If omitted, a top story is chosen.
-   `--skipVideo`: (Optional) Generate audio only.
-   `--useDialogue`: (Optional) Use dialogue-based audio generation.

#### Upload a Video

```bash
bun run index.ts upload --destination <platform> --storyId <story_id>
```

**Options:**
-   `--destination <platform>`: The platform to upload to (`youtube`, `tiktok`, `facebook`).
-   `--storyId <id>`: The ID of the story corresponding to the video you want to upload.
-   `--title <title>`: (Optional) The title of the video.
-   `--description <desc>`: (Optional) The description of the video.
-   `--privacy <status>`: (Optional) The privacy status of the video (e.g., `public`, `private`, `unlisted`).

## Configuration

All configuration is handled via the `.env` file in the project's root directory.

| Variable              | Description                                  | Required      |
| --------------------- | -------------------------------------------- | ------------- |
| `OAUTH_SERVER_PORT`   | Server port (default: 3001)                  | No            |
| `OAUTH_SERVER_HOST`   | Server host (default: localhost)             | No            |
| `OAUTH_BASE_URL`      | Base URL for redirects (e.g., your ngrok URL) | No            |
| `REDIS_HOST`          | Redis host                                   | **Yes**       |
| `REDIS_PORT`          | Redis port                                   | **Yes**       |
| `REDIS_USERNAME`      | Redis username                               | No            |
| `REDIS_PASSWORD`      | Redis password                               | No            |
| `YOUTUBE_CLIENT_ID`   | YouTube OAuth client ID                      | For YouTube   |
| `YOUTUBE_CLIENT_SECRET` | YouTube OAuth client secret                  | For YouTube   |
| `FACEBOOK_APP_ID`     | Facebook app ID                              | For Facebook  |
| `FACEBOOK_APP_SECRET` | Facebook app secret                          | For Facebook  |
| `FACEBOOK_PAGE_ID`    | Facebook page ID                             | For Facebook  |
| `TIKTOK_CLIENT_KEY`   | TikTok client key                            | For TikTok    |
| `TIKTOK_CLIENT_SECRET`  | TikTok client secret                         | For TikTok    |
| `NGROK_AUTHTOKEN`     | Your ngrok authtoken to create a public URL  | For OAuth     |
| `NGROK_DOMAIN`        | A custom ngrok domain (optional)             | No            |

For instructions on obtaining OAuth credentials for each platform, refer to the documentation in `server/README.md`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.