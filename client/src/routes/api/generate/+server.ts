import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { videoGeneratorService } from '$lib/video-generator-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.subreddit) {
			return json({ success: false, error: 'Subreddit is required' }, { status: 400 });
		}

		// Generate video using the service
		const result = await videoGeneratorService.generateVideo({
			subreddit: body.subreddit,
			skipVideo: body.skipVideo || false,
			useDia: body.useDia || false,
			storyId: body.storyId
		});

		if (result.success) {
			return json({
				success: true,
				story: result.data?.story,
				message: 'Video generated successfully'
			});
		} else {
			return json(
				{
					success: false,
					error: result.error || 'Video generation failed'
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Generate API error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
