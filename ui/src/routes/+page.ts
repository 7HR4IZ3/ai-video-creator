import type { PageLoad } from './$types';

// Define the expected structure of a story item from the API
interface StoryListItem {
    id: string;
    title: string;
    status: 'ready' | 'generated' | 'error';
}

export const load: PageLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/api/stories'); // Fetch from our new API endpoint
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stories: StoryListItem[] = await response.json();
        return {
            stories
        };
    } catch (error) {
        console.error('Failed to load stories:', error);
        // Return empty array or error state for the page to handle
        return {
            stories: [],
            error: 'Could not load stories.'
        };
    }
};