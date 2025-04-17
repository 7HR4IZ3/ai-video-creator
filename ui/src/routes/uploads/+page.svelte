<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	// The 'videos' array is now loaded from +page.server.ts and available in data.videos
</script>

<div class="space-y-4">
	<h1 class="text-3xl font-bold mb-6">Generated Videos</h1>
	<p class="mb-8">List of videos generated in the 'media/outputs' directory.</p>

	{#if data.videos.length > 0}
		{#each data.videos as video}
			<div class="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="font-bold text-lg">{video.title}</h3>
						<p class="text-sm">
							Status: <span class="font-mono">{video.status}</span>
						</p>
					</div>
					<!-- Removed Re-upload button for now -->
				</div>
			</div>
		{/each}
	{:else}
		<p>No generated videos found in 'media/outputs'.</p>
	{/if}
</div>