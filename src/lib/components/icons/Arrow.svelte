<script>
	export let color;
</script>

<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path
		d="M6 12H18M18 12L13 7M18 12L13 17"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>

<style lang="scss">
	svg {
		display: flex;
		margin: auto 0;
		width: 100%;
		height: 100%;
	}
</style>
