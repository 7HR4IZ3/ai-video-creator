import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { videoGeneratorService } from '$lib/video-generator-service';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const subreddit = url.searchParams.get('subreddit');

		if (!subreddit) {
			return json({ success: false, error: 'Subreddit parameter is required' }, { status: 400 });
		}

		// Get stories using the service
		const result = await videoGeneratorService.listStories(subreddit);

		if (result.success) {
			return json({
				success: true,
				stories: result.data?.stories || [],
				message: 'Stories fetched successfully'
			});
		} else {
			return json(
				{
					success: false,
					error: result.error || 'Failed to fetch stories'
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Stories API error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
