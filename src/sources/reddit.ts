import fs from "node:fs/promises";
import Snoowrap from "snoowrap";
import type { RedditStory } from "../types";

function redditClient() {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) throw new Error("Reddit requires REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET. Use --source <story.json> for local stories.");
  return new Snoowrap({ userAgent: process.env.REDDIT_USER_AGENT || "video-creator/1.0", clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET, refreshToken: process.env.REDDIT_REFRESH_TOKEN, accessToken: process.env.REDDIT_ACCESS_TOKEN });
}

export async function grabStories(subreddits: string[]): Promise<RedditStory[]> {
  const reddit = redditClient();
  await fs.mkdir("./media/scripts", { recursive: true });
  const candidates: Array<{ story: RedditStory; discussion: number }> = [];
  for (const subreddit of subreddits) {
    if (!/^[A-Za-z0-9_]+$/.test(subreddit)) throw new Error(`Invalid subreddit name: ${subreddit}`);
    // Start with discussed posts rather than whichever individual fetch finishes first.
    const posts = await reddit.getSubreddit(subreddit).getTop({ time: "week", limit: 30 });
    for (const item of posts) {
      if (!item.selftext || item.selftext.length < 500 || item.selftext.length > 16000 || item.over_18 || /\[(removed|deleted)\]/i.test(item.selftext)) continue;
      const story: RedditStory = { id: item.id, name: item.name, title: item.title, body: item.selftext, url: item.url,
        author: { name: item.author?.name || "anonymous" } };
      candidates.push({ story, discussion: Math.log1p(Math.max(0, item.score)) + Math.log1p(item.num_comments) });
    }
  }
  const stories = [...new Map(candidates.sort((a, b) => b.discussion - a.discussion || a.story.name.localeCompare(b.story.name)).map(c => [c.story.name, c.story])).values()];
  for (const story of stories) await fs.writeFile(`./media/scripts/${story.name}.json`, JSON.stringify(story, null, 2));
  return stories;
}
