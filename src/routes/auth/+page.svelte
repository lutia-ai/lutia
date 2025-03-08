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
	import { goto } from '$app/navigation';
	import EyeIcon from '$lib/components/icons/EyeIcon.svelte';
	import EyeOffIcon from '$lib/components/icons/EyeOffIcon.svelte';

	$: {
		const errorParam = $page.url.searchParams.get('error');
		const codeParam = $page.url.searchParams.get('code');
		if ((errorParam || codeParam) && errorPopup) {
			if (errorParam === 'ExistingNonOAuthUser') {
				const errorMessage = 'An account with this email already exists.';
				const subMessage =
					"If you'd like to link your Google account, please sign in with your password first and then link your account in settings.";
				errorPopup.showError(errorMessage, subMessage, 7000);
			} else if (errorParam === 'CredentialsSignin' && codeParam?.startsWith('unverified_')) {
				const [prefix, email] = codeParam.split('_', 2);
				verifyEmail = email;
				const errorMessage = 'Please verify your email';
				showVerifyEmail = true;
				errorPopup.showError(errorMessage);
			} else if (errorParam === 'CredentialsSignin') {
				const errorMessage = 'Email or password is incorrect.';
				errorPopup.showError(errorMessage);
			}
		}
	}

	let errorPopup: ErrorPopup;

	let formData: HTMLFormElement;

	let passwordVisible = false;
	let emailExists = false;
	let showPasswordInput = false;
	let showSignup = false;
	let showVerifyEmail = false;
	let verifyEmail: string;

	let specialCharacter = false;
	let number = false;
	let capital = false;
	let eightChars = false;
	let passwordLength = 0;

	const emailTokenArray: Array<null | number> = [null, null, null, null, null, null];

	// Function to check if the email exists
	async function checkEmailExists() {
		const formDataTemp = new FormData(formData);
		const email = (formDataTemp.get('email') as string).toLowerCase();

		const data = new FormData();
		data.append('email', email);

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
		const formDataTemp = new FormData(formData);

		await signIn('credentials', {
			email: (formDataTemp.get('email') as string).toLowerCase(),
			password: formDataTemp.get('password') as string,
			callbackUrl: '/'
		});
	}

	// Function to register a new user
	async function register() {
		const formDataTemp = new FormData(formData);
		formDataTemp.set('email', (formDataTemp.get('email') as string).toLowerCase());

		const response = await fetch(`?/register`, {
			method: 'POST',
			body: formDataTemp
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			const formDataTemp = new FormData(formData);
			signIn('credentials', {
				email: formDataTemp.get('email') as string,
				password: formDataTemp.get('password') as string,
				callbackUrl: '/'
			});
		} else if (result.type === 'failure' && result.data) {
			errorPopup.showError(result.data.message);
		}
	}

	// Function to check for special characters
	function hasSpecialCharacter(): boolean {
		const formDataTemp = new FormData(formData);
		const password = formDataTemp.get('password') as string;
		return /[!@#$%^&*(),.?":{}|<>]/.test(password);
	}

	// Function to check for a capital letter
	function hasCapitalLetter(): boolean {
		const formDataTemp = new FormData(formData);
		const password = formDataTemp.get('password') as string;
		return /[A-Z]/.test(password);
	}

	// Function to check for a number
	function hasNumber(): boolean {
		const formDataTemp = new FormData(formData);
		const password = formDataTemp.get('password') as string;
		return /[0-9]/.test(password);
	}

	function getPasswordLength(): number {
		const formDataTemp = new FormData(formData);
		const password = formDataTemp.get('password') as string;
		if (!password) return 0;
		return password.length;
	}

	function handleVerificationInput(index: number) {
		// Automatically focus the next input field if a single digit has been entered
		if (emailTokenArray[index] && index < emailTokenArray.length - 1) {
			const nextInput = document.querySelector<HTMLInputElement>(`#input-${index + 1}`);
			if (nextInput) {
				nextInput.focus();
			}
		}
	}

	async function handleVerifyEmailToken() {
		const data = new FormData();
		data.append('email', verifyEmail.toLowerCase());
		data.append('emailToken', emailTokenArray.join(''));

		const response = await fetch(`?/verifyEmailToken`, {
			method: 'POST',
			body: data
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			errorPopup.showError(result.data.message, null, 5000, 'success');
			goto('/');
		} else if (result.type === 'failure' && result.data) {
			errorPopup.showError(result.data.message);
		}
	}
</script>

<svelte:head>
	<title>Signup & Login | Lutia</title>
</svelte:head>

<ErrorPopup bind:this={errorPopup} />

<div class="body">
	<div class="logo-container">
		<img src={logo} alt="logo" />
		<h1>Lutia</h1>
	</div>
	<div class="divider-container">
		<div class="divider" />
		<h2>{showVerifyEmail ? 'Verify email' : 'Welcome'}</h2>
		<div class="divider" />
	</div>
	<div class="login-container">
		{#if !showVerifyEmail}
			<form
				bind:this={formData}
				on:submit|preventDefault={() => {
					if (!emailExists && !showPasswordInput && !showSignup) checkEmailExists();
					else if (emailExists && !showSignup) logIn();
					else register();
				}}
				on:input|preventDefault={() => {
					specialCharacter = hasSpecialCharacter();
					capital = hasCapitalLetter();
					number = hasNumber();
					eightChars = getPasswordLength() >= 8;
					passwordLength = getPasswordLength();
				}}
			>
				<input name="email" type="email" placeholder="Enter email" required />
				{#if showSignup}
					<input name="name" type="text" placeholder="Enter name" required />
				{/if}
				{#if showPasswordInput || showSignup}
					<div class="password-container">
						<input
							name="password"
							type={passwordVisible ? 'text' : 'password'}
							placeholder="Enter password"
							required
						/>
						{#if passwordLength > 0}
							<div
								role="button"
								tabindex="0"
								class="eye-button"
								on:click={() => (passwordVisible = !passwordVisible)}
								on:keypress={(e) => {
									if (e.key === 'Enter') {
										passwordVisible = !passwordVisible;
									}
								}}
							>
								{#if passwordVisible}
									<EyeOffIcon color="var(--text-color-light)" />
								{:else}
									<EyeIcon color="var(--text-color-light)" />
								{/if}
							</div>
						{/if}
					</div>
				{/if}
				{#if showSignup && getPasswordLength() > 0 && !(eightChars && specialCharacter && capital && number)}
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
				{#if showSignup}
					<div class="password-container">
						<input
							name="confirmPassword"
							type={passwordVisible ? 'text' : 'password'}
							placeholder="Confirm password"
							required
						/>
						{#if passwordLength > 0}
							<div
								role="button"
								tabindex="0"
								class="eye-button"
								on:click={() => (passwordVisible = !passwordVisible)}
								on:keypress={(e) => {
									if (e.key === 'Enter') {
										passwordVisible = !passwordVisible;
									}
								}}
							>
								{#if passwordVisible}
									<EyeOffIcon color="var(--text-color-light)" />
								{:else}
									<EyeIcon color="var(--text-color-light)" />
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<button type="submit"> Continue </button>
			</form>
			{#if showPasswordInput}
				<div class="links-container">
					<div
						class="link"
						tabindex="0"
						role="button"
						on:click|stopPropagation={() => {
							goto('/auth/reset-password');
						}}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								goto('/auth/reset-password');
							}
						}}
					>
						<p>Forgot password?</p>
					</div>
					<div
						class="link right"
						tabindex="0"
						role="button"
						on:click|stopPropagation={() => {
							showPasswordInput = false;
							showSignup = true;
						}}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								showPasswordInput = false;
								showSignup = true;
							}
						}}
					>
						<p>Signup</p>
					</div>
				</div>
			{/if}
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
		{:else}
			<p class="email-token-text">
				A verification code has been sent to your email. Please enter it below to complete
				your registration.
			</p>
			<div class="email-token-container">
				{#each emailTokenArray as number, index}
					<input
						class="input-box"
						id="input-{index}"
						type="tel"
						maxlength="1"
						bind:value={emailTokenArray[index]}
						on:input={() => handleVerificationInput(index)}
					/>
				{/each}
			</div>
			<button
				type="submit"
				on:click={() => {
					handleVerifyEmailToken();
				}}
			>
				Verify
			</button>
		{/if}
	</div>
</div>

<style lang="scss">
	.body {
		position: relative;
		display: flex;
		flex-direction: column;
		margin: auto;
		padding: 0 0 60px 0;
		box-sizing: border-box;

		.logo-container {
			margin: 0 auto 40px auto;
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

			.right {
				margin-left: auto;
			}
		}

		.login-container {
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

				.password-container {
					position: relative;

					.eye-button {
						position: absolute;
						right: 10px;
						top: 50%;
						transform: translate(0, -50%);
						width: 20px;
						height: 20px;
						cursor: pointer;
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
							font-size: 14px;
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

			.email-token-text {
				width: 350px;
				text-wrap: wrap;
				color: var(--text-color-light);
				margin: 0;
			}

			.email-token-container {
				display: flex;
				justify-content: center;
				align-items: center;
				gap: 10px;
				margin: 40px;

				.input-box {
					width: 38px;
					height: 38px;
					padding: 4px;
					text-align: center;
					font-size: 24px;
					border: 2px solid #ccc;
					border-radius: 10px;

					&:focus {
						border-color: #42a5f5;
						outline: none;
					}
				}
			}

			button {
				border: 1.5px solid var(--text-color-light-opacity);
				border-radius: 10px;
				padding: 0px 40px;
				box-sizing: border-box;
				width: 100%;
				height: 60px;
				color: var(--text-color);
				font-size: 16px;
				background: #0094cd;
				color: white;
				cursor: pointer;

				&:hover {
					background: #0093cdc0;
				}
			}
		}
	}
</style>
