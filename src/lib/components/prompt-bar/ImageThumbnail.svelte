<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Props
	export let src: string;
	export let alt: string = 'Image attachment';

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		click: void;
		remove: void;
	}>();

	// Event handlers
	function handleClick() {
		dispatch('click');
	}

	function handleRemove(event: Event) {
		event.stopPropagation();
		dispatch('remove');
	}
</script>

<div class="image-thumbnail">
	<button class="thumbnail-button" on:click={handleClick} aria-label="View image attachment">
		<img {src} {alt} />
	</button>
	<button class="remove-button" on:click={handleRemove} aria-label="Remove image attachment">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>
	</button>
</div>

<style lang="scss">
	.image-thumbnail {
		position: relative;
		max-width: 160px;
		height: 80px;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s ease;

		&:hover {
			transform: translateY(-2px);

			.remove-button {
				opacity: 1;
			}
		}
	}

	.thumbnail-button {
		width: 100%;
		height: 100%;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.remove-button {
		position: absolute;
		padding: 0;
		top: 5px;
		right: 5px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: white;
		opacity: 0;
		transition:
			opacity 0.2s ease,
			background-color 0.2s ease;

		&:hover {
			background: rgba(255, 0, 0, 0.8);
		}
	}
</style>
