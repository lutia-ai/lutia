<script lang="ts">
	import { chatHistory } from "$lib/stores";
	import { fade } from "svelte/transition";
	import UserChatComponent from "./user-chat/UserChatComponent.svelte";
	import { isLlmChatComponent, isUserChatComponent } from "$lib/types/typeGuards";
	import LlmChatComponent from "./llm-chat/LlmChatComponent.svelte";

    export let openImageViewer: (src: string, alt: string) => void;
    export let openFileViewer: (content: string, filename: string) => void;
    export let promptBarHeight: number;

</script>
{#if $chatHistory.length === 0}
    <div class="empty-content-options">
        <div class="logo-container">
            <h1 class="animated-text">What can I help you with?</h1>
        </div>
    </div>
{/if}
<div
    transition:fade={{ duration: 300, delay: 300 }}
    class="chat-history"
    style="
        padding-bottom: {400 + promptBarHeight * 0.3}px;
    "
>
    {#each $chatHistory as chat, chatIndex}
        {#if isUserChatComponent(chat) && chat.by === 'user'}
            <UserChatComponent
                chat={chat}
                openImageViewer={openImageViewer}
                openFileViewer={openFileViewer}
            />
        {:else if isLlmChatComponent(chat)}
            <LlmChatComponent
                chat={chat}
                chatIndex={chatIndex}
                openImageViewer={openImageViewer}
            />
        {/if}
    {/each}
</div>


<style lang="scss">
    :global(h1) {
		font-size: 26px;
		margin: 0px 0 16px 0;
		padding: 0;
	}

	:global(h2) {
		font-size: 24px;
		margin: 32px 0 16px 0;
		padding: 0;
	}

	:global(h3, h4) {
		margin: 16px 0 8px 0;
		padding: 0;
	}

	:global(p) {
		margin: 0 0 10px 0;
		padding: 0;
	}

	:global(ul) {
		margin: 0 0 20px;
		padding: 0 0 0 26px;
		list-style-position: outside;
	}

	:global(ol) {
		margin: 0 0 20px;
		padding: 0 0 0 26px;
		list-style-position: outside;
	}

	:global(li) {
		margin: 8px 0;
		padding: 0;
		display: list-item;

		:global(p) {
			margin: 0 0 10px 0;
		}
	}

	:global(hr) {
		border: none;
		height: 1px;
		background-color: #e5e5e5;
		margin: 48px 0;
	}

	:global(table) {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		margin-bottom: 20px;
		border-radius: 10px;
		border: 1px solid var(--bg-color-light);
		overflow: hidden;
	}

	:global(thead) {
		background-color: var(--bg-color-light);
	}

	:global(th),
	:global(td) {
		border: 1px solid var(--bg-color-light);
		padding: 10px;
	}

	/* Main period rows */
	:global(tr:not([class^='sub-']) td:first-child) {
		font-weight: bold;
	}

	/* Sub-period rows (those with dashes) */
	:global(tr[class^='sub-']) :global(td:first-child) {
		padding-left: 30px;
		color: #333;
	}
    
    .empty-content-options {
        position: absolute;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        display: flex;
        width: max-content;
        flex-direction: column;
        gap: 80px;
        z-index: 10;

        .logo-container {
            margin: 0 auto;
            display: flex;

            h1 {
                margin: auto 0;
                font-size: 40px;
                font-weight: 500;
                text-align: center;
                word-wrap: break-word;
                font-family:
                    ui-sans-serif,
                    -apple-system,
                    system-ui,
                    Segoe UI,
                    Helvetica,
                    Apple Color Emoji,
                    Arial,
                    sans-serif,
                    Segoe UI Emoji,
                    Segoe UI Symbol;
            }
        }
    }

    .chat-history {
        position: relative;
        width: 100%;
        height: fit-content;
        padding: 0 50px;
        margin: 100px auto 0px auto;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        gap: 50px;
    }

    .animated-text {
		font-weight: 800; /* High font weight */
		background: linear-gradient(270deg, #1d60c2, #e91e63, #9c27b0, #1d60c2);
		background-size: 400%; /* To ensure smooth animation */
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent; /* Makes text fill color transparent */
		animation: gradient-animation 25s ease infinite; /* Animation */
	}


    @media (max-width: 810px) {
        .empty-content-options {
            left: calc(50%);
            .logo-container {
                width: 90%;
            }
        }
        .chat-history {
            padding: 0 35px 300px 35px;
            transition: all 0.3s ease-in-out;
        }
    }
</style>