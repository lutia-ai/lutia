<script>
	export let color;
	export let strokeWidth = '2';
</script>

<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path d="M4 18H10" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" />
	<path d="M4 12L16 12" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" />
	<path d="M4 6L20 6" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" />
</svg>

<style lang="scss">
	svg {
		display: flex;
		margin: auto 0;
		width: 100%;
		height: 100%;
	}
</style>
