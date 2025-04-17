import fs from 'fs/promises';
import path from 'path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Construct the absolute path to the media/outputs directory
    // SvelteKit runs from the 'ui' directory, so we go up two levels
    const outputsDir = path.resolve(process.cwd(), '../..', 'media/outputs');
    let videoFiles: string[] = [];

    try {
        const files = await fs.readdir(outputsDir);
        videoFiles = files.filter(file => file.endsWith('.mp4'));
    } catch (error) {
        console.error('Error reading video directory:', error);
        // Return an empty array or handle the error as appropriate
        // For now, we'll return an empty array so the page doesn't crash
    }

    return {
        videos: videoFiles.map(fileName => ({
            id: fileName, // Use filename as ID for now
            title: fileName, // Use filename as title for now
            // We don't have platform/status info from filenames alone
            platform: 'N/A',
            status: 'generated'
        }))
    };
};