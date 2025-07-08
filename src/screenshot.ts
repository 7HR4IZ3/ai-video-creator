import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { CWD } from "./constants";
import type { RedditStory } from "./types";

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  quality?: number;
}

export async function generateRedditScreenshot(
  story: RedditStory,
  options: ScreenshotOptions = {},
): Promise<string> {
  const {
    width = 1200,
    height = 800,
    deviceScaleFactor = 2,
    quality = 95,
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(CWD, "media/screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, `${story.name}.png`);

    // Check if screenshot already exists
    if (fs.existsSync(screenshotPath)) {
      console.log(`[Screenshot] Using existing screenshot for ${story.name}`);
      return screenshotPath;
    }

    console.log(`[Screenshot] Generating screenshot for ${story.name}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({
      width,
      height,
    });

    // Navigate to Reddit post
    const postUrl = story.url;
    console.log(`[Screenshot] Navigating to ${postUrl}`);

    await page.goto(postUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for the post to load
    await page.waitForSelector('[data-testid="post-content"]', {
      timeout: 10000,
    });

    // Hide unnecessary elements
    await page.evaluate(() => {
      // Hide header/navigation
      const header = document.querySelector("header");
      if (header) header.style.display = "none";

      // Hide sidebar
      const sidebar = document.querySelector<HTMLElement>(
        '[data-testid="subreddit-sidebar"]',
      );
      if (sidebar) sidebar.style.display = "none";

      // Hide comments section
      const comments = document
        .querySelector('[data-testid="comments-page-link-num-comments"]')
        ?.closest('[data-testid="post-container"]')
        ?.nextElementSibling as HTMLElement;
      if (comments) comments.style.display = "none";

      // Hide other posts
      const feed = document.querySelector(
        '[data-testid="post-container"]',
      )?.parentElement;
      if (feed) {
        const posts = feed.children;
        for (let i = 1; i < posts.length; i++) {
          (posts[i] as HTMLElement).style.display = "none";
        }
      }

      // Hide ads and promotional content
      const ads = document.querySelectorAll(
        '[data-testid*="ad"], [data-testid*="promo"]',
      );
      ads.forEach((ad) => ((ad as HTMLElement).style.display = "none"));
    });

    // Find the main post element
    const postElement = page.locator('[data-testid="post-content"]');
    if (!(await postElement.count())) {
      throw new Error("Could not find post content element");
    }

    // Take screenshot of just the post element
    await postElement.screenshot({
      path: screenshotPath,
      type: "png",
      quality,
    });

    console.log(`[Screenshot] ✅ Screenshot saved to ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    console.error(`[Screenshot] ❌ Error generating screenshot:`, error);

    // Try alternative approach - full page screenshot and crop
    if (page) {
      try {
        console.log(`[Screenshot] Attempting fallback method...`);

        const screenshotPath = path.join(
          CWD,
          "media/screenshots",
          `${story.name}.png`,
        );

        // Take full page screenshot
        await page.screenshot({
          path: screenshotPath,
          type: "png",
          quality,
          fullPage: false,
        });

        console.log(
          `[Screenshot] ✅ Fallback screenshot saved to ${screenshotPath}`,
        );
        return screenshotPath;
      } catch (fallbackError) {
        console.error(
          `[Screenshot] ❌ Fallback method also failed:`,
          fallbackError,
        );
        throw fallbackError;
      }
    }

    throw error;
  } finally {
    // Clean up
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateRedditScreenshotHTML(
  story: RedditStory,
  options: ScreenshotOptions = {},
): Promise<string> {
  const {
    width = 1200,
    height = 800,
    deviceScaleFactor = 2,
    quality = 95,
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(CWD, "media/screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, `${story.name}.jpg`);

    // Check if screenshot already exists
    if (fs.existsSync(screenshotPath)) {
      console.log(`[Screenshot] Using existing screenshot for ${story.name}`);
      return screenshotPath;
    }

    console.log(
      `[Screenshot] Generating HTML-based screenshot for ${story.name}`,
    );

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({
      width,
      height,
    });

    // Detect subreddit from URL or use default
    const detectSubreddit = (url: string): string => {
      const match = url.match(/\/r\/([^\/]+)/);
      return match ? match[1] : "AITAH";
    };

    // Generate random but realistic engagement numbers
    const generateEngagementNumbers = () => {
      const upvotes = Math.floor(Math.random() * 5000) + 100;
      const comments = Math.floor(Math.random() * 300) + 10;

      return {
        upvotes:
          upvotes > 1000
            ? `${(upvotes / 1000).toFixed(1)}k`
            : upvotes.toString(),
        comments,
      };
    };

    const subreddit = detectSubreddit(story.url);
    const engagement = generateEngagementNumbers();

    // Create HTML content that mimics Reddit post styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #ffffff;
            color: #1c1c1c;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
          }
          .post-container {
            background-color: #ffffff;
            border: 1px solid #ccc;
            border-radius: 4px;
            overflow: hidden;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .post {
            padding: 0;
            margin: 0;
          }
          .post-meta {
            display: flex;
            align-items: center;
            padding: 12px 16px 8px 16px;
            font-size: 12px;
            color: #7c7c7c;
            gap: 6px;
          }
          .subreddit-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ff4500;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
          }
          .subreddit {
            font-weight: 700;
            color: #1c1c1c;
            text-decoration: none;
          }
          .meta-separator {
            color: #7c7c7c;
            margin: 0 2px;
          }
          .author {
            color: #7c7c7c;
            font-weight: 500;
          }
          .post-title {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
            padding: 0 16px 12px 16px;
            color: #1c1c1c;
            line-height: 1.3;
          }
          .post-body {
            font-size: 14px;
            line-height: 1.5;
            color: #1c1c1c;
            margin: 0;
            padding: 0 16px 16px 16px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .post-footer {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            background-color: #ffffff;
            border-top: 1px solid #edeff1;
            gap: 8px;
          }
          .vote-section {
            display: flex;
            align-items: center;
            background-color: #f6f7f8;
            border-radius: 2px;
            padding: 4px 8px;
            gap: 6px;
          }
          .vote-button {
            background: none;
            border: none;
            color: #878a8c;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 16px;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
          }
          .vote-button:hover {
            background-color: #e1e5e9;
          }
          .vote-count {
            font-size: 12px;
            font-weight: 700;
            color: #1c1c1c;
            min-width: 30px;
            text-align: center;
          }
          .post-actions {
            display: flex;
            gap: 4px;
            flex: 1;
          }
          .action-button {
            background: none;
            border: none;
            color: #878a8c;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 2px;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: background-color 0.2s;
          }
          .action-button:hover {
            background-color: #f6f7f8;
          }
          .action-icon {
            width: 16px;
            height: 16px;
          }
        </style>
      </head>
      <body>
        <div class="post-container">
          <div class="post">
            <div class="post-meta">
              <div class="subreddit-icon">r/</div>
              <span class="subreddit">r/${subreddit}</span>
              <span class="meta-separator">•</span>
              <span>Posted by</span>
              <span class="author">u/${story.author.name}</span>
            </div>
            <h1 class="post-title">${story.title}</h1>
            <div class="post-body">${story.body.substring(0, 600)}${story.body.length > 600 ? "..." : ""}</div>
            <div class="post-footer">
              <div class="vote-section">
                <button class="vote-button">
                  <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3L3 10h4v7h6v-7h4L10 3z"/>
                  </svg>
                </button>
                <span class="vote-count">${engagement.upvotes}</span>
                <button class="vote-button">
                  <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 17L17 10h-4V3H7v7H3l7 7z"/>
                  </svg>
                </button>
              </div>
              <div class="post-actions">
                <button class="action-button">
                  <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                  </svg>
                  <span>${engagement.comments} Comments</span>
                </button>
                <button class="action-button">
                  <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
                  </svg>
                  <span>Share</span>
                </button>
                <button class="action-button">
                  <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
                  </svg>
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Set HTML content
    await page.setContent(htmlContent);

    // Wait for content to render
    await page.waitForTimeout(2000);

    // Take screenshot of the post element
    const postElement = page.locator(".post-container");
    if (!(await postElement.count())) {
      throw new Error("Could not find post container element");
    }

    await postElement.screenshot({
      path: screenshotPath,
      type: "jpeg",
    });

    console.log(`[Screenshot] ✅ HTML screenshot saved to ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    console.error(`[Screenshot] ❌ Error generating HTML screenshot:`, error);
    throw error;
  } finally {
    // Clean up
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}
