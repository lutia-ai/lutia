<script lang="ts">
	import logo from '$lib/images/logos/logo3.png';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import { page } from '$app/stores';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';

	export let data: any;

	let errorPopup: ErrorPopup;

	const formData = {
		password: '',
		confirmPassword: ''
	};

	let buttonActive = true;
	let specialCharacter = false;
	let number = false;
	let capital = false;
	let eightChars = false;

	$: {
		const errorParam = $page.url.searchParams.get('error');
		if (errorParam && errorPopup) {
			if (errorParam === 'ExistingNonOAuthUser') {
				const errorMessage = 'An account with this email already exists.';
				const subMessage =
					"If you'd like to link your Google account, please sign in with your password first and then link your account in settings.";
				errorPopup.showError(errorMessage, subMessage, 7000);
			}
			if (errorParam === 'CredentialsSignin') {
				const errorMessage = 'Email or password is incorrect.';
				errorPopup.showError(errorMessage);
			}
		}
	}

	// Function to register a new user
	async function resetPassword() {
		buttonActive = false;

		if (formData.password !== formData.confirmPassword) {
			errorPopup.showError("Passwords don't match");
			buttonActive = true;
			return;
		}

		const fData = new FormData();
		fData.append('password', formData.password);
		fData.append('user_id', data.userId);

		const response = await fetch(`?/resetPassword`, {
			method: 'POST',
			body: fData
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			errorPopup.showError(result.data.message, null, 5000, 'success');
		} else if (result.type === 'failure' && result.data) {
			errorPopup.showError(result.data.message);
			buttonActive = true;
		}
	}

	// Function to check for special characters
	function hasSpecialCharacter(password: string): boolean {
		return /[!@#$%^&*(),.?":{}|<>]/.test(password);
	}

	// Function to check for a capital letter
	function hasCapitalLetter(password: string): boolean {
		return /[A-Z]/.test(password);
	}

	// Function to check for a number
	function hasNumber(password: string): boolean {
		return /[0-9]/.test(password);
	}

	$: specialCharacter = hasSpecialCharacter(formData.password);
	$: capital = hasCapitalLetter(formData.password);
	$: number = hasNumber(formData.password);
	$: eightChars = formData.password.length >= 8;
</script>

<svelte:head>
	<title>Reset password | Lutia</title>
</svelte:head>

<ErrorPopup bind:this={errorPopup} />

{#if data.success}
	<div class="body">
		<div class="logo-container">
			<img src={logo} alt="logo" />
			<h1>Lutia</h1>
		</div>
		<div class="divider-container">
			<div class="divider" />
			<h2>Reset password</h2>
			<div class="divider" />
		</div>
		<p>Enter a new password to finish the password reset process.</p>
		<div class="login-container">
			<form>
				<input
					type="password"
					bind:value={formData.password}
					placeholder="Enter new password"
					required
				/>
				{#if formData.password.length > 0 && !(eightChars && specialCharacter && capital && number)}
					<div class="password-checks-container" transition:fade={{ duration: 500 }}>
						<div class="item-container">
							<div
								class="tick-container"
								style="background: {eightChars ? 'green' : 'red'}"
							>
								{#if eightChars}
									<TickIcon color="white" />
								{:else}
									<CrossIcon color="white" />
								{/if}
							</div>
							<p>Minimum 8 characters</p>
						</div>
						<div class="item-container">
							<div
								class="tick-container"
								style="background: {specialCharacter ? 'green' : 'red'}"
							>
								{#if specialCharacter}
									<TickIcon color="white" />
								{:else}
									<CrossIcon color="white" />
								{/if}
							</div>
							<p>Special character</p>
						</div>
						<div class="item-container">
							<div
								class="tick-container"
								style="background: {capital ? 'green' : 'red'}"
							>
								{#if capital}
									<TickIcon color="white" />
								{:else}
									<CrossIcon color="white" />
								{/if}
							</div>
							<p>Capital letter</p>
						</div>
						<div class="item-container">
							<div
								class="tick-container"
								style="background: {number ? 'green' : 'red'}"
							>
								{#if number}
									<TickIcon color="white" />
								{:else}
									<CrossIcon color="white" />
								{/if}
							</div>
							<p>Number</p>
						</div>
					</div>
				{/if}
				<input
					type="password"
					bind:value={formData.confirmPassword}
					placeholder="Confirm password"
					required
				/>
				<button
					type="submit"
					style="
                        background-color: {buttonActive ? '' : '#0093cdc0'};
                        cursor: {buttonActive ? '' : 'not-allowed'}
                    "
					on:click={() => {
						if (buttonActive) resetPassword();
					}}
				>
					Continue
				</button>
			</form>
			<div class="links-container">
				<div
					class="link"
					tabindex="0"
					role="button"
					on:click|stopPropagation={() => {
						goto('/auth');
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							goto('/auth');
						}
					}}
				>
					<p>Login</p>
				</div>
			</div>
		</div>
	</div>
{:else}
	<h1>Error: unable to verify reset token</h1>
{/if}

<style lang="scss">
	.body {
		position: relative;
		display: flex;
		flex-direction: column;
		margin: auto;
		padding: 60px 0;
		box-sizing: border-box;

		p {
			width: 350px;
			text-wrap: wrap;
			color: var(--text-color-light);
			margin: 0;
		}

		.logo-container {
			margin: 0 auto 50px auto;
			display: flex;

			img {
				width: 100px;
				height: 100px;
			}

			h1 {
				margin: auto;
				font-size: 40px;
				font-weight: 500;
			}
		}

		.divider-container {
			display: flex;
			gap: 25px;

			h2,
			p {
				margin: auto;
				font-weight: 300;
				font-size: 30px;
				font-family: 'Albert Sans', sans-serif;
				color: var(--text-color);
				text-wrap: nowrap;
			}

			p {
				font-size: 16px;
			}
		}

		.divider {
			height: 1px;
			width: 100%;
			background: var(--text-color-light-opacity);
			margin: 40px 0;
		}

		.links-container {
			display: flex;
			margin: 30px 0 0 0;

			.link {
				cursor: pointer;

				p {
					margin: 0;
					color: #0094cd;
					font-size: 16px;

					&:hover {
						text-decoration: underline;
					}
				}
			}
		}

		.login-container {
			position: relative;
			width: 350px;
			margin: 20px auto;
			font-family: 'Albert Sans', sans-serif;

			form {
				display: flex;
				flex-direction: column;
				gap: 20px;
				input,
				button {
					background: transparent;
					border: 1.5px solid var(--text-color-light-opacity);
					border-radius: 10px;
					padding: 0px 40px;
					box-sizing: border-box;
					width: 100%;
					height: 60px;
					color: var(--text-color);
					font-size: 16px;
				}

				input:focus {
					outline-color: #0094cd;
				}

				input::placeholder {
					color: var(--text-color); /* Change this to your desired color */
					opacity: 1; /* Needed for some browsers */
				}

				button {
					background: #0094cd;
					color: white;
					cursor: pointer;

					&:hover {
						background: #0093cdc0;
					}
				}

				.password-checks-container {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 10px;

					.item-container {
						width: max-content;
						position: relative;
						display: flex;
						gap: 10px;

						.tick-container {
							background: green;
							padding: 2px;
							box-sizing: border-box;
							width: 20px;
							height: 20px;
							border-radius: 50%;
						}

						p {
							margin: 0;
							font-size: 14px;
							width: max-content;
						}
					}
				}
			}
		}
	}
</style>
