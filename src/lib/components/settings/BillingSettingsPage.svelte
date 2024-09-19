<script lang="ts">
	import { onMount } from 'svelte';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import {
		loadStripe,
		type Stripe,
		type StripeElements,
		type StripeCardElement
	} from '@stripe/stripe-js';
	import type { CardDetails } from '$lib/types';
	import { env } from '$env/dynamic/public';
	import Topup from '$lib/components/icons/Topup.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import Update from '$lib/components/icons/Update.svelte';
	import CreditCard from '$lib/components/icons/CreditCard.svelte';

	let loading = true;
	let errorPopup: ErrorPopup;
	let userBalance: number = 0;
	let addCreditAmount: number;
	let addCreditOpen: boolean = false;
	let cardDetails: CardDetails;
	let stripe: Stripe | null = null;
	let elements: StripeElements | null = null;
	let card: StripeCardElement | null = null;
	let error: string | null = null;
	let success: boolean = false;
	let showCardInput: boolean = false;

	async function getUsersBillingDetails() {
		try {
			loading = true;
			const response = await fetch('?/getUsersBillingDetails', {
				method: 'POST',
				body: new FormData()
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				userBalance = result.data.balance;
				cardDetails = result.data.cardDetails;
			} else if (result.type === 'failure' && result.data) {
				console.error('Failed to fetch account details');
			}
		} catch (error) {
			console.error('Error clearing chat history:', error);
		} finally {
			loading = false;
		}
	}

	async function handleTopupSubmit() {
		try {
			if (addCreditAmount < 5 || addCreditAmount > 100) {
				let error = 'You can only topup between $5 and $100';
				errorPopup.showError(error, null, 5000);
				return;
			}

			const formData = new FormData();
			formData.append('creditAmount', (addCreditAmount * 1.2).toString());

			const response = await fetch('?/topupBalance', {
				method: 'POST',
				body: formData
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				errorPopup.showError('Top-up successful!', null, 5000, 'success');
				userBalance = result.data.balance;
				addCreditOpen = false;
			} else if (result.type === 'failure' && result.data) {
			}
		} catch (error) {
			console.error('Error clearing chat history:', error);
		}
	}

	async function saveUsersCardDetails() {
		try {
			if (!stripe || !elements || !card) {
				return;
			}

			const { token, error: tokenError } = await stripe.createToken(card);

			if (tokenError) {
				error = tokenError.message || 'An unknown error occurred';
				return;
			}

			const formData = new FormData();
			formData.append('token', token.id);

			const response = await fetch('?/saveUsersCardDetails', {
				method: 'POST',
				body: formData
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				success = true;
				error = null;
				cardDetails = result.data.cardDetails;
				showCardInput = false;
			} else if (result.type === 'failure' && result.data) {
				error = result.data.message || 'Failed to save card';
			}
		} catch (error) {
			console.error('Error clearing chat history:', error);
		}
	}

	function formatCardDetails(details: CardDetails) {
		const bulletPoint = '•'; // Unicode bullet point
		// or use HTML entity: const bulletPoint = '&bull;';
		return `${details.brand.charAt(0).toUpperCase() + details.brand.slice(1)} ${bulletPoint.repeat(4)} ${bulletPoint.repeat(4)} ${bulletPoint.repeat(4)} ${details.last4}`;
	}

	function formatExpiryDate(month: number, year: number) {
		return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
	}

	onMount(async () => {
		await getUsersBillingDetails();
		stripe = await loadStripe(env.PUBLIC_STRIPE_API_KEY);
		elements = stripe!.elements();
		card = elements.create('card', {
			disableLink: true
		});
		card.mount('#card-element');
	});
</script>

<ErrorPopup bind:this={errorPopup} />

<div class="billing-body">
	<div class="balance-container {loading ? 'shimmerBG' : 'container-bg'}">
		{#if !loading}
			<h1>${userBalance.toFixed(2)}</h1>
			<p>Remaining balance</p>
			<div
				class="top-up"
				role="button"
				tabindex="0"
				on:click={() => (addCreditOpen = true)}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') {
						addCreditOpen = true;
					}
				}}
			>
				<div class="icon">
					<Topup color="var(--text-color-light)" />
				</div>
				<p>Top-up</p>
			</div>
		{/if}
	</div>
	{#if addCreditOpen}
		<form class="top-up-open" on:submit|preventDefault={handleTopupSubmit}>
			<div class="left">
				<h1>Add funds</h1>
				<p
					style="color: {(addCreditAmount >= 5 && addCreditAmount <= 100) ||
					addCreditAmount === undefined ||
					addCreditAmount === 0
						? ''
						: 'red'}"
				>
					Enter an amount between $5 and $100
				</p>
				<div class="add-credit-container">
					<p>$</p>
					<input
						name="addCreditAmount"
						bind:value={addCreditAmount}
						type="number"
						min="5"
						max="100"
						step="0.01"
						required
					/>
				</div>
			</div>
			<div class="right">
				<p>Subtotal: ${Number(addCreditAmount || 0).toFixed(2)}</p>
				<p>Taxes: ${(Number(addCreditAmount || 0) * 0.2).toFixed(2)}</p>
				<p>Total: ${(Number(addCreditAmount || 0) * 1.2).toFixed(2)}</p>
			</div>
			<div class="buttons-container">
				<button
					type="button"
					class="close-container"
					on:click={() => {
						addCreditOpen = false;
						addCreditAmount = 0;
					}}
				>
					<CrossIcon color="red" />
				</button>
				<button type="submit" class="purchase" on:click|preventDefault={handleTopupSubmit}>
					Purchase
				</button>
			</div>
		</form>
	{/if}

	<div class="card-body">
		<h1>Card details</h1>
		{#if !showCardInput}
			<div class="card-info {loading ? 'shimmerBG' : 'container-bg'}">
				{#if cardDetails && !showCardInput}
					<div class="title">
						<div class="icon">
							<CreditCard color="var(--text-color-light)" />
						</div>
						<p class="card-number">{formatCardDetails(cardDetails)}</p>
					</div>
					<div class="sub">
						<p class="card-expiry">
							Expires: {formatExpiryDate(cardDetails.expMonth, cardDetails.expYear)}
						</p>
						<div
							class="update"
							role="button"
							tabindex="0"
							on:click={() => (showCardInput = true)}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									showCardInput = true;
								}
							}}
						>
							<div class="icon">
								<Update color="var(--text-color-light)" />
							</div>
							<p>Update</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		{#if !cardDetails && !loading}
			<div
				role="button"
				tabindex="0"
				on:click={() => (showCardInput = true)}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') {
						showCardInput = true;
					}
				}}
			>
				<p class="add-card">Add card</p>
			</div>
		{/if}
		<form
			style="opacity: {showCardInput ? 1 : 0};"
			on:submit|preventDefault={saveUsersCardDetails}
		>
			<div class="card-container">
				<div id="card-element"></div>
			</div>
			{#if error}
				<p class="error">{error}</p>
			{/if}
			{#if success}
				<p class="success">Card saved successfully!</p>
			{/if}
			<button type="submit">Save Card</button>
			{#if cardDetails}
				<button class="cancel" on:click|preventDefault={() => (showCardInput = false)}>
					Cancel
				</button>
			{/if}
		</form>
	</div>
</div>
<!-- svelte-ignore css-unused-selector -->
<style lang="scss">
	.billing-body {
		padding: 20px 0 20px 35px;

		h1,
		p {
			margin: 0;
		}

		.container-bg {
			background: var(--bg-color-light-opacity-alt);
		}

		.balance-container {
			position: relative;
			display: flex;
			flex-direction: column;
			gap: 5px;
			border-radius: 10px;
			padding: 45px 80px;
			min-height: 85px;

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

			.top-up {
				position: absolute;
				display: flex;
				gap: 7px;
				bottom: 20px;
				right: 25px;
				cursor: pointer;

				.icon {
					width: 20px;
					height: 20px;
				}

				&:hover {
					p {
						text-decoration: underline;
					}
				}
			}
		}

		.top-up-open {
			position: relative;
			display: flex;
			gap: 10px;
			margin-top: 10px;
			border-radius: 10px;
			box-sizing: border-box;
			width: 100%;
			padding: 10px;
			background: var(--text-color-light);

			h1 {
				color: var(--bg-color-light);
				font-size: 20px;
				font-weight: 400;
			}

			p {
				color: var(--bg-color-dark);
				font-size: 12px;
				font-weight: 300;
			}

			.left {
				display: flex;
				flex-direction: column;
				gap: 10px;
				padding-right: 20px;
				border-right: 1px solid var(--bg-color-light-opacity);

				.add-credit-container {
					display: flex;
					gap: 1px;
					background: var(--bg-color-light);
					border-radius: 5px;
					padding: 5px;

					p {
						color: var(--text-color-light);
						margin: auto 0;
						font-size: 20px;
					}

					input {
						position: relative;
						width: 100%;
						border: none;
						box-sizing: border-box;
						outline: none;
						font-size: 20px;
						color: var(--text-color-light);
						background: transparent;
					}

					input[type='number'] {
						-moz-appearance: textfield;
						appearance: textfield;
					}

					input[type='number']::-webkit-inner-spin-button,
					input[type='number']::-webkit-outer-spin-button {
						-webkit-appearance: none;
						margin: 0;
					}
				}
			}

			.right {
				margin: auto 0 auto auto;
				display: flex;
				flex-direction: column;
				gap: 18px;

				p {
					font-size: 14px;
					text-align: right;
				}
			}

			.buttons-container {
				display: flex;
				flex-direction: column;

				.close-container {
					margin-left: auto;
					width: 35px;
					height: 35px;
					padding: 0;
					background: transparent;
					border: none;
					cursor: pointer;
					border-radius: 5px;

					&:hover {
						background: var(--text-color-hover);
					}
				}

				.purchase {
					margin: auto 0 0 20px;
					background-color: #4caf50;
					color: white;
					padding: 10px 15px;
					border-radius: 5px;
					font-weight: 600;
					font-size: 16px;
					border: none;
					cursor: pointer;
				}
			}
		}

		.card-body {
			margin: 20px 0;

			h1 {
				font-size: 20px;
				font-weight: 400;
				color: var(--text-color-light-opacity);
				margin: 0;
			}

			.card-info {
				padding: 20px;
				border-radius: 4px;
				margin: 20px 0;
				display: flex;
				flex-direction: column;
				gap: 10px;
				min-height: 70px;

				.title {
					display: flex;
					gap: 10px;

					.icon {
						width: 30px;
						height: 30px;
					}

					.card-number {
						margin: auto 0;
						font-size: 18px;
						font-weight: bold;
						color: var(--text-color-light);
					}
				}

				.sub {
					display: flex;

					.card-expiry {
						font-size: 14px;
						color: var(--text-color-light-opacity);
						margin: auto 0;
					}

					.update {
						margin-left: auto;
						cursor: pointer;
						display: flex;
						gap: 5px;
						padding: 5px;
						border-radius: 5px;

						.icon {
							width: 20px;
							height: 20px;
						}

						p {
							color: var(--text-color-light);
							margin: auto 0;
						}

						&:hover {
							p {
								text-decoration: underline;
							}
						}
					}
				}

				p {
					margin: 0;
				}
			}

			.add-card {
				color: rgb(0, 85, 255);
				cursor: pointer;
				margin: 10px 0;
			}

			.card-container {
				background: var(--bg-color-light-opacity-alt);
				padding: 20px;
				border-radius: 4px;
				margin: 20px 0;
			}
            
			#card-element {
				padding: 10px;
			}

			/* Style for the iframe Stripe injects */
			#card-element iframe {
				height: 40px !important;
			}

			/* Customize the input fields */
			.StripeElement {
				background-color: white;
				padding: 10px 12px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				transition: box-shadow 150ms ease;
			}

			.StripeElement--focus {
				box-shadow: 0 1px 3px 0 #cfd7df;
			}

			.StripeElement--invalid {
				border-color: #fa755a;
			}

			.StripeElement--webkit-autofill {
				background-color: #fefde5 !important;
			}

			.error {
				color: #fa755a;
			}

			.success {
				color: #3c763d;
			}

			button {
				background-color: #4caf50;
				border: none;
				color: white;
				padding: 15px 32px;
				text-align: center;
				text-decoration: none;
				display: inline-block;
				font-size: 16px;
				margin: 4px 2px;
				cursor: pointer;
				border-radius: 4px;

				&:hover {
					background-color: #45a049;
				}
			}

			.cancel {
				background-color: #d31a1a;

				&:hover {
					background-color: #c61818;
				}
			}
		}
	}

	.shimmerBG {
		animation-duration: 2.2s;
		animation-fill-mode: forwards;
		animation-iteration-count: infinite;
		animation-name: shimmer;
		animation-timing-function: linear;
		background: var(--bg-color-light-opacity-alt);
		background: linear-gradient(
			to right,
			var(--bg-color-light-opacity-alt) 8%,
			#f0f0f0 18%,
			var(--bg-color-light-opacity-alt) 33%
		);
		background-size: 1200px 100%;
	}

	@-webkit-keyframes shimmer {
		0% {
			background-position: -100% 0;
		}
		100% {
			background-position: 100% 0;
		}
	}

	@keyframes shimmer {
		0% {
			background-position: -1200px 0;
		}
		100% {
			background-position: 1200px 0;
		}
	}
</style>
