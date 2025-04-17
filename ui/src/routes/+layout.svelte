<script lang="ts">
    import "../app.css";
    import { Button } from '$lib/components/ui/button';
</script>


<div class="container mx-auto px-4 py-8">
    <nav class="flex gap-4 mb-8 border-b border-border pb-4">
        <Button variant="ghost" >
            <a href="/">Stories</a>
        </Button>
        <Button variant="ghost" >
            <a href="/generate">Generate</a>
        </Button>
        <Button variant="ghost" >
            <a href="/uploads">Uploads</a>
        </Button>
        <Button variant="ghost" >
            <a href="/settings">Settings</a>
        </Button>
    </nav>

    <slot />
</div>
