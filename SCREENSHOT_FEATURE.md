# Reddit Screenshot Feature Documentation

## Overview

The Reddit Screenshot feature automatically generates visual overlays of Reddit posts that are integrated into your generated videos. This creates more engaging content by showing the actual Reddit post alongside the narration.

## Features

- **Automatic Screenshot Generation**: Creates screenshots of Reddit posts using HTML rendering
- **Video Integration**: Overlays screenshots in the center of videos
- **Subtitle Repositioning**: Automatically moves subtitles below the screenshot
- **Thumbnail Generation**: Creates video thumbnails using the screenshot overlay
- **Caching**: Reuses existing screenshots to avoid regeneration

## How It Works

1. **Screenshot Generation**: When creating a video, the system generates an HTML-based screenshot of the Reddit post
2. **Video Overlay**: The screenshot is overlaid in the center of the video at 60% of the video width
3. **Subtitle Adjustment**: Subtitles are automatically repositioned below the screenshot
4. **Thumbnail Creation**: A thumbnail image is generated from the first frame with the screenshot overlay

## Directory Structure

```
media/
├── screenshots/     # Generated Reddit post screenshots
│   ├── story1.png
│   ├── story2.png
│   └── ...
├── outputs/         # Final videos with overlays
│   ├── story1.mp4
│   ├── story1.jpg   # Generated thumbnails
│   └── ...
```

## Usage

The screenshot feature is automatically enabled when generating videos. No additional configuration is required.

### Generate Video with Screenshot

```bash
# Generate a single video (screenshot will be created automatically)
bun run generate --story your_story_name

# Generate multiple videos
bun run generate --limit 5
```

### Test Screenshot Generation

```bash
# Test the screenshot functionality
node test-screenshot.js
```

## Configuration Options

### Screenshot Options

You can customize screenshot generation by modifying the options in `src/video.ts`:

```typescript
const screenshotPath = await generateRedditScreenshotHTML(story, {
  width: 800,           // Screenshot width
  height: 600,          // Screenshot height
  deviceScaleFactor: 2, // High DPI scaling
  quality: 90          // Image quality (0-100)
});
```

### Video Overlay Options

Customize the video overlay in `utils/main.py`:

```python
# Screenshot width as percentage of video width
screenshot_width = int(video_clip.w * 0.6)  # 60% of video width

# Subtitle positioning offset
subtitle_y = (video_clip.h / 2) + (screenshot_clip.h / 2) + 20  # 20px below screenshot
```

## Styling

The screenshot uses a dark Reddit theme with the following styling:

- **Background**: Dark theme (#1a1a1b)
- **Text**: Light text (#d7dadc) 
- **Borders**: Subtle borders (#343536)
- **Font**: System fonts (San Francisco, Segoe UI, Roboto)

### Customizing Screenshot Appearance

To modify the screenshot styling, edit the CSS in `src/screenshot.ts`:

```typescript
const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      /* Customize these styles */
      .post {
        background-color: #1a1a1b;
        border: 1px solid #343536;
        /* ... more styles */
      }
    </style>
  </head>
  <!-- ... -->
`;
```

## Technical Implementation

### Screenshot Generation

The system uses Playwright to:
1. Launch a headless Chromium browser
2. Render HTML content that mimics Reddit's post styling
3. Take a screenshot of the rendered content
4. Save the screenshot to the media/screenshots directory

### Video Integration

The Python video editor (`utils/main.py`):
1. Loads the screenshot as an ImageClip
2. Resizes it to 60% of video width
3. Positions it in the center of the video
4. Adjusts subtitle positioning to appear below the screenshot
5. Composites all elements together

## Dependencies

### Node.js Dependencies
- `playwright`: Browser automation for screenshot generation
- Automatically included in package.json

### Python Dependencies
- `moviepy`: Video editing and composition
- `PIL/Pillow`: Image processing
- `click`: Command-line interface
- All included in requirements.txt

## Troubleshooting

### Common Issues

1. **Screenshot Generation Fails**
   - Ensure Playwright browsers are installed: `npx playwright install`
   - Check that the screenshots directory exists and is writable

2. **Video Generation Fails**
   - Verify that the screenshot file exists before video generation
   - Check that MoviePy can read the screenshot file

3. **Subtitle Positioning Issues**
   - Adjust the subtitle_y calculation in the Python script
   - Ensure subtitle_position is set to "center" for proper positioning

### Debug Mode

Enable verbose logging to see detailed information:

```bash
# Python script verbose mode is enabled by default
python utils/main.py editor --verbose [other options]
```

### File Permissions

Ensure the media directories have proper write permissions:

```bash
chmod -R 755 media/
```

## Performance Considerations

- **Screenshot Caching**: Screenshots are cached and reused if they already exist
- **Browser Optimization**: Headless browser with minimal resource usage
- **Image Optimization**: PNG format with configurable quality settings
- **Memory Management**: Browser instances are properly closed after use

## Future Enhancements

Potential improvements for the screenshot feature:

1. **Multiple Screenshot Styles**: Support for different Reddit themes
2. **Custom Positioning**: Configurable screenshot position in videos
3. **Animation Effects**: Fade-in/fade-out effects for screenshots
4. **Batch Processing**: Generate screenshots for multiple stories in parallel
5. **Error Recovery**: Better fallback mechanisms for screenshot generation

## API Reference

### `generateRedditScreenshotHTML(story, options)`

Generates an HTML-based screenshot of a Reddit post.

**Parameters:**
- `story`: RedditStory object containing post data
- `options`: Screenshot configuration options

**Returns:** Promise<string> - Path to generated screenshot

**Example:**
```typescript
const screenshotPath = await generateRedditScreenshotHTML(story, {
  width: 800,
  height: 600,
  deviceScaleFactor: 2,
  quality: 90
});
```

### Python Editor Options

New command-line options for the video editor:

```bash
python utils/main.py editor --screenshot /path/to/screenshot.png [other options]
```

**Parameters:**
- `--screenshot`: Path to screenshot overlay file (optional)