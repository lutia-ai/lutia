<script>
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
	style="background: {on ? 'var(--text-color-light-opacity)' : 'var(--bg-color-light)'}"
>
	<div
		class="switch-handle"
		style="
			left: {on ? '75%' : '25%'};
			background: {on ? 'var(--text-color)' : 'var(--text-color-light)'};
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
		border-radius: 10px;
		border: 1px solid var(--text-color-light-opacity);

		.switch-handle {
			position: absolute;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			background: var(--text-color);
			transition: left 0.3s ease;
		}
	}
</style>
