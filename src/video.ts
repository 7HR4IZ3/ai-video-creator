import type { StreamSrc, RedditStory } from "./types";
import { renderStoryVideo } from "./story/render";

export async function createUploadableVideo(audio: StreamSrc, video: StreamSrc, { story }: { story: RedditStory }): Promise<StreamSrc> {
  return renderStoryVideo(story, audio, video);
}
