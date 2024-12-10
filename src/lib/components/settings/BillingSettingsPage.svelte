<script lang="ts">
	import { onMount } from 'svelte';
	import { darkMode } from '$lib/stores.ts';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import {
		loadStripe,
		type Stripe,
		type StripeElements,
		type StripeCardElement
	} from '@stripe/stripe-js';
	import type { CardDetails, UserWithSettings } from '$lib/types';
	import { env } from '$env/dynamic/public';
	import Topup from '$lib/components/icons/Topup.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import Update from '$lib/components/icons/Update.svelte';
	import CreditCard from '$lib/components/icons/CreditCard.svelte';
	import BinIcon from '$lib/components/icons/BinIcon.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import LoadingSpinner from '$lib/components/icons/LoadingSpinner.svelte';

	// this doesn't get used but is still passed as a prop from Settings.svelte
	export let user: UserWithSettings;

	let loading = true;
	let errorPopup: ErrorPopup;
	let userBalance: number = 0;
	let addCreditAmount: number;
	let addCreditOpen: boolean = false;
	let cardDetails: CardDetails | undefined;
	let stripe: Stripe | null = null;
	let elements: StripeElements | null = null;
	let card: StripeCardElement | null = null;
	let error: string | null = null;
	let showCardInput: boolean = false;
	let showDeleteCardDetailsCheck: boolean = false;
	let deleteCardLoading: boolean = false;
	let uploadCardLoading: boolean = false;
	let topupLoading: boolean = false;

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
			console.error('Error getting users billing details:', error);
		} finally {
			loading = false;
		}
	}

	async function handleTopupSubmit() {
		try {
			topupLoading = true;
			if (addCreditAmount < 5 || addCreditAmount > 100) {
				let error = 'You can only topup between $5 and $100';
				errorPopup.showError(error, null, 5000);
				return;
			}

			const formData = new FormData();
			formData.append('creditAmount', addCreditAmount.toString());

			const response = await fetch('?/topupBalance', {
				method: 'POST',
				body: formData
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				errorPopup.showError('Top-up successful!', null, 5000, 'success');
				userBalance = result.data.balance;
				console.log(result.data.balance);
				addCreditOpen = false;
				addCreditAmount = 0;
			} else if (result.type === 'failure' && result.data) {
				errorPopup.showError(result.data.message, null, 5000);
			}
		} catch (error) {
			console.error('Error topping up:', error);
		} finally {
			topupLoading = false;
		}
	}

	async function handleDeleteCardDetails() {
		try {
			deleteCardLoading = true;
			const formData = new FormData();
			const response = await fetch('?/deleteCardDetails', {
				method: 'POST',
				body: formData
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success') {
				cardDetails = undefined;
				showDeleteCardDetailsCheck = false;
			} else if (result.type === 'failure' && result.data) {
				errorPopup.showError(result.data.message, null, 5000);
			}
		} catch (error) {
			console.error('Error deleting card details:', error);
		} finally {
			deleteCardLoading = false;
		}
	}

	async function saveUsersCardDetails() {
		try {
			uploadCardLoading = true;
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
				error = null;
				cardDetails = result.data.cardDetails;
				showCardInput = false;
			} else if (result.type === 'failure' && result.data) {
				error = result.data.message || 'Failed to save card';
			}
		} catch (error) {
			console.error('Error saving card details:', error);
		} finally {
			uploadCardLoading = false;
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
			disableLink: true,
			style: {
				base: {
					iconColor: $darkMode ? '#fff' : 'black',
					color: $darkMode ? '#fff' : 'black',
					fontWeight: '500',
					fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
					fontSize: '18px',
					fontSmoothing: 'antialiased',
					':-webkit-autofill': {
						color: '#fce883'
					},
					'::placeholder': {
						color: $darkMode ? '#fff' : 'black'
					}
				},
				invalid: {
					iconColor: '#FFC7EE',
					color: '#FFC7EE'
				}
			}
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

				{#if topupLoading}
					<div class="icon">
						<LoadingSpinner color="rgb(105,105,255)" />
					</div>
				{:else}
					<button
						type="submit"
						class="purchase"
						on:click|preventDefault={handleTopupSubmit}
					>
						Purchase
					</button>
				{/if}
			</div>
		</form>
	{/if}

	<div class="card-body">
		<h1>Card details</h1>
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
						style="margin-left: auto;"
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
					<div
						class="remove"
						role="button"
						tabindex="0"
						on:click={() => (showDeleteCardDetailsCheck = true)}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								showDeleteCardDetailsCheck = true;
							}
						}}
					>
						<div class="icon">
							<BinIcon color="var(--text-color-light)" />
						</div>
						<p>Remove</p>
					</div>
				</div>
			{/if}
			<form
				style="display: {showCardInput ? 'block' : 'none'};"
				on:submit|preventDefault={saveUsersCardDetails}
			>
				<div class="card-container">
					<div id="card-element"></div>
				</div>
				{#if error}
					<p class="error">{error}</p>
				{/if}
				<div class="buttons">
					<button type="submit">Save Card</button>
					<button class="cancel" on:click|preventDefault={() => (showCardInput = false)}>
						Cancel
					</button>
					{#if uploadCardLoading}
						<div class="icon">
							<LoadingSpinner color="rgb(105,105,255)" />
						</div>
					{/if}
				</div>
			</form>
			{#if !cardDetails && !loading && !showCardInput}
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
		</div>
		{#if showDeleteCardDetailsCheck}
			<div class="delete banner">
				<div class="text">
					<h1>Are you sure?</h1>
					<p>This will permanently delete your card details.</p>
				</div>
				<div class="buttons">
					{#if !deleteCardLoading}
						<div
							class="icon"
							role="button"
							tabindex="0"
							on:click={() => handleDeleteCardDetails()}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									handleDeleteCardDetails();
								}
							}}
						>
							<TickIcon color="rgb(250, 250, 250)" />
						</div>
						<div
							class="icon"
							role="button"
							tabindex="0"
							on:click={() => (showDeleteCardDetailsCheck = false)}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									showDeleteCardDetailsCheck = false;
								}
							}}
						>
							<CrossIcon color="rgb(250, 250, 250)" />
						</div>
					{:else}
						<div class="icon" style="margin: auto 0;">
							<LoadingSpinner color="rgb(250,250,250)" />
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- svelte-ignore css-unused-selector -->
<style lang="scss">
	.billing-body {
		padding: 20px 0 20px 35px;
		position: relative;
		width: 100%;
		height: 100%;
		overflow-y: scroll !important;
		// padding: 0 20px;
		// padding-bottom: 40px;
		box-sizing: border-box;

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
				min-width: 125px;

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

				.icon {
					width: 35px;
					height: 35px;
					margin: auto 0 0 auto;
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

					.update,
					.remove {
						cursor: pointer;
						display: flex;
						gap: 5px;
						padding: 5px;
						border-radius: 5px;
						margin-left: 10px;

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
				color: var(--text-color-light);
				cursor: pointer;
				margin: auto 0;
				text-align: center;
				vertical-align: auto;
				font-size: 20px;
				font-weight: 600;
				width: 100%;
				height: 100%;
				border-radius: 4px;
				padding: 25px 0;

				&:hover {
					background: var(--bg-color-light);
				}
			}

			.card-container {
				background: var(--bg-color);
				padding: 10px;
				border-radius: 4px;
				margin: 10px 0;
			}

			.buttons {
				display: flex;
				gap: 5px;
				width: 100%;

				.icon {
					margin: auto 0 auto auto;
					width: 38px;
					height: 38px;
				}
			}

			.delete {
				background: rgb(240, 0, 0);

				h1 {
					color: white;
					font-size: 22px;
					font-weight: 600;
					margin-bottom: 5px;
				}

				p {
					font-weight: 300;
					color: white;
				}
			}

			.banner {
				display: flex;
				border-radius: 4px;
				padding: 10px 20px;

				.buttons {
					display: flex;
					margin: auto 0 auto auto;
					gap: 10px;
					width: max-content;

					.icon {
						margin: 0;
						width: 30px;
						height: 30px;
						border-radius: 4px;
						cursor: pointer;

						&:hover {
							outline: 1px solid white;
						}
					}
				}
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

	/* Scrollbar track */
	::-webkit-scrollbar {
		width: 10px;
	}

	/* Scrollbar handle */
	::-webkit-scrollbar-thumb {
		background-color: #888;
		border-radius: 6px;
	}

	/* Scrollbar track background */
	::-webkit-scrollbar-track {
		background-color: var(--bg-color-light);
	}

	@media (max-width: 810px) {
		.billing-body {
			height: calc(100% - 65px);
			padding: 10px 0;
		}
	}
</style>
