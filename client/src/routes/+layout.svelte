<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white shadow-sm">
		<div class="container mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<h1 class="text-2xl font-bold text-gray-900">🎬 Video Creator</h1>
					<Badge variant="secondary" class="text-xs">Web Interface</Badge>
				</div>

				<nav class="flex items-center space-x-6">
					<a
						href="/"
						class="text-gray-600 transition-colors hover:text-gray-900"
						class:font-semibold={$page.url.pathname === '/'}
						class:text-blue-600={$page.url.pathname === '/'}
					>
						Dashboard
					</a>
					<a
						href="/history"
						class="text-gray-600 transition-colors hover:text-gray-900"
						class:font-semibold={$page.url.pathname === '/history'}
						class:text-blue-600={$page.url.pathname === '/history'}
					>
						History
					</a>
					<a
						href="/settings"
						class="text-gray-600 transition-colors hover:text-gray-900"
						class:font-semibold={$page.url.pathname === '/settings'}
						class:text-blue-600={$page.url.pathname === '/settings'}
					>
						Settings
					</a>
				</nav>
			</div>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-16 border-t bg-white">
		<div class="container mx-auto px-6 py-8">
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-600">
					© 2024 Video Creator. Generate engaging videos from Reddit stories.
				</div>
				<div class="flex items-center space-x-4">
					<Badge variant="outline" class="text-xs">v0.1.0</Badge>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}
</style>
