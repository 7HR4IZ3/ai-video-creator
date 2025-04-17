import type { Readable } from 'node:stream';

export type AudioProps = {
    transcript: string;
}

export type StreamSrc = {
    src: string;
    stream: Readable;
}

export interface RedditStory {
    id: string;
    name: string;
    title: string;
    body: string;
    url: string;
    author: {
        name: string;
    }
}
