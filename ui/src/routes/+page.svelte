<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	export let data: PageData;

	// The 'stories' array is now loaded from +page.ts and available in data.stories
	// data.error might contain an error message if loading failed

	// TODO: Implement generate button functionality
	function generateVideo(storyId: string) {
		console.log(`Generate video for story: ${storyId}`);
		// Placeholder for API call to trigger generation
	}
</script>

<div class="space-y-4">
	<h1 class="text-3xl font-bold mb-6">Available Stories</h1>

	{#if data.error}
		<p class="text-red-500">Error: {data.error}</p>
	{:else if data.stories && data.stories.length > 0}
		<p class="mb-8">Select a story to generate a video</p>
		{#each data.stories as story}
			<div class="border border-border p-4 bg-card shadow-sm rounded-md">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="font-bold text-lg">{story.title}</h3>
						<p class="text-sm">
							Status: <span class="font-mono">{story.status}</span>
						</p>
					</div>
					{#if story.status === 'ready'}
						<Button on:click={() => generateVideo(story.id)}> Generate </Button>
					{:else if story.status === 'generated'}
						<Button disabled>Generated</Button>
					{:else if story.status === 'error'}
						<Button disabled variant="destructive">Error</Button>
					{/if}
				</div>
			</div>
		{/each}
	{:else}
		<p>No stories found in 'media/scripts'.</p>
	{/if}
</div>
