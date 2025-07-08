import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { videoGeneratorService } from '$lib/video-generator-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.platform || !body.storyId) {
			return json({ success: false, error: 'Platform and story ID are required' }, { status: 400 });
		}

		// Upload video using the service
		const result = await videoGeneratorService.uploadVideo({
			platform: body.platform,
			storyId: body.storyId,
			privacy: body.privacy || 'private',
			options: body.options || {}
		});

		if (result.success) {
			return json({
				success: true,
				videoUrl: result.data?.videoUrl,
				message: 'Video uploaded successfully'
			});
		} else {
			return json(
				{
					success: false,
					error: result.error || 'Video upload failed'
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Upload API error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
