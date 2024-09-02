<script lang="ts">
</script>

<div class="billing-body">
	<div class="balance-container">
		<h1>$10</h1>
		<p>Remaining balance</p>
	</div>
</div>

<style lang="scss">
	.billing-body {
		padding: 20px 0 20px 35px;

		h1,
		p {
			margin: 0;
		}

		.balance-container {
			display: flex;
			flex-direction: column;
			gap: 5px;
			// width: max-content;
			background: var(--bg-color-light-opacity-alt);
			border-radius: 10px;
			padding: 45px 80px;

			h1,
			p {
				margin: 0 auto;
			}

			h1 {
				font-size: 55px;
				font-weight: 400;
			}

			p {
				color: var(--text-color-light);
				font-weight: 400;
				font-size: 16px;
			}
		}
	}
</style>
