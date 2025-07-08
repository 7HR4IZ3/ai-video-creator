<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface PlatformConfig {
		name: string;
		displayName: string;
		enabled: boolean;
		configured: boolean;
		fields: {
			[key: string]: {
				label: string;
				type: 'text' | 'password' | 'textarea' | 'select';
				value: string;
				required: boolean;
				placeholder?: string;
				options?: string[];
			};
		};
	}

	interface GenerationSettings {
		defaultSubreddit: string;
		audioModel: string;
		videoQuality: string;
		maxVideoDuration: number;
		autoUpload: boolean;
		defaultPrivacy: string;
	}

	let platformConfigs: PlatformConfig[] = [
		{
			name: 'youtube',
			displayName: 'YouTube',
			enabled: true,
			configured: false,
			fields: {
				clientId: {
					label: 'Client ID',
					type: 'text',
					value: '',
					required: true,
					placeholder: 'Your YouTube API Client ID'
				},
				clientSecret: {
					label: 'Client Secret',
					type: 'password',
					value: '',
					required: true,
					placeholder: 'Your YouTube API Client Secret'
				},
				redirectUri: {
					label: 'Redirect URI',
					type: 'text',
					value: 'http://localhost:3000/oauth/callback',
					required: true,
					placeholder: 'OAuth redirect URI'
				}
			}
		},
		{
			name: 'tiktok',
			displayName: 'TikTok',
			enabled: false,
			configured: false,
			fields: {
				clientKey: {
					label: 'Client Key',
					type: 'text',
					value: '',
					required: true,
					placeholder: 'Your TikTok API Client Key'
				},
				clientSecret: {
					label: 'Client Secret',
					type: 'password',
					value: '',
					required: true,
					placeholder: 'Your TikTok API Client Secret'
				}
			}
		},
		{
			name: 'instagram',
			displayName: 'Instagram',
			enabled: false,
			configured: false,
			fields: {
				accessToken: {
					label: 'Access Token',
					type: 'password',
					value: '',
					required: true,
					placeholder: 'Your Instagram Access Token'
				},
				businessAccountId: {
					label: 'Business Account ID',
					type: 'text',
					value: '',
					required: true,
					placeholder: 'Your Instagram Business Account ID'
				}
			}
		}
	];

	let generationSettings: GenerationSettings = {
		defaultSubreddit: 'stories',
		audioModel: 'standard',
		videoQuality: 'high',
		maxVideoDuration: 60,
		autoUpload: false,
		defaultPrivacy: 'private'
	};

	let activeTab = 'platforms';
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	onMount(() => {
		loadSettings();
	});

	async function loadSettings() {
		try {
			// In a real app, this would load from an API
			// For now, we'll use localStorage
			const saved = localStorage.getItem('videoCreatorSettings');
			if (saved) {
				const settings = JSON.parse(saved);
				if (settings.platforms) {
					platformConfigs = settings.platforms;
				}
				if (settings.generation) {
					generationSettings = settings.generation;
				}
			}
		} catch (err) {
			console.error('Failed to load settings:', err);
		}
	}

	async function saveSettings() {
		saving = true;
		error = null;
		success = null;

		try {
			// In a real app, this would save to an API
			const settings = {
				platforms: platformConfigs,
				generation: generationSettings
			};
			localStorage.setItem('videoCreatorSettings', JSON.stringify(settings));
			success = 'Settings saved successfully!';
		} catch (err) {
			error = 'Failed to save settings';
			console.error('Save error:', err);
		} finally {
			saving = false;
		}
	}

	function togglePlatform(platformName: string) {
		platformConfigs = platformConfigs.map((config) => {
			if (config.name === platformName) {
				return { ...config, enabled: !config.enabled };
			}
			return config;
		});
	}

	function updatePlatformField(platformName: string, fieldName: string, value: string) {
		platformConfigs = platformConfigs.map((config) => {
			if (config.name === platformName) {
				return {
					...config,
					fields: {
						...config.fields,
						[fieldName]: {
							...config.fields[fieldName],
							value
						}
					}
				};
			}
			return config;
		});
	}

	function testConnection(platformName: string) {
		// In a real app, this would test the API connection
		console.log(`Testing connection for ${platformName}`);
	}

	function resetPlatform(platformName: string) {
		if (!confirm(`Are you sure you want to reset ${platformName} configuration?`)) return;

		platformConfigs = platformConfigs.map((config) => {
			if (config.name === platformName) {
				const resetFields = { ...config.fields };
				Object.keys(resetFields).forEach((key) => {
					resetFields[key].value = '';
				});
				return {
					...config,
					fields: resetFields,
					configured: false
				};
			}
			return config;
		});
	}

	function closeAlert() {
		error = null;
		success = null;
	}
</script>

<svelte:head>
	<title>Settings - Video Creator</title>
	<meta name="description" content="Configure platforms and generation settings" />
