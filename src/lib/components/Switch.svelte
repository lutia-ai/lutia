<script>
	import { darkMode } from '$lib/stores.js';
	import { createEventDispatcher } from 'svelte';

	export let on = false;

	const dispatch = createEventDispatcher();

	function toggle() {
		on = !on;
		dispatch('toggle', { on });
	}
</script>

<div
	class="switch-container"
	role="button"
	tabindex="0"
	on:click|stopPropagation={toggle}
	on:keydown|stopPropagation={(e) => {
		if (e.key === 'Enter') {
			toggle();
		}
	}}
>
	<div
		class="switch-handle"
		style="
			left: {on ? '75%' : '25%'};
		"
	></div>
</div>

<style lang="scss">
	.switch-container {
		position: relative;
		cursor: pointer;
		display: flex;
		transition: all 0.3s ease;
		height: 15px;
		width: 35px;
		background: var(--text-color-light-opacity);
		border-radius: 10px;

		.switch-handle {
			position: absolute;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			background: var(--text-color);
		}
	}
</style>
