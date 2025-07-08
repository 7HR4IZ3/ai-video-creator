import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const MEDIA_ROOT = path.resolve(process.cwd(), '..', 'media');

export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get('file');

  if (!filePath) {
    throw error(400, 'File parameter is required');
  }

  // Security: Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw error(400, 'Invalid file path');
  }

  // Construct full path
  const fullPath = path.join(MEDIA_ROOT, normalizedPath);

  // Check if file exists
  if (!existsSync(fullPath)) {
    throw error(404, 'File not found');
  }

  try {
    // Get file stats
    const stats = await stat(fullPath);

    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (ext) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    // Create readable stream
    const stream = createReadStream(fullPath);

    // Convert Node.js stream to web stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        stream.on('end', () => {
          controller.close();
        });

        stream.on('error', (err) => {
          controller.error(err);
        });
      },

      cancel() {
        stream.destroy();
      }
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (err) {
    console.error('Error serving media file:', err);
    throw error(500, 'Internal server error');
  }
};
