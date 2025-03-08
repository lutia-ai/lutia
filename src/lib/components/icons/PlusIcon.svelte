<script>
	export let color;
	export let strokeWidth = 1.2;
</script>

<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	<g id="SVGRepo_bgCarrier" stroke-width="0" />
	<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" />
	<g id="SVGRepo_iconCarrier">
		<path
			d="M4 12H20M12 4V20"
			stroke={color}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
</svg>

<style lang="scss">
	svg {
		display: flex;
		margin: auto 0;
		width: 100%;
		height: 100%;
	}
</style>
