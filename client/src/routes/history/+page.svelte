<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import type { RedditStory } from '../../types';

	interface VideoHistory {
		id: string;
		story: RedditStory;
		createdAt: string;
		hasVideo: boolean;
		hasAudio: boolean;
		status: 'completed' | 'failed' | 'partial';
		videoPath?: string;
		audioPath?: string;
	}

	let videos: VideoHistory[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedVideo: VideoHistory | null = null;

	onMount(async () => {
		await loadHistory();
	});

	async function loadHistory() {
		loading = true;
		error = null;

		try {
			// For now, we'll simulate loading history
			// In a real implementation, this would call an API endpoint
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Mock data - in real app, this would come from API
			videos = [
				{
					id: 'video1',
					story: {
						id: 'story1',
						name: 'story1',
						title: 'TIFU by accidentally ordering 100 pizzas instead of 1',
						content: 'So this happened yesterday and I\'m still dealing with the aftermath...',
						author: { name: 'pizzalover123' },
						url: 'https://reddit.com/r/tifu/example1',
						subreddit: 'tifu',
						score: 1234,
						created: Date.now() - 86400000
					},
					createdAt: new Date(Date.now() - 86400000).toISOString(),
					hasVideo: true,
					hasAudio: true,
					status: 'completed',
					videoPath: '/outputs/story1.mp4',
					audioPath: '/outputs/story1.mp3'
				},
				{
					id: 'video2',
					story: {
						id: 'story2',
						name: 'story2',
						title: 'AITA for refusing to pay for my sister\'s wedding dress?',
						content: 'My sister is getting married next month and expects me to pay...',
						author: { name: 'confusedmoh' },
						url: 'https://reddit.com/r/AmItheAsshole/example2',
						subreddit: 'AmItheAsshole',
						score: 2345,
						created: Date.now() - 172800000
					},
					createdAt: new Date(Date.now() - 172800000).toISOString(),
					hasVideo: false,
					hasAudio: true,
					status: 'partial',
					audioPath: '/outputs/story2.mp3'
				},
				{
					id: 'video3',
					story: {
						id: 'story3',
						name: 'story3',
						title: 'My neighbor has been stealing my packages',
						content: 'For months, my packages have been disappearing from my doorstep...',
						author: { name: 'packagedefender' },
						url: 'https://reddit.com/r/pettyrevenge/example3',
						subreddit: 'pettyrevenge',
						score: 5678,
						created: Date.now() - 259200000
					},
					createdAt: new Date(Date.now() - 259200000).toISOString(),
					hasVideo: true,
					hasAudio: true,
					status: 'completed',
					videoPath: '/outputs/story3.mp4',
					audioPath: '/outputs/story3.mp3'
				}
			];
		} catch (err) {
			error = 'Failed to load video history';
			console.error('Error loading history:', err);
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}

	// function formatDuration(seconds: number): string {
	// 	const mins = Math.floor(seconds / 60);
	// 	const secs = seconds % 60;
	// 	return `${mins}:${secs.toString().padStart(2, '0')}`;
	// }

	function getStatusColor(status: VideoHistory['status']): string {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'partial':
				return 'bg-yellow-100 text-yellow-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	async function deleteVideo(videoId: string) {
		if (!confirm('Are you sure you want to delete this video?')) return;

		try {
			// In a real app, this would call an API endpoint
			videos = videos.filter(v => v.id !== videoId);
		} catch {
			error = 'Failed to delete video';
		}
	}

	async function regenerateVideo(video: VideoHistory) {
		try {
			// In a real app, this would call the generate API
			console.log('Regenerating video for story:', video.story.id);
		} catch {
			error = 'Failed to regenerate video';
		}
	}
</script>

<svelte:head>
	<title>Video History - Video Creator</title>
	<meta name="description" content="View and manage your generated videos" />
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-900 mb-2">Video History</h1>
		<p class="text-gray-600">View and manage your generated videos</p>
	</div>

	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertDescription>
				{error}
				<Button variant="ghost" size="sm" onclick={() => error = null} class="ml-2">×</Button>
			</AlertDescription>
		</Alert>
	{/if}

	<div class="flex justify-between items-center mb-6">
		<div class="flex items-center space-x-4">
			<Button onclick={loadHistory} disabled={loading}>
				{loading ? 'Loading...' : 'Refresh'}
			</Button>
		</div>

		<div class="text-sm text-gray-600">
			{videos.length} video{videos.length !== 1 ? 's' : ''} found
		</div>
	</div>

	{#if loading}
		<div class="grid gap-4">
			{#each Array(3) as _ (_)}
				<Card>
					<CardContent class="p-6">
						<div class="animate-pulse">
							<div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
							<div class="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
							<div class="flex space-x-2">
								<div class="h-6 bg-gray-200 rounded w-16"></div>
								<div class="h-6 bg-gray-200 rounded w-20"></div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if videos.length === 0}
		<Card>
			<CardContent class="p-12 text-center">
				<div class="text-gray-400 mb-4">
					<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">No videos yet</h3>
				<p class="text-gray-600 mb-4">Generate your first video to see it here.</p>
				<Button href="/">Generate Video</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4">
			{#each videos as video (video.id)}
				<Card class="hover:shadow-md transition-shadow">
					<CardHeader>
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<CardTitle class="text-lg mb-1 truncate">{video.story.title}</CardTitle>
								<CardDescription class="flex items-center gap-2 mb-2">
									<span>u/{video.story.author.name}</span>
									<span>•</span>
									<span>r/{video.story.subreddit}</span>
									<span>•</span>
									<span>{formatDate(video.createdAt)}</span>
								</CardDescription>
							</div>
							<div class="flex items-center gap-2 ml-4">
								<Badge class={getStatusColor(video.status)}>
									{video.status}
								</Badge>
								<Badge variant="outline">{video.story.score} upvotes</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									{#if video.hasVideo}
										<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
											<path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
										</svg>
										<span class="text-sm text-green-600">Video</span>
									{:else}
										<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
										</svg>
										<span class="text-sm text-gray-400">No Video</span>
									{/if}
								</div>

								<div class="flex items-center gap-2">
									{#if video.hasAudio}
										<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.828 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.828l3.555-3.793a1 1 0 011.617.793zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clip-rule="evenodd" />
										</svg>
										<span class="text-sm text-blue-600">Audio</span>
									{:else}
										<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.828 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.828l3.555-3.793a1 1 0 011.617.793zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clip-rule="evenodd" />
										</svg>
										<span class="text-sm text-gray-400">No Audio</span>
									{/if}
								</div>
							</div>

							<div class="flex items-center gap-2">
								{#if video.hasVideo}
									<Button size="sm" variant="outline">
										<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
										</svg>
										Download
									</Button>
								{/if}

								{#if video.status === 'partial' || video.status === 'failed'}
									<Button size="sm" variant="outline" onclick={() => regenerateVideo(video)}>
										<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Regenerate
									</Button>
								{/if}

								<Button size="sm" variant="outline" onclick={() => selectedVideo = video}>
									<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									View
								</Button>

								<Button size="sm" variant="outline" onclick={() => deleteVideo(video.id)}>
									<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
									Delete
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Video Detail Modal -->
{#if selectedVideo}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex items-start justify-between mb-4">
					<h2 class="text-2xl font-bold text-gray-900">{selectedVideo.story.title}</h2>
					<Button variant="ghost" size="sm" onclick={() => selectedVideo = null}>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</Button>
				</div>

				<div class="space-y-4">
					<div class="flex items-center gap-4 text-sm text-gray-600">
						<span>u/{selectedVideo.story.author.name}</span>
						<span>•</span>
						<span>r/{selectedVideo.story.subreddit}</span>
						<span>•</span>
						<span>{selectedVideo.story.score} upvotes</span>
						<span>•</span>
						<span>{formatDate(selectedVideo.createdAt)}</span>
					</div>

					<div class="bg-gray-50 p-4 rounded-lg">
						<h3 class="font-semibold mb-2">Story Content</h3>
						<p class="text-gray-700 whitespace-pre-wrap">{selectedVideo.story.content}</p>
					</div>

					{#if selectedVideo.hasVideo}
						<div class="bg-gray-50 p-4 rounded-lg">
							<h3 class="font-semibold mb-2">Video Preview</h3>
							<div class="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
								<p class="text-gray-500">Video player would go here</p>
							</div>
						</div>
					{/if}

					<div class="flex gap-2">
						<Button variant="outline" href={selectedVideo.story.url} target="_blank" rel="noopener">
							<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
							View on Reddit
						</Button>
						{#if selectedVideo.hasVideo}
							<Button variant="outline">
								<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
								</svg>
								Download Video
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