</svelte:head>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-8">
		<h1 class="mb-2 text-4xl font-bold text-gray-900">Settings</h1>
		<p class="text-gray-600">Configure platforms and generation settings</p>
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

	<div class="mb-6 flex gap-4">
		<Button
			variant={activeTab === 'platforms' ? 'default' : 'outline'}
			onclick={() => (activeTab = 'platforms')}
		>
			Platform Configuration
		</Button>
		<Button
			variant={activeTab === 'generation' ? 'default' : 'outline'}
			onclick={() => (activeTab = 'generation')}
		>
			Generation Settings
		</Button>
	</div>

	{#if activeTab === 'platforms'}
		<div class="space-y-6">
			{#each platformConfigs as config (config.displayName)}
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<div>
								<CardTitle class="flex items-center gap-2">
									{config.displayName}
									{#if config.configured}
										<Badge variant="secondary">Configured</Badge>
									{:else}
										<Badge variant="outline">Not Configured</Badge>
									{/if}
								</CardTitle>
								<CardDescription>
									Configure {config.displayName} integration settings
								</CardDescription>
							</div>
							<div class="flex items-center gap-2">
								<Button variant="outline" size="sm" onclick={() => togglePlatform(config.name)}>
									{config.enabled ? 'Disable' : 'Enable'}
								</Button>
								{#if config.configured}
									<Button variant="outline" size="sm" onclick={() => testConnection(config.name)}>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{#if config.enabled}
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								{#each Object.entries(config.fields) as [fieldName, field] (field)}
									<div class="space-y-2">
										<Label for={`${config.name}-${fieldName}`}>
											{field.label}
											{#if field.required}
												<span class="text-red-500">*</span>
											{/if}
										</Label>
										{#if field.type === 'select'}
											<Select
												type="single"
												value={field.value}
												onValueChange={(value) =>
													updatePlatformField(config.name, fieldName, value)}
											>
												<SelectTrigger>{field.placeholder}</SelectTrigger>
												<SelectContent>
													{#each field.options || [] as option (option)}
														<SelectItem value={option}>{option}</SelectItem>
													{/each}
												</SelectContent>
											</Select>
										{:else if field.type === 'textarea'}
											<Textarea
												id={`${config.name}-${fieldName}`}
												bind:value={field.value}
												placeholder={field.placeholder}
												rows={3}
											/>
										{:else}
											<Input
												id={`${config.name}-${fieldName}`}
												type={field.type}
												bind:value={field.value}
												placeholder={field.placeholder}
											/>
										{/if}
									</div>
								{/each}
							</div>
							<div class="mt-4 flex gap-2">
								<Button variant="outline" size="sm" onclick={() => resetPlatform(config.name)}>
									Reset Configuration
								</Button>
							</div>
						{:else}
							<p class="text-gray-500 italic">Platform is disabled</p>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	{#if activeTab === 'generation'}
		<div class="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Default Generation Settings</CardTitle>
					<CardDescription>Configure default settings for video generation</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="defaultSubreddit">Default Subreddit</Label>
							<Select type="single" bind:value={generationSettings.defaultSubreddit}>
								<SelectTrigger>Select default subreddit</SelectTrigger>
								<SelectContent>
									<SelectItem value="stories">Stories</SelectItem>
									<SelectItem value="AITAH">Am I The Asshole</SelectItem>
									<SelectItem value="todayilearned">Today I Learned</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-2">
							<Label for="audioModel">Audio Model</Label>
							<Select type="single" bind:value={generationSettings.audioModel}>
								<SelectTrigger>Select audio model</SelectTrigger>
								<SelectContent>
									<SelectItem value="standard">Standard</SelectItem>
									<SelectItem value="premium">Premium</SelectItem>
									<SelectItem value="dia">Dia (Dialogue)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-2">
							<Label for="videoQuality">Video Quality</Label>
							<Select type="single" bind:value={generationSettings.videoQuality}>
								<SelectTrigger>Select video quality</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low (720p)</SelectItem>
									<SelectItem value="medium">Medium (1080p)</SelectItem>
									<SelectItem value="high">High (1440p)</SelectItem>
									<SelectItem value="ultra">Ultra (4K)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-2">
							<Label for="maxDuration">Max Video Duration (seconds)</Label>
							<Input
								id="maxDuration"
								type="number"
								bind:value={generationSettings.maxVideoDuration}
								min="10"
								max="300"
								placeholder="60"
							/>
						</div>

						<div class="space-y-2">
							<Label for="defaultPrivacy">Default Privacy Setting</Label>
							<Select type="single" bind:value={generationSettings.defaultPrivacy}>
								<SelectTrigger>Select privacy setting</SelectTrigger>
								<SelectContent>
									<SelectItem value="private">Private</SelectItem>
									<SelectItem value="public">Public</SelectItem>
									<SelectItem value="unlisted">Unlisted</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="autoUpload"
							bind:checked={generationSettings.autoUpload}
							class="rounded border-gray-300"
						/>
						<Label for="autoUpload">Auto-upload videos after generation</Label>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Storage & Cache</CardTitle>
					<CardDescription>Manage local storage and cache settings</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="rounded-lg border p-4 text-center">
							<div class="text-2xl font-bold text-blue-600">2.4 GB</div>
							<div class="text-sm text-gray-600">Generated Videos</div>
						</div>
						<div class="rounded-lg border p-4 text-center">
							<div class="text-2xl font-bold text-green-600">456 MB</div>
							<div class="text-sm text-gray-600">Audio Files</div>
						</div>
						<div class="rounded-lg border p-4 text-center">
							<div class="text-2xl font-bold text-purple-600">12 MB</div>
							<div class="text-sm text-gray-600">Cache</div>
						</div>
					</div>

					<div class="flex gap-2">
						<Button variant="outline">Clear Cache</Button>
						<Button variant="outline">Export Settings</Button>
						<Button variant="outline">Import Settings</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<div class="mt-8 flex justify-end">
		<Button onclick={saveSettings} disabled={saving}>
			{saving ? 'Saving...' : 'Save Settings'}
		</Button>
	</div>
</div>
