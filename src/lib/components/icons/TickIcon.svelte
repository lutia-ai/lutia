<script>
	export let color;
	export let strokeWidth = 2;
</script>

<svg
	width="100%"
	height="100%"
	viewBox="0 -0.5 25 25"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M5.5 12.5L10.167 17L19.5 8"
		stroke={color}
		stroke-width={strokeWidth}
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
