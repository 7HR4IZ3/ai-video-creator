import "dotenv/config";
import { generateRedditScreenshotHTML } from "./src/screenshot.js";
import { grabStories } from "./src/sources/reddit.js";
import { CWD } from "./src/constants.js";
import path from "path";
import fs from "fs";

async function testScreenshot() {
  try {
    console.log("🧪 Testing Reddit screenshot generation with real stories...");

    // First, fetch real Reddit stories
    console.log("📥 Fetching stories from Reddit...");
    const stories = await grabStories(["AITAH"]);

    if (stories.length === 0) {
      console.log("⚠️ No stories found. This might be due to:");
      console.log("- Stories being too short (< 500 characters)");
      console.log("- All stories already exist in media/scripts/");
      console.log("- Reddit API rate limiting");
      console.log("- Missing Reddit API credentials");
      return;
    }

    console.log(`✅ Successfully fetched ${stories.length} stories`);

    // Use the first story for testing
    const testStory = stories[0];
    console.log("\n📖 Using story for screenshot test:");
    console.log(`ID: ${testStory.id}`);
    console.log(`Name: ${testStory.name}`);
    console.log(`Title: ${testStory.title}`);
    console.log(`Author: ${testStory.author.name}`);
    console.log(`URL: ${testStory.url}`);
    console.log(`Body length: ${testStory.body.length} characters`);
    console.log(`Body preview: ${testStory.body.substring(0, 200)}...`);

    // Test HTML-based screenshot generation
    console.log("\n📸 Generating screenshot...");
    const screenshotPath = await generateRedditScreenshotHTML(testStory, {
      width: 800,
      height: 600,
      deviceScaleFactor: 2,
      quality: 95,
    });

    console.log("✅ Screenshot generated successfully!");
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);

    // Verify file exists
    if (fs.existsSync(screenshotPath)) {
      const stats = fs.statSync(screenshotPath);
      console.log(`📊 File size: ${Math.round(stats.size / 1024)} KB`);
      console.log(`📅 Created: ${stats.birthtime.toISOString()}`);
    } else {
      console.error("❌ Screenshot file not found!");
      return;
    }

    // Test directory structure
    const screenshotDir = path.join(CWD, "media/screenshots");
    if (fs.existsSync(screenshotDir)) {
      console.log("✅ Screenshots directory exists");
      const files = fs.readdirSync(screenshotDir);
      console.log(`📁 Screenshots in directory: ${files.length}`);
      files.forEach((file) => console.log(`  - ${file}`));
    } else {
      console.error("❌ Screenshots directory not found!");
    }

    // Test with multiple stories if available
    if (stories.length > 1) {
      console.log("\n🔄 Testing with additional stories...");
      const additionalStories = stories.slice(1, Math.min(3, stories.length));

      for (const story of additionalStories) {
        console.log(
          `\n📸 Generating screenshot for: ${story.title.substring(0, 50)}...`,
        );
        const additionalScreenshotPath = await generateRedditScreenshotHTML(
          story,
          {
            width: 800,
            height: 600,
            deviceScaleFactor: 2,
            quality: 95,
          },
        );

        if (fs.existsSync(additionalScreenshotPath)) {
          const stats = fs.statSync(additionalScreenshotPath);
          console.log(
            `✅ Screenshot created: ${Math.round(stats.size / 1024)} KB`,
          );
        } else {
          console.error(`❌ Failed to create screenshot for ${story.name}`);
        }
      }
    }

    // Final summary
    console.log("\n📊 Final Test Summary:");
    const finalFiles = fs.readdirSync(screenshotDir);
    console.log(`📁 Total screenshots created: ${finalFiles.length}`);
    const totalSize = finalFiles.reduce((sum, file) => {
      const filePath = path.join(screenshotDir, file);
      return sum + fs.statSync(filePath).size;
    }, 0);
    console.log(`💾 Total storage used: ${Math.round(totalSize / 1024)} KB`);
  } catch (error) {
    console.error("❌ Test failed:", error);

    if (error.message.includes("credentials")) {
      console.log(
        "\n💡 Make sure your Reddit API credentials are set in .env:",
      );
      console.log("REDDIT_USER_AGENT=your_user_agent");
      console.log("REDDIT_CLIENT_ID=your_client_id");
      console.log("REDDIT_CLIENT_SECRET=your_client_secret");
      console.log("REDDIT_REFRESH_TOKEN=your_refresh_token");
      console.log("REDDIT_ACCESS_TOKEN=your_access_token");
    }

    if (
      error.message.includes("playwright") ||
      error.message.includes("browser")
    ) {
      console.log("\n💡 Make sure Playwright browsers are installed:");
      console.log("npx playwright install");
    }

    process.exit(1);
  }
}

// Run the test
testScreenshot()
  .then(() => {
    console.log("\n🎉 Screenshot test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed with error:", error);
    process.exit(1);
  });
