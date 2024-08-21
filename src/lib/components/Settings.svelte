<script lang="ts">
    import CrossIcon from '$lib/components/icons/CrossIcon.svelte';

    export let isOpen: boolean;
	
    // @ts-ignore
	const wheel = (node: HTMLElement, options) => {
		let { scrollable } = options;
        
        // @ts-ignore
		const handler = e => {
			if (!scrollable) e.preventDefault();
		};
		
		node.addEventListener('wheel', handler, { passive: false });
		
		return {
            // @ts-ignore
			update(options) {
				scrollable = options.scrollable;
			},
			destroy() {
                // @ts-ignore
				node.removeEventListener('wheel', handler, { passive: false });
			}
		};
  };
    
</script>

<svelte:window use:wheel={{isOpen}} />

<div class="settings-container">
    <div class="settings-body">

        <div class="title-container">
            <h1>Settings</h1>
            <button on:click={() => isOpen = false} >
                <CrossIcon color="var(--text-color)" />
            </button>
        </div>
        
    </div>
</div>

<style lang="scss">

    .settings-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        z-index: 100000;
        background-color: rgba(0,0,0,0.5);
        overflow: hidden;

        .settings-body {
            background: var(--bg-color-light);
            width: 1200px;
            height: 800px;
            margin: auto;
            border-radius: 10px;
            padding: 40px;
            box-sizing: border-box;

            .title-container {
                display: flex;

                h1 {
                    margin: auto 0;
                }

                button {
                    background: transparent;
                    border: none;
                    width: 40px;
                    height: 40px;
                    margin-left: auto;
                    cursor: pointer;
                    border-radius: 10px;
                    padding: 0;

                    &:hover {
                        background: var(--text-color-light-opacity);
                    }
                }
            }
        }
    }
</style>