export interface RedditStory {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
  };
  url: string;
  subreddit: string;
  score: number;
  created: number;
  name: string;
}

export interface StreamSrc {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export type UploadPlatform = 'youtube' | 'tiktok' | 'instagram' | 'local';

export interface UploadResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export interface GenerationProgress {
  stage: 'fetching' | 'audio' | 'video' | 'finalizing' | 'complete';
  progress: number;
  message: string;
}

export interface VideoGenerationJob {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  story?: RedditStory;
  progress: GenerationProgress;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface SubredditConfig {
  name: string;
  displayName: string;
  description: string;
  category: 'stories' | 'aita' | 'til';
}

export const SUBREDDIT_CONFIGS: SubredditConfig[] = [
  {
    name: 'stories',
    displayName: 'Stories',
    description: 'General storytelling subreddit',
    category: 'stories'
  },
  {
    name: 'AITAH',
    displayName: 'Am I The Asshole',
    description: 'Moral judgment stories',
    category: 'aita'
  },
  {
    name: 'todayilearned',
    displayName: 'Today I Learned',
    description: 'Interesting facts and learning',
    category: 'til'
  }
];

export interface GenerateVideoFormData {
  subreddit: string;
  skipVideo: boolean;
  useDia: boolean;
  storyId?: string;
}

export interface UploadVideoFormData {
  platform: UploadPlatform;
  privacy: 'private' | 'public' | 'unlisted';
  storyId: string;
}
