<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { ApiProvider } from '@prisma/client';
    import type { Model } from '$lib/types/types';
    import { isModelAnthropic, isModelDeepSeek, isModelGoogle, isModelOpenAI, isModelXAI } from '$lib/types/typeGuards';
    
    import ClaudeIcon from '$lib/images/claude.png';
    import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
    import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
    import GrokIcon from '$lib/components/icons/GrokIcon.svelte';
    import DeepSeekIcon from '$lib/components/icons/DeepSeekIcon.svelte';
    
    // Props
    export let filteredModels: { company: ApiProvider; model: Model; formattedName: string }[] = [];
    export let selectedModelIndex: number | null = null;
    export let show: boolean = false;
    
    // Event dispatcher
    const dispatch = createEventDispatcher<{
        selectModel: { company: ApiProvider; model: Model };
        mouseEnter: { index: number };
        mouseLeave: void;
    }>();
    
    // Track DOM references for scrolling into view
    let modelItems: HTMLDivElement[] = [];
    
    // Handle model selection
    function handleSelectModel(company: ApiProvider, model: Model) {
        dispatch('selectModel', { company, model });
    }
    
    // Handle mouse interactions
    function handleMouseEnter(index: number) {
        dispatch('mouseEnter', { index });
    }
    
    function handleMouseLeave() {
        dispatch('mouseLeave');
    }
    
    // Handle keydown for keyboard navigation
    function handleKeydown(e: KeyboardEvent) {
        if (selectedModelIndex === null) {
            selectedModelIndex = 0;
        }
        if (e.key === 'Enter') {
            handleSelectModel(filteredModels[selectedModelIndex].company, filteredModels[selectedModelIndex].model);
        }
        if (e.key === 'ArrowDown') {
            if (selectedModelIndex < filteredModels.length - 1) {
                selectedModelIndex++;
            }
        }
        if (e.key === 'ArrowUp') {
            if (selectedModelIndex === null) {
                selectedModelIndex = filteredModels.length - 1;
            } else if (selectedModelIndex > 0) {
                selectedModelIndex--;
            }
        }
    }
    
    // Scroll selected option into view when selectedModelIndex changes
    $: if (selectedModelIndex !== null && modelItems[selectedModelIndex]) {
        modelItems[selectedModelIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
</script>

{#if show}
    <div class="model-search-container">
        {#each filteredModels as { company, model, formattedName }, index}
            <div
                class="model-search-item"
                class:selected={selectedModelIndex === index}
                role="button"
                tabindex="0"
                on:click={() => handleSelectModel(company, model)}
                on:keydown={handleKeydown}
                on:mouseenter={() => handleMouseEnter(index)}
                on:mouseleave={handleMouseLeave}
                bind:this={modelItems[index]}
            >
                <div class="model-icon">
                    {#if isModelAnthropic(model.name)}
                        <img src={ClaudeIcon} alt="Claude's icon" />
                    {:else if isModelOpenAI(model.name)}
                        <ChatGPTIcon
                            color="var(--text-color)"
                            width="22px"
                            height="22px"
                        />
                    {:else if isModelGoogle(model.name)}
                        <GeminiIcon />
                    {:else if isModelXAI(model.name)}
                        <GrokIcon color="var(--text-color)" />
                    {:else if isModelDeepSeek(model.name)}
                        <DeepSeekIcon />
                    {/if}
                </div>
                <div class="model-info">
                    <span class="model-name">{formattedName}</span>
                    <span class="company-name">{company}</span>
                </div>
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .model-search-container {
        position: absolute;
        bottom: 100%;
        transform: translateY(-10px);
        left: 0;
        width: 100%;
        background: var(--bg-color-light);
        border-radius: 10px;
        box-shadow:
            0 0 #0000,
            0 0 #0000,
            0 9px 9px 0px rgba(0, 0, 0, 0.01),
            0 2px 5px 0px rgba(0, 0, 0, 0.06);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;

        .selected {
            background: var(--bg-color);
        }

        .model-search-item {
            display: flex;
            align-items: center;
            padding: 10px 20px;
            cursor: pointer;
            transition: background 0.2s ease;

            .model-icon {
                width: 20px;
                height: 20px;
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;

                img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
            }

            .model-info {
                display: flex;
                flex-direction: column;

                .model-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-color);
                }

                .company-name {
                    font-size: 12px;
                    color: var(--text-color-light);
                }
            }
        }
    }
</style> 