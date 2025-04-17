<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
    import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
    
    // TODO: Replace with actual data fetching from backend
    const stories = [
        { id: '1', title: "AITA for wanting my neighbor evicted?" },
        { id: '2', title: "AITA for not babysitting my sister's kids?" },
        { id: '3', title: "AITA for refusing to pay for Christmas dinner?" }
    ];
    
    let selectedStoryId = '1';
    const platforms = ['YouTube', 'TikTok', 'Facebook'];
    let selectedPlatform = 'YouTube';
    let privacySetting = 'Public';
</script>

<div class="space-y-6">
    <h1 class="text-3xl font-bold">Generate Video</h1>
    
    <Card class="border rounded-lg shadow-sm bg-white">
        <CardHeader>
            <CardTitle class="text-xl font-bold">Select Story</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
            <RadioGroup bind:value={selectedStoryId}>
                {#each stories as story}
                <div class="flex items-center space-x-2">
                    
                    <RadioGroupItem value={story.id} id={story.id}>
                    </RadioGroupItem>
                        <label for={story.id} class="cursor-pointer">{story.title}</label>
                    </div>
                {/each}
            </RadioGroup>
        </CardContent>
    </Card>
    
    <Card class="border rounded-lg shadow-sm bg-white">
        <CardHeader>
            <CardTitle class="text-xl font-bold">Video Settings</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <div>
                <label class="block font-medium mb-1">Platform</label>
                <div class="flex gap-2">
                    {#each platforms as platform}
                        <Button
                            variant={selectedPlatform === platform ? 'secondary' : 'outline'}
                            class="transition-all"
                            onclick={() => selectedPlatform = platform}
                        >
                            {platform}
                        </Button>
                    {/each}
                </div>
            </div>
            
            <div>
                <label class="block font-medium mb-1">Privacy</label>
                <div class="flex gap-2">
                    <Button
                        variant={privacySetting === 'Public' ? 'secondary' : 'outline'}
                        class="transition-all"
                        onclick={() => privacySetting = 'Public'}
                    >
                        Public
                    </Button>
                    <Button
                        variant={privacySetting === 'Private' ? 'secondary' : 'outline'}
                        class="transition-all"
                        onclick={() => privacySetting = 'Private'}
                    >
                        Private
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
    
    <Button size="lg" class="px-8 py-3">
        Generate Video
    </Button>
</div>
