import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';
import type { RedditStory } from '../../../../../src/types'; // Adjust path as needed

// Define the structure for the story data we'll return
interface StoryListItem {
	id: string;
	title: string;
	status: 'ready' | 'generated' | 'error'; // Status based on file existence
}

export const GET: RequestHandler = async () => {
	// Paths relative to the SvelteKit project root ('ui/')
	const scriptsDir = path.resolve(process.cwd(), '../media/scripts');
	const outputsDir = path.resolve(process.cwd(), '../media/outputs');
	const stories: StoryListItem[] = [];

	try {
		const files = await fs.readdir(scriptsDir, { withFileTypes: true });
		const storyFiles = files.filter((file) => file.isFile() && file.name.endsWith('.json'));

		for (const file of storyFiles) {
			const storyName = file.name.replace('.json', '');
			const storyPath = path.join(scriptsDir, file.name);
			const videoPath = path.join(outputsDir, `${storyName}.mp4`);

			try {
				const storyData: RedditStory = await fs.readFile(storyPath, 'utf-8').then(JSON.parse);
				const hasVideo = await fs
					.access(videoPath)
					.then(() => true)
					.catch(() => false);

				stories.push({
					id: storyName,
					title: storyData.title || 'Untitled Story', // Fallback title
					status: hasVideo ? 'generated' : 'ready'
				});
			} catch (readError) {
				console.error(`Error processing story file ${file.name}:`, readError);
				stories.push({
					id: storyName,
					title: `Error reading ${storyName}`,
					status: 'error'
				});
			}
		}

		return json(stories);
	} catch (error) {
		console.error('Error listing stories:', error);
		// Return an error response
		return json({ error: 'Failed to retrieve stories' }, { status: 500 });
	}
};
