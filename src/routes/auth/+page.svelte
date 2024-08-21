<script lang="ts">
	import { page } from '$app/stores';
	import { signIn } from '@auth/sveltekit/client';
	import { fade } from 'svelte/transition';
	import logo from '$lib/images/logos/logo3.png';
	import GoogleIcon from '$lib/components/icons/GoogleBareIcon.svelte';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';

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

	let errorPopup: ErrorPopup;

	const formData = {
		email: '',
		name: '',
		password: '',
		confirmPassword: ''
	};

	let emailExists = false;
	let showPasswordInput = false;
	let showSignup = false;

	let specialCharacter = false;
	let number = false;
	let capital = false;
	let eightChars = false;

	// Function to check if the email exists
	async function checkEmailExists() {
		const data = new FormData();
		data.append('email', formData.email);

		const response = await fetch(`?/checkEmailExists`, {
			method: 'POST',
			body: data
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			if (result.data.isGoogleUser) signIn('google', { callbackUrl: '/' });
			else emailExists = result.data.exists;

			// Show different fields based on email existence
			if (emailExists) {
				showPasswordInput = true;
			} else if (!emailExists && !result.data.isGoogleUser) {
				showSignup = true;
			}
		}
	}

	// Function to log a user in
	async function logIn() {
		signIn('credentials', {
			email: formData.email,
			password: formData.password,
			callbackUrl: '/'
		});
	}

	// Function to register a new user
	async function register() {
		const data = new FormData();
		data.append('email', formData.email);
		data.append('name', formData.name);
		data.append('password', formData.password);
		data.append('confirmPassword', formData.confirmPassword);

		const response = await fetch(`?/register`, {
			method: 'POST',
			body: data
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			signIn('credentials', {
				email: formData.email,
				password: formData.password,
				callbackUrl: '/'
			});
		} else if (result.type === 'failure' && result.data) {
			errorPopup.showError(result.data.message);
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

<ErrorPopup bind:this={errorPopup} />

<div class="body">
	<div class="logo-container">
		<img src={logo} alt="logo" />
		<h1>Lutia</h1>
	</div>
	<div class="divider-container">
		<div class="divider" />
		<h2>Welcome</h2>
		<div class="divider" />
	</div>
	<div class="login-container">
		<form>
			<input type="email" bind:value={formData.email} placeholder="Enter email" required />
			{#if showSignup}
				<input type="text" bind:value={formData.name} placeholder="Enter name" required />
			{/if}
			{#if showPasswordInput || showSignup}
				<input
					type="password"
					bind:value={formData.password}
					placeholder="Enter password"
					required
				/>
			{/if}
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
						<div class="tick-container" style="background: {capital ? 'green' : 'red'}">
							{#if capital}
								<TickIcon color="white" />
							{:else}
								<CrossIcon color="white" />
							{/if}
						</div>
						<p>Capital letter</p>
					</div>
					<div class="item-container">
						<div class="tick-container" style="background: {number ? 'green' : 'red'}">
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
			{#if showSignup}
				<input
					type="password"
					bind:value={formData.confirmPassword}
					placeholder="Confirm password"
					required
				/>
			{/if}

			<button
				type="submit"
				on:click={() => {
					if (!emailExists && !showPasswordInput && !showSignup) checkEmailExists();
					else if (emailExists && !showSignup) logIn();
					else register();
				}}
			>
				Continue
			</button>
		</form>
		<div class="divider-container">
			<div class="divider" />
			<p>Or</p>
			<div class="divider" />
		</div>
		<div
			class="oauth-container"
			tabindex="0"
			role="button"
			on:click|stopPropagation={() => {
				signIn('google', { callbackUrl: '/' });
			}}
			on:keydown|stopPropagation={(e) => {
				if (e.key === 'Enter') {
					signIn('google', { callbackUrl: '/' });
				}
			}}
		>
			<div class="icon-container">
				<GoogleIcon />
			</div>
			<p>Continue with Google</p>
		</div>
	</div>
</div>

<style lang="scss">
	.body {
		position: relative;
		display: flex;
		flex-direction: column;
		margin: auto;

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

		.login-container {
			width: 400px;
			margin: 20px auto;
			padding-bottom: 120px;
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
						}
					}
				}
			}

			.oauth-container {
				display: flex;
				gap: 20px;
				border: 1.5px solid var(--text-color-light-opacity);
				border-radius: 10px;
				padding: 0px 40px;
				box-sizing: border-box;
				width: 100%;
				height: 70px;
				cursor: pointer;

				&:hover {
					background: var(--bg-color-light-opacity);
				}

				.icon-container {
					margin: auto 0;
					width: 30px;
					height: 30px;
				}

				p {
					margin: auto 0;
					font-weight: 400;
					font-family: 'Albert Sans', sans-serif;
				}
			}
		}
	}
</style>
