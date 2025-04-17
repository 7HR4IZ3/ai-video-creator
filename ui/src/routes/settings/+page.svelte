<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
    
    let youtubeClientId = '';
    let youtubeClientSecret = '';
    let facebookAccessToken = '';
    let facebookPageId = '';
    let tiktokAccessToken = '';
</script>

<div class="space-y-6">
    <h1 class="text-3xl font-bold">Settings</h1>
    <p class="mb-8">Configure platform credentials and video settings</p>
    
    <Card class="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
            <CardTitle class="text-xl font-bold">YouTube</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
            <Label for="youtube-client-id" class="block font-medium">Client ID</Label>
            <Input class="border-2 border-black p-2 rounded-none w-full" type="text" id="youtube-client-id" bind:value={youtubeClientId} />
            
            <Label for="youtube-client-secret" class="block font-medium">Client Secret</Label>
            <Input class="border-2 border-black p-2 rounded-none w-full" type="text" id="youtube-client-secret" bind:value={youtubeClientSecret} />
        </CardContent>
    </Card>
    
    <Card class="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
            <CardTitle class="text-xl font-bold">Facebook</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
            <Label for="facebook-access-token" class="block font-medium">Access Token</Label>
            <Input class="border-2 border-black p-2 rounded-none w-full" type="text" id="facebook-access-token" bind:value={facebookAccessToken} />
            
            <Label for="facebook-page-id" class="block font-medium">Page ID</Label>
            <Input class="border-2 border-black p-2 rounded-none w-full" type="text" id="facebook-page-id" bind:value={facebookPageId} />
        </CardContent>
    </Card>
    
    <Card class="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
            <CardTitle class="text-xl font-bold">TikTok</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
            <Label for="tiktok-access-token" class="block font-medium">Access Token</Label>
            <Input class="border-2 border-black p-2 rounded-none w-full" type="text" id="tiktok-access-token" bind:value={tiktokAccessToken} />
        </CardContent>
    </Card>
    
    <Button 
        class="border-2 border-black bg-black text-white hover:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all px-8 py-3 text-lg"
    >
        Save Settings
    </Button>
</div>