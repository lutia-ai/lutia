<script lang="ts">
	import { getFileIconColor } from '$lib/utils/fileHandling';
    import { createEventDispatcher } from 'svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import { getFileIcon } from '$lib/utils/fileHandling';
    
    // Props
    export let name: string;
    export let size: number;
    export let fileExtension: string;
    
    // Event dispatcher
    const dispatch = createEventDispatcher<{
        click: void;
        remove: void;
    }>();
    
    // Computed
    $: formattedSize = formatFileSize(size);
    
    // Event handlers
    function handleClick() {
        dispatch('click');
    }
    
    function handleRemove(event: Event) {
        event.stopPropagation();
        dispatch('remove');
    }
    
    // Utilities
    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
</script>

<div class="file-container">
    <button
        class="file-info"
        tabindex="0"
        on:click|stopPropagation={handleClick}
    >
        <div
            class="file-icon"
            style="background: {getFileIconColor(
                fileExtension
            )}"
        >
            <span class="file-type">{getFileIcon(fileExtension)}</span>
        </div>
        <span class="file-name">{name}</span>
    </button>
    <button 
        class="remove-button" 
        on:click={handleRemove}
        aria-label="Remove image attachment"
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    </button>
</div>

<style lang="scss">
    .file-container {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 160px;
        height: 100%;
        background-color: var(--bg-color);
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        // margin-right: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        overflow: hidden;
        cursor: pointer;
        box-sizing: border-box;

        &:after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.05),
                transparent
            );
            pointer-events: none;
        }

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
            border-color: rgba(29, 96, 194, 0.4);

            .remove-button {
                opacity: 1;
            }
        }

        .file-info {
            display: flex;
            padding: 8px 10px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex: 1;
            overflow: hidden;
            background-color: var(--bg-color);
            border: none;
            cursor: pointer;

            .file-icon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                background: linear-gradient(135deg, #1d60c2, #3a7bd5);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

                .file-type {
                    font-size: 12px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 0.5px;
                }
            }

            .file-name {
                font-size: 11px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 130px;
                text-align: center;
                color: var(--text-color);
            }
        }
    }
    
    .remove-button {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        padding: 0;
        background: rgba(0, 0, 0, 0.15);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color-secondary);
        opacity: 0;
        transition: opacity 0.2s ease, background-color 0.2s ease;
        
        &:hover {
            background: rgba(255, 0, 0, 0.15);
            color: rgb(255, 0, 0);
        }
    }
</style> 