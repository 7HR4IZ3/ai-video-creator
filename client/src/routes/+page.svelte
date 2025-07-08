<script lang="ts">
	import { onMount } from 'svelte';
	import { videoGeneratorAPI } from '$lib/api/video-generator';
	import { SUBREDDIT_CONFIGS } from '../types';
	import type { RedditStory, GenerateVideoFormData, UploadVideoFormData } from '../types';

	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	let selectedTab = 'generate';
	let generateForm: GenerateVideoFormData = {
		subreddit: 'stories',
		skipVideo: false,
		useDia: false
	};
	let uploadForm: UploadVideoFormData = {
		platform: 'local',
		privacy: 'private',
		storyId: ''
	};

	let isGenerating = false;
	let isUploading = false;
	let stories: RedditStory[] = [];
	let selectedStory: RedditStory | null = null;
	let error: string | null = null;
	let success: string | null = null;

	onMount(() => {
		// Load initial stories
		loadStoriesFromSubreddit(generateForm.subreddit);
	});

	async function loadStoriesFromSubreddit(subreddit: string) {
		try {
			const response = await videoGeneratorAPI.listStories(subreddit);
			if (response.success && response.stories) {
				stories = response.stories;
			} else {
				error = response.error || 'Failed to load stories';
			}
		} catch {
			error = 'Failed to connect to the server';
		}
	}

	async function generateVideo() {
		if (isGenerating) return;

		isGenerating = true;
		error = null;
		success = null;

		try {
			const response = await videoGeneratorAPI.generateVideo(generateForm);

			if (response.success) {
				success = 'Video generation completed successfully!';
				selectedStory = response.story || null;

				// Refresh stories list
				await loadStoriesFromSubreddit(generateForm.subreddit);
			} else {
				error = response.error || 'Video generation failed';
			}
		} catch {
			error = 'Failed to generate video';
		} finally {
			isGenerating = false;
		}
	}

	async function uploadVideo() {
		if (isUploading || !uploadForm.storyId) return;

		isUploading = true;
		error = null;
		success = null;

		try {
			const response = await videoGeneratorAPI.uploadVideo(uploadForm);

			if (response.success) {
				success = `Video uploaded successfully! URL: ${response.videoUrl}`;
			} else {
				error = response.error || 'Upload failed';
			}
		} catch {
			error = 'Failed to upload video';
		} finally {
			isUploading = false;
		}
	}

	function handleSubredditChange(value: string) {
		generateForm.subreddit = value;
		loadStoriesFromSubreddit(value);
	}

	function selectStory(story: RedditStory) {
		selectedStory = story;
		generateForm.storyId = story.id;
		uploadForm.storyId = story.id;
	}

	function closeAlert() {
		error = null;
		success = null;
	}
</script>

<svelte:head>
	<title>Video Creator - Web Interface</title>
	<meta name="description" content="Generate social media videos from Reddit stories" />
</svelte:head>

