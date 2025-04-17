import fs from "node:fs/promises";
import Snoowrap from "snoowrap";
import type { RedditStory } from "../types";

const reddit = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT as string,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN,
});

export async function grabStories(subreddits: string[]): Promise<RedditStory[]> {
  // if (process.env.ENVIRONMENT === "dev") {
  //   return await Promise.all(
  //     (
  //       await fs.readdir("./media/scripts")
  //     ).slice(0, count  + 1).map(async (file) => {
  //       return JSON.parse(await fs.readFile(`./media/scripts/${file}`, "utf8"));
  //     })
  //   );
  // }

  const stories: RedditStory[] = [];

  for (const subreddit of subreddits) {
    const newStories = await reddit
      .getSubreddit(subreddit)
      .getNew();

    await Promise.all(
      newStories.map((story) => {
        return story.fetch().then(async (item) => {
          if (
            !item.selftext ||
            item.selftext.length < 500
            // || (await fs.exists(`./media/scripts/${item.name}.json`))
          )
            return null;

          const story = {
            id: item.id,
            url: item.url,
            name: item.name,
            title: item.title,
            body: item.selftext,
            author: { name: item.author.name },
          };
          await fs.writeFile(
            `./media/scripts/${item.name}.json`,
            JSON.stringify(story),
            { encoding: "utf8" }
          );
          stories.push(story);
        });
      })
    );
  }

  return stories;
}
