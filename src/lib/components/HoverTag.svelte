<script lang="ts">
	export let text: string;
	export let position: 'top' | 'right' | 'bottom' | 'left' = 'top';
</script>

<div class="hover-tag-container {position}">
	<div class="hover-tag">
		{text}
		<div class="arrow"></div>
	</div>
</div>

<style>
	.hover-tag-container {
		position: absolute;
		z-index: 10;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.3s ease,
			visibility 0s linear 0.5s;
		pointer-events: none;
		box-shadow:
			0 0 #0000,
			0 0 #0000,
			0 9px 9px 0px rgba(0, 0, 0, 0.01),
			0 2px 5px 0px rgba(0, 0, 0, 0.06);
	}

	:global(*:hover) > .hover-tag-container {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.3s ease 0.5s,
			visibility 0s linear 0.5s;
	}

	.hover-tag {
		background-color: rgba(0, 0, 0, 1);
		color: white;
		padding: 10px 15px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		pointer-events: none;
		position: relative;
		font-family:
			ui-sans-serif,
			-apple-system,
			system-ui,
			Segoe UI,
			Helvetica,
			Apple Color Emoji,
			Arial,
			sans-serif,
			Segoe UI Emoji,
			Segoe UI Symbol;
	}

	.arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: 6px solid transparent;
	}

	/* Position-specific styles */

	.top {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(-8px);
	}

	.top .arrow {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-bottom-width: 0;
		border-top-color: rgba(0, 0, 0, 0.8);
	}

	.right {
		left: 100%;
		top: 50%;
		transform: translateY(-50%) translateX(8px);
	}

	.right .arrow {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-right-color: rgba(0, 0, 0, 0.8);
		border-left-width: 0;
	}

	.bottom {
		top: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(8px);
	}

	.bottom .arrow {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-top-width: 0;
		border-bottom-color: rgba(0, 0, 0, 0.8);
	}

	.left {
		right: 100%;
		top: 50%;
		transform: translateY(-50%) translateX(-8px);
	}

	.left .arrow {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-left-color: rgba(0, 0, 0, 0.8);
		border-right-width: 0;
	}
</style>