<div class="container mx-auto p-6 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-900 mb-2">Video Creator</h1>
		<p class="text-gray-600">Generate engaging social media videos from Reddit stories</p>
	</div>

	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertDescription>
				{error}
				<Button variant="ghost" size="sm" onclick={closeAlert} class="ml-2">×</Button>
			</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert class="mb-6">
			<AlertDescription>
				{success}
				<Button variant="ghost" size="sm" onclick={closeAlert} class="ml-2">×</Button>
			</AlertDescription>
		</Alert>
	{/if}

	<div class="flex gap-4 mb-6">
		<Button
			variant={selectedTab === 'generate' ? 'default' : 'outline'}
			onclick={() => selectedTab = 'generate'}
		>
			Generate Video
		</Button>
		<Button
			variant={selectedTab === 'upload' ? 'default' : 'outline'}
			onclick={() => selectedTab = 'upload'}
		>
			Upload Video
		</Button>
		<Button
			variant={selectedTab === 'stories' ? 'default' : 'outline'}
			onclick={() => selectedTab = 'stories'}
		>
			Browse Stories
		</Button>
	</div>

	{#if selectedTab === 'generate'}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Generate Video</CardTitle>
					<CardDescription>Create a video from a Reddit story</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="subreddit">Subreddit</Label>
						<Select type="single" value={generateForm.subreddit} onValueChange={handleSubredditChange}>
							<SelectTrigger>
								Select a subreddit
							</SelectTrigger>
							<SelectContent>
								{#each SUBREDDIT_CONFIGS as config (config.name)}
									<SelectItem value={config.name}>{config.displayName}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="space-y-2">
						<Label for="storyId">Story ID (optional)</Label>
						<Input
							id="storyId"
							bind:value={generateForm.storyId}
							placeholder="Leave empty to get random story"
						/>
					</div>

					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="skipVideo"
							bind:checked={generateForm.skipVideo}
							class="rounded border-gray-300"
						/>
						<Label for="skipVideo">Skip video generation (audio only)</Label>
					</div>

					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="useDia"
							bind:checked={generateForm.useDia}
							class="rounded border-gray-300"
						/>
						<Label for="useDia">Use dialogue mode</Label>
					</div>

					<Button
						onclick={generateVideo}
						disabled={isGenerating}
						class="w-full"
					>
						{isGenerating ? 'Generating...' : 'Generate Video'}
					</Button>
				</CardContent>
			</Card>

			{#if selectedStory}
				<Card>
					<CardHeader>
						<CardTitle>Selected Story</CardTitle>
						<CardDescription>u/{selectedStory.author.name} • {selectedStory.subreddit}</CardDescription>
					</CardHeader>
					<CardContent>
						<h3 class="font-semibold mb-2">{selectedStory.title}</h3>
						<p class="text-sm text-gray-600 mb-4">
							{selectedStory.content.substring(0, 200)}...
						</p>
						<div class="flex items-center gap-2">
							<Badge variant="secondary">{selectedStory.score} upvotes</Badge>
							<Badge variant="outline">{selectedStory.subreddit}</Badge>
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>
	{/if}

	{#if selectedTab === 'upload'}
		<Card class="max-w-2xl">
			<CardHeader>
				<CardTitle>Upload Video</CardTitle>
				<CardDescription>Upload generated video to social media platforms</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="platform">Platform</Label>
					<Select type="single" bind:value={uploadForm.platform}>
						<SelectTrigger>
							Select platform
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="youtube">YouTube</SelectItem>
							<SelectItem value="tiktok">TikTok</SelectItem>
							<SelectItem value="instagram">Instagram</SelectItem>
							<SelectItem value="local">Local Storage</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label for="privacy">Privacy</Label>
					<Select type="single" bind:value={uploadForm.privacy}>
						<SelectTrigger>
							Select privacy
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="private">Private</SelectItem>
							<SelectItem value="public">Public</SelectItem>
							<SelectItem value="unlisted">Unlisted</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label for="uploadStoryId">Story ID</Label>
					<Input
						id="uploadStoryId"
						bind:value={uploadForm.storyId}
						placeholder="Enter story ID to upload"
						required
					/>
				</div>

				<Button
					onclick={uploadVideo}
					disabled={isUploading || !uploadForm.storyId}
					class="w-full"
				>
					{isUploading ? 'Uploading...' : 'Upload Video'}
				</Button>
			</CardContent>
		</Card>
	{/if}

	{#if selectedTab === 'stories'}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-bold">Stories from r/{generateForm.subreddit}</h2>
				<Button onclick={() => loadStoriesFromSubreddit(generateForm.subreddit)}>
					Refresh
				</Button>
			</div>

			{#if stories.length === 0}
				<Card>
					<CardContent class="p-6">
						<p class="text-gray-500 text-center">No stories found. Try refreshing or selecting a different subreddit.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="grid gap-4">
					{#each stories as story (story.id)}
						<Card class="cursor-pointer hover:shadow-md transition-shadow" onclick={() => selectStory(story)}>
							<CardHeader>
								<div class="flex items-start justify-between">
									<CardTitle class="text-lg">{story.title}</CardTitle>
									<div class="flex gap-2">
										<Badge variant="secondary">{story.score}</Badge>
										<Badge variant="outline">{story.subreddit}</Badge>
									</div>
								</div>
								<CardDescription>u/{story.author.name}</CardDescription>
							</CardHeader>
							<CardContent>
								<p class="text-sm text-gray-600 line-clamp-3">
									{story.content.substring(0, 300)}...
								</p>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
