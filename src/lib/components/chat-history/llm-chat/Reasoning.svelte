<script lang="ts">

	import { processLinks, sanitizeLLmContent } from "$lib/components/chat-history/utils/chatHistory";
	import marked from "$lib/utils/marked-extensions.ts";

    export let reasoning: string;

</script>
<p class="reasoning-paragraph">
    <span>Reasoning:</span>
    {@html processLinks(marked(
        sanitizeLLmContent(reasoning)
    ))}
</p>

<style lang="scss">
    .reasoning-paragraph {
        border-left: 2px solid var(--text-color-light-opacity-extreme);
        padding-left: 25px;
        display: flex;
        flex-direction: column;
        font-weight: 300;
        line-height: 30px;
        width: max-content;
        max-width: 100%;
        overflow-y: hidden;
        overflow-x: hidden !important;
        margin-bottom: 35px;

        span {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 5px;
        }
    }
</style>