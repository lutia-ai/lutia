<script lang="ts">
	import { formatModelEnumToReadable } from "$lib/models/modelUtils";
	import HoverTag from "$lib/components/HoverTag.svelte";
	import CopyIconFilled from "$lib/components/icons/CopyIconFilled.svelte";
	import DollarIcon from "$lib/components/icons/DollarIcon.svelte";
	import RefreshIcon from "$lib/components/icons/RefreshIcon.svelte";
	import TickIcon from "$lib/components/icons/TickIcon.svelte";
	import type { LlmChat } from "$lib/types/types";
	import { copyToClipboard, updateChatHistoryToCopiedState } from "$lib/components/chat-history/utils/copying";
	import PriceLabel from "$lib/components/chat-history/chat-toolbar/PriceLabel.svelte";
	import { regenerateMessage } from "$lib/components/chat-history/utils/regenerateMessage";

    export let chatIndex: number;
    export let chat: LlmChat;
</script>
<div
    class="chat-toolbar-container"
    style="opacity: {chat.price_open ? '1' : ''};"
>
    <div
        class="toolbar-item"
        role="button"
        tabindex="0"
        on:click={() => {
            copyToClipboard(chat.text);
            updateChatHistoryToCopiedState(
                chatIndex,
                0
            );
        }}
        on:keydown|stopPropagation={(e) => {
            if (e.key === 'Enter') {
                copyToClipboard(chat.text);
                updateChatHistoryToCopiedState(
                    chatIndex,
                    0
                );
            }
        }}
    >
        {#if chat.copied}
            <TickIcon color="var(--text-color-light)" />
        {:else}
            <CopyIconFilled
                color="var(--text-color-light)"
            />
        {/if}
        <HoverTag
            text={chat.copied ? 'copied' : 'copy'}
            position="bottom"
            distance={12}
        />
    </div>
    <div
        class="toolbar-item"
        role="button"
        tabindex="0"
        on:click|stopPropagation={() => {
            chat.price_open = true;
        }}
        on:keydown|stopPropagation={(e) => {
            if (e.key === 'Enter') {
                chat.price_open = true;
            }
        }}
    >
        <DollarIcon color="var(--text-color-light)" />
        <HoverTag
            text={'View cost'}
            position="bottom"
            distance={12}
        />
        {#if chat.price_open}
            <PriceLabel
                inputCost={chat.input_cost}
                outputCost={chat.output_cost}
            />
        {/if}
    </div>
    <div
        class="toolbar-item refresh-button"
        role="button"
        tabindex="0"
        on:click|stopPropagation={async () => {
            await regenerateMessage(
                chat.message_id ?? 0
            );
        }}
        on:keydown|stopPropagation={async (e) => {
            if (e.key === 'Enter') {
                await regenerateMessage(
                    chat.message_id ?? 0
                );
            }
        }}
    >
        <div class="icon">
            <RefreshIcon
                color="var(--text-color-light)"
            />
        </div>
        <span class="model-name"
            >{formatModelEnumToReadable(chat.by)}</span
        >
        <HoverTag
            text={'Regenerate response'}
            position="bottom"
            distance={12}
        />
    </div>
</div>

<style lang="scss">
    .chat-toolbar-container {
        position: absolute;
        display: flex;
        gap: 10px;
        transform: translateY(10px);
        padding: 5px;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid var(--text-color-light-opacity);
        z-index: 9;
        transition: all 0.3s ease-in-out;

        .toolbar-item {
            position: relative;
            border-radius: 5px;
            padding: 5px;
            box-sizing: border-box;
            width: 28px;
            height: 28px;
            cursor: pointer;

            &:hover {
                background: var(--bg-color-light);
            }
        }

        .toolbar-item.refresh-button {
            position: relative;
            display: flex;
            width: auto;
            transition: all 0s ease-in-out;

            .icon {
                margin-right: auto;
            }

            /* Initially only show the icon */
            .model-name {
                position: relative;
                max-width: 0;
                opacity: 0;
                white-space: nowrap;
                overflow: hidden;
                transition: all 0.5s ease-out;
                margin-left: 0;
            }

            /* On hover, expand to show model name */
            &:hover {
                background: var(--bg-color-light);
                width: auto;
                padding-right: 10px;

                .model-name {
                    max-width: 100%; /* adjust based on your longest model name */
                    opacity: 1;
                    margin-left: 10px;
                }
            }
        }
    }

    @media (max-width: 810px) {
        .chat-toolbar-container {
            transform: translateY(-5px);
        }
    }
</style>