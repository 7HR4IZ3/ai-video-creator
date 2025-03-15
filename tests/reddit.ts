import "dotenv/config";
import Snoowrap from "snoowrap";

const r = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT as string,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN,
});

const top = await r.getSubreddit("RedditStoryTime").getTop();

const story = top[0].fetch();
story.then(item => item.author.fetch().then(console.log))