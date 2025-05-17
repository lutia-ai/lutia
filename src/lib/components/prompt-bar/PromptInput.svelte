<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { scrollCursorIntoView } from '$lib/utils/fileHandling';
    
    // Props
    export let prompt: string = '';
    export let placeholderVisible: boolean = true;
    export let placeholder: string = 'Write your prompt here or @mention model';
    
    // Create contenteditable reference
    let inputElement: HTMLDivElement;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Expose focus method to parent
    export function focus() {
        if (inputElement) {
            inputElement.focus();
        }
    }
    
    // Event handlers
    function handleInput(event: Event) {
        // Will be handled by Svelte's bind:innerHTML
        dispatch('input', event);
    }
    
    function handleClick(event: MouseEvent) {
        // Forward to parent for @ handling
        dispatch('click', event);
    }
    
    function handleKeydown(event: KeyboardEvent) {
        // Forward to parent for keyboard shortcuts and model search navigation
        dispatch('keydown', event);
    }
    
    function handlePaste(event: ClipboardEvent) {
        // Forward to parent for paste handling
        dispatch('paste', event);
    }
    
    onMount(() => {
        // Expose element to parent component
        dispatch('ready', { element: inputElement });
    });
</script>

<div class="prompt-input-container">
    <div
        contenteditable
        bind:this={inputElement}
        bind:innerHTML={prompt}
        role="textbox"
        tabindex="0"
        aria-multiline="true"
        aria-label="Message input"
        class="prompt-input"
        on:input={handleInput}
        on:click={handleClick}
        on:keydown={handleKeydown}
        on:paste={handlePaste}
    ></div>
    
    <span
        class="placeholder"
        style="display: {placeholderVisible || prompt === '' ? 'block' : 'none'};"
    >
        {placeholder}
    </span>
</div>

<style lang="scss">
    .prompt-input-container {
        position: relative;
        width: 100%;
    }
    
    .prompt-input {
        max-height: 350px;
        overflow: auto;
        outline: none;
        font-weight: 300;
        padding: 15px 20px;
        margin: 5px 0;
        width: 100%;
        box-sizing: border-box;

        /* Webkit browsers (Chrome, Safari, etc.) */
        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background-color: transparent !important;
        }

        &::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }
    }
    
    .placeholder {
        position: absolute;
        top: 34%;
        left: 20px;
        color: var(--text-color-light);
        font-weight: 300 !important;
        pointer-events: none;
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
</style> 