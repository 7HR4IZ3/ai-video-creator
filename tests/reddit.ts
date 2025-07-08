import "dotenv/config";
import { grabStories } from "../src/sources/reddit.js";

async function testRedditStories() {
  try {
    console.log("🧪 Testing Reddit story fetching...");

    // Test fetching stories from AITAH subreddit
    const stories = await grabStories(["AITAH"]);

    console.log(`✅ Successfully fetched ${stories.length} stories`);

    if (stories.length > 0) {
      const firstStory = stories[0];
      console.log("\n📖 First story details:");
      console.log(`ID: ${firstStory.id}`);
      console.log(`Name: ${firstStory.name}`);
      console.log(`Title: ${firstStory.title}`);
      console.log(`Author: ${firstStory.author.name}`);
      console.log(`URL: ${firstStory.url}`);
      console.log(`Body length: ${firstStory.body.length} characters`);
      console.log(`Body preview: ${firstStory.body.substring(0, 200)}...`);

      // Test with multiple subreddits
      console.log("\n🔍 Testing multiple subreddits...");
      const multiStories = await grabStories(["AITAH", "stories"]);
      console.log(
        `✅ Successfully fetched ${multiStories.length} stories from multiple subreddits`,
      );

      // Show distribution by subreddit if we can determine it
      console.log("\n📊 Stories fetched:");
      multiStories.forEach((story, index) => {
        console.log(
          `${index + 1}. ${story.title.substring(0, 50)}... (${story.author.name})`,
        );
      });
    } else {
      console.log("⚠️ No stories found. This might be due to:");
      console.log("- Stories being too short (< 500 characters)");
      console.log("- All stories already exist in media/scripts/");
      console.log("- Reddit API rate limiting");
    }
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

    process.exit(1);
  }
}

// Run the test
testRedditStories()
  .then(() => {
    console.log("\n🎉 Reddit story test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed with error:", error);
    process.exit(1);
  });
