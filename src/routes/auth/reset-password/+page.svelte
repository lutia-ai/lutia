<script lang="ts">
	import logo from '$lib/images/logos/logo3.png';
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import ErrorPopup from '$lib/components/notifications/ErrorPopup.svelte';
	import { page } from '$app/stores';

	let errorPopup: ErrorPopup;

	const formData = {
		email: ''
	};

	let buttonActive = true;
	let isLoading = false;

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
		isLoading = true;
		document.body.style.cursor = 'wait';
		const data = new FormData();
		data.append('email', formData.email);

		const response = await fetch(`?/resetPassword`, {
			method: 'POST',
			body: data
		});

		const result: ActionResult = deserialize(await response.text());
		document.body.style.cursor = 'default';
		isLoading = false;

		if (result.type === 'success' && result.data) {
			errorPopup.showError('Email sent successfully', null, 5000, 'success');
		} else if (result.type === 'failure' && result.data) {
			errorPopup.showError(result.data.message);
			buttonActive = true;
		}
	}
</script>

<svelte:head>
	<title>Reset password | Lutia</title>
</svelte:head>

<ErrorPopup bind:this={errorPopup} />

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
	<p>Enter your account email and we will send you instructions on how to reset your password.</p>
	<div class="login-container">
		<form>
			<input type="email" bind:value={formData.email} placeholder="Enter email" required />
			<button
				type="submit"
				style="
                    background-color: {buttonActive ? '' : '#0093cdc0'};
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
				<p>Back</p>
			</div>
		</div>
	</div>
</div>

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
			}
		}
	}
</style>
