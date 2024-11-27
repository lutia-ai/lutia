<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import ChatGpt from '$lib/components/icons/chatGPT.svelte';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import gptImage from '$lib/images/gptimage.png';
	import gptImage2 from '$lib/images/gptimage2.png';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import { marked } from 'marked';
	import { sanitizeLLmContent } from '$lib/chatHistory';
	import { spring } from 'svelte/motion';
	import viewport from '$lib/userViewportAction';
	import DemoVideo from '$lib/videos/lutia-screenrecording.mp4';
	// import ScreenshotTipTapNotes from '$lib/images/screenshotTipTapNotes.png';

	let videoElement: HTMLVideoElement;

	function playVideo(videoElement: HTMLVideoElement) {
		videoElement.play();
	}

	function pauseVideo(videoElement: HTMLVideoElement) {
		videoElement.pause();
	}

	let canFade = false;

	const codeContainer1 = `class Animal {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    makeSound(): void {
        console.log("Some generic sound");
    }
}

class Dog extends Animal {
    breed: string;

    constructor(name: string, breed: string) {
        super(name);
        this.breed = breed;
    }

    makeSound(): void {
        console.log("Woof! Woof!");
    }
}

const dog = new Dog("Rex", "German Shepherd");
dog.makeSound(); // Output: Woof! Woof!"`;

	const codeContainer2 = `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            return self.balance
        return None

    def withdraw(self, amount):
        if 0 < amount <= self.balance:
            self.balance -= amount
            return self.balance
        return None

    def check_balance(self):
        return self.balance

def main():
    account = BankAccount("Alice", 100)
    balance = account.check_balance()
    account.deposit(50)
    account.withdraw(30)
    account.withdraw(150)
    new_balance = account.check_balance()
    return balance, new_balance`;

	const textContainer1 = `
The theory of relativity, developed by Albert Einstein, consists of two parts: special relativity and general relativity. It's a fundamental framework for understanding the laws of physics, where special relativity addresses the physics of objects moving at constant speeds, particularly those close to the speed of light, altering concepts of time and space. General relativity further extends this by describing gravity as the warping of space-time by mass, revolutionizing our understanding of gravitational forces and contributing to insights about black holes and the expanding universe.
`;

	const textContainer2 = `
Okay, how about a quick and easy One-Pan Lemon Herb Roasted Chicken and Veggies?  It's minimal cleanup and pretty healthy.

**Ingredients:**

* 1.5-2 lbs bone-in, skin-on chicken thighs (or drumsticks, or a mix)
* 1 lb small red potatoes, halved or quartered if large
* 1 lb carrots, peeled and chopped into 1-inch pieces
* 1 onion, cut into wedges
* 2 lemons, 1 thinly sliced, 1 juiced
* 2 tablespoons olive oil
* 1 tablespoon dried Italian herbs (or a mix of oregano, thyme, rosemary)
* 1 teaspoon salt
* 1/2 teaspoon black pepper
* Fresh parsley, chopped (for garnish, optional)
`;
	let displayText1 = '';
	let displayText2 = '';
	let displayCode1 = '';
	let displayCode2 = '';

	const image1Timeout = 300;
	const image2Timeout = 1000;
	const text1Timeout = 1800;
	const text2Timeout = 4800;
	const code1Timeout = 4000;
	const code2Timeout = 2800;

	const displayImage1Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayImage1Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});
	const displayImage2Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayImage2Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});

	const displayCode1Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayCode1Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});
	const displayCode2Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayCode2Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});

	const displayText1Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayText1Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});
	const displayText2Position = spring(0, {
		stiffness: 0.01,
		damping: 0.9
	});
	const displayText2Opacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});

	const explainSectionOpacity = spring(0, {
		stiffness: 0.1,
		damping: 0.9
	});

	function chunkText(text: string, chunkSize: number = 10): string[] {
		const chunks: string[] = [];
		for (let i = 0; i < text.length; i += chunkSize) {
			chunks.push(text.slice(i, i + chunkSize));
		}
		return chunks;
	}

	function handleScroll(event: UIEvent): void {
		const target = event.target as HTMLElement;
		const scrollPosition = Math.max(0, target.scrollTop - 50);
		const opacity = Math.max(0, 1 - scrollPosition / 250); // Adjust 500 to control fade speed

		displayImage1Position.set(opacity === 1 ? 0 : 300);
		displayImage1Opacity.set(opacity === 1 ? 1 : 0);
		displayImage2Position.set(opacity === 1 ? 0 : 350);
		displayImage2Opacity.set(opacity === 1 ? 1 : 0);
		displayCode1Position.set(opacity === 1 ? 0 : 350);
		displayCode1Opacity.set(opacity === 1 ? 1 : 0);
		displayCode2Position.set(opacity === 1 ? 0 : 350);
		displayCode2Opacity.set(opacity === 1 ? 1 : 0);
		displayText1Position.set(opacity === 1 ? 0 : 350);
		displayText1Opacity.set(opacity === 1 ? 1 : 0);
		displayText2Position.set(opacity === 1 ? 0 : 350);
		displayText2Opacity.set(opacity === 1 ? 1 : 0);

		explainSectionOpacity.set($displayImage2Opacity === 0 ? 1 : 0);
	}

	onMount(() => {
		setTimeout(() => {
			displayImage1Opacity.set(1);
		}, image1Timeout);
		setTimeout(() => {
			displayImage2Opacity.set(1);
			canFade = true;
		}, image2Timeout);
		setTimeout(() => {
			displayText1Opacity.set(1);
		}, text1Timeout);
		setTimeout(() => {
			displayCode1Opacity.set(1);
		}, code1Timeout);
		setTimeout(() => {
			displayText2Opacity.set(1);
		}, text2Timeout);
		setTimeout(() => {
			displayCode2Opacity.set(1);
		}, code2Timeout);

		const displayText1Chunks = chunkText(textContainer1);
		const displayText2Chunks = chunkText(textContainer2);
		const displayCodeChunks = chunkText(codeContainer1);
		const displayCode2Chunks = chunkText(codeContainer2);
		let displayText1Index = 0;
		let displayText2Index = 0;
		let displayCode1Index = 0;
		let displayCode2Index = 0;

		setTimeout(() => {
			const interval = setInterval(() => {
				if (displayText1Index < displayText1Chunks.length) {
					displayText1 += displayText1Chunks[displayText1Index];
					displayText1Index++;
				} else {
					clearInterval(interval);
				}
			}, 30);
		}, text1Timeout);

		setTimeout(() => {
			const interval2 = setInterval(() => {
				if (displayText2Index < displayText2Chunks.length) {
					displayText2 += displayText2Chunks[displayText2Index];
					displayText2Index++;
				} else {
					clearInterval(interval2);
				}
			}, 35);
		}, text2Timeout);

		setTimeout(() => {
			const interval3 = setInterval(() => {
				if (displayCode1Index < displayCodeChunks.length) {
					displayCode1 += displayCodeChunks[displayCode1Index];
					displayCode1Index++;
				} else {
					clearInterval(interval3);
				}
			}, 30);
		}, code1Timeout);

		setTimeout(() => {
			const interval4 = setInterval(() => {
				if (displayCode2Index < displayCode2Chunks.length) {
					displayCode2 += displayCode2Chunks[displayCode2Index];
					displayCode2Index++;
				} else {
					clearInterval(interval4);
				}
			}, 25);
		}, code2Timeout);
	});
</script>

<svelte:head>
	{@html synthMidnightTerminalDark}
</svelte:head>

<header>
	<div class="section"></div>
	<div class="section">
		<div class="title">
			<h1>Lutia</h1>
		</div>
	</div>
	<div class="section"></div>
</header>

<div
	class="main"
	on:scroll={(event) => {
		if (canFade) handleScroll(event);
	}}
>
	<div class="landing-page">
		<div class="landing-container">
			<div
				class="llm-container"
				style="
                        position: absolute;
                        left: -15%;
                        top: calc(-24% - {Math.max(0, $displayImage1Position - 25)}px);
                        opacity: {$displayImage1Opacity};
                    "
			>
				<div class="gpt-icon-container">
					<ChatGpt color="var(--text-color)" />
				</div>
				<div class="image-container">
					<img src={gptImage} alt="AI generated" width="500" height="500" />
				</div>
			</div>
			<div
				class="llm-container"
				style="
                        position: absolute;
                        left: 30%;
                        top: calc(75% - {Math.max(0, $displayImage2Position - 100)}px);
                        opacity: {$displayImage2Opacity};
                    "
			>
				<div class="gpt-icon-container">
					<ChatGpt color="var(--text-color)" />
				</div>
				<div class="image-container">
					<img src={gptImage2} alt="AI generated" width="500" height="500" />
				</div>
			</div>
			<div
				class="llm-container"
				style="
                            position: absolute;
                            left: 69%;
                            top: calc(5% - {Math.max(0, $displayText1Position - 125)}px);
                            opacity: {$displayText1Opacity};
                        "
			>
				<div class="llm-icon-container">
					<GeminiIcon />
				</div>
				<div class="llm-chat">
					<p class="content-paragraph">{displayText1}</p>
				</div>
			</div>
			<div
				class="llm-container"
				style="
                            position: absolute;
                            left: -72%;
                            top: calc(75% - {Math.max(0, $displayText2Position - 125)}px);
                            opacity: {$displayText2Opacity};
                        "
			>
				<div class="llm-icon-container" style="padding-top: 20px;">
					<img src={ClaudeIcon} alt="Claude's icon" />
				</div>
				<div class="llm-chat">
					<p class="content-paragraph" style="max-width: 600px;">
						{@html marked(sanitizeLLmContent(displayText2))}
					</p>
				</div>
			</div>
			<div
				class="llm-container"
				style="
                            position: absolute;
                            left: 110%;
                            top: calc(37% - {Math.max(0, $displayCode1Position - 50)}px);
                            opacity: {$displayCode1Opacity};
                        "
			>
				<div class="gpt-icon-container">
					<ChatGpt color="var(--text-color)" />
				</div>
				<div class="llm-chat">
					<div class="code-container">
						<div class="code-header">
							<p>typescript</p>

							<div class="right-side-container">
								<div class="tab-width-container">
									<div class="dropdown-icon">
										<DropdownIcon color="rgba(255,255,255,0.65)" />
									</div>
									<p>Tab width: 4</p>
								</div>
								<div class="copy-code-container">
									<div class="copy-icon-container">
										<CopyIcon color="rgba(255,255,255,0.65)" />
									</div>
									<p>copy</p>
								</div>
							</div>
						</div>
						<div class="code-content">
							<HighlightAuto code={displayCode1} let:highlighted>
								<LineNumbers
									{highlighted}
									--line-number-color="rgba(255, 255, 255, 0.3)"
									--border-color="rgba(255, 255, 255, 0.1)"
									--padding-left="1em"
									--padding-right="1em"
									--
									style="max-width: 100%; font-size: 13px; line-height: 19px;"
								/>
							</HighlightAuto>
						</div>
					</div>
				</div>
			</div>
			<div
				class="llm-container"
				style="
                            position: absolute;
                            left: -108%;
                            top: calc(5% - {Math.max(0, $displayCode2Position - 100)}px);
                            opacity: {$displayCode2Opacity};
                        "
			>
				<div class="gpt-icon-container">
					<ChatGpt color="var(--text-color)" />
				</div>
				<div class="llm-chat">
					<div class="code-container" style="max-width: 600px;">
						<div class="code-header">
							<p>python</p>

							<div class="right-side-container">
								<div class="tab-width-container">
									<div class="dropdown-icon">
										<DropdownIcon color="rgba(255,255,255,0.65)" />
									</div>
									<p>Tab width: 4</p>
								</div>
								<div class="copy-code-container">
									<div class="copy-icon-container">
										<CopyIcon color="rgba(255,255,255,0.65)" />
									</div>
									<p>copy</p>
								</div>
							</div>
						</div>
						<div class="code-content">
							<HighlightAuto code={displayCode2} let:highlighted>
								<LineNumbers
									{highlighted}
									--line-number-color="rgba(255, 255, 255, 0.3)"
									--border-color="rgba(255, 255, 255, 0.1)"
									--padding-left="1em"
									--padding-right="1em"
									--
									style="max-width: 100%; font-size: 13px; line-height: 19px;"
								/>
							</HighlightAuto>
						</div>
					</div>
				</div>
			</div>

			<h1 class="main-title animated-text">Your generative AI toolkit</h1>
			<h3 class="sub-title">
				Access a host of AI models without the costly monthly subscriptions.
			</h3>
			<button class="cta-button animated-background" on:click={() => goto('chat')}>
				Get Started
			</button>
		</div>
	</div>

	<div class="explain-section" style="opacity: {$explainSectionOpacity};">
		<h1 class="animated-text">
			Access leading AI models, all from the same intuitive interface
		</h1>
		<video
			width="100%"
			height="100%"
			loop
			controls
			aria-label="Demo video"
			bind:this={videoElement}
			use:viewport
			on:enterViewport={() => playVideo(videoElement)}
			on:exitViewport={() => pauseVideo(videoElement)}
			muted={true}
		>
			<source src={DemoVideo} type="video/mp4" />
			<track kind="captions" src="" srclang="en" label="English" />
		</video>

		<h1 class="animated-text" style="margin-top: 300px; margin-bottom: 0px;">
			Only pay for what you use
		</h1>
		<p class="pay-paragraph">
			Pay-as-you-go and enjoy premium AI models without the high subscription costs. Most
			active users spend less than $3 monthly.
		</p>
		<div class="payment-explain-container">
			<div class="question-container">
				<p>How much does each message to an LLM cost?</p>
			</div>
			<div class="llm-container">
				<div class="gpt-icon-container">
					<ChatGpt color="var(--text-color)" />
				</div>
				<div class="llm-chat">
					<p class="content-paragraph">
						The cost of sending a message to a Large Language Model (LLM) like those
						provided by OpenAI, Google, or others, varies based on a few key factors: <br
						/><br />
					</p>
					<ol>
						<li>
							<strong>Provider Pricing:</strong> Different companies have different pricing
							models.
						</li>
						<br />
						<li>
							<strong>Token Usage:</strong> Models measure input (what you send) and output
							(what the model returns) in units called tokens.
						</li>
					</ol>
					<p class="content-paragraph">
						In general, these costs add up to fractions of a cent per token, for example
						the cost of this request is shown below.
					</p>
					<div class="price-open-container animated-background">
						<div class="price-record">
							<p>Input:</p>
							<span>$0.00005</span>
						</div>
						<div class="price-record">
							<p>Output:</p>
							<span>$0.00179</span>
						</div>
						<div class="price-record">
							<p>Total:</p>
							<span>$0.00184</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="what-waiting-container">
			<h1 class="animated-text" style="margin: 0 auto 0 auto; font-weight: 400;">
				What are you waiting for?
			</h1>
			<p class="pay-paragraph" style="margin: 0 auto;">
				Create an account now and receive $1 in free credit
			</p>
			<button
				class="cta-button animated-background"
				style="width: max-content; margin: 0 auto;"
				on:click={() => goto('chat')}
			>
				Get Started
			</button>
		</div>
	</div>

	<footer>
		<a href="/auth">Login</a>
		<a href="/auth">Register</a>
		<a href="/privacy-policy">Privacy policy</a>
	</footer>
</div>

<style lang="scss">
	header {
		position: fixed;
		display: flex;
		align-items: center;
		width: 100%;
		padding: 0px 10px;
		box-sizing: border-box;
		z-index: 100;

		.section {
			flex: 1;
			display: flex;
		}

		.title {
			position: relative;
			padding: 15px 30px;
			background: var(--bg-color);
			margin: 0 auto;
			border-bottom-left-radius: 20px;
			border-bottom-right-radius: 20px;
		}

		h1 {
			margin: 0 auto;
			font-size: 26px;
			padding: 0;
		}
	}

	.main {
		overflow-x: hidden;
	}

	.landing-page {
		display: flex;
		flex-direction: column;
		max-width: 700px;
		margin: 0 auto;
		padding: 0 10px;
		// overflow-x: hidden;

		.landing-container {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100vh;
			padding: 0 20px;
			margin: 0 auto;

			h1 {
				font-size: 55px;
				margin-bottom: 0px;
				margin-top: 36px;
				color: var(--text-color-hover);
				text-align: center;
				z-index: 10;
				background-color: var(--bg-color);
			}

			h3 {
				font-size: 32px;
				font-weight: 200;
				margin-bottom: 10px;
				margin-top: 32px;
				color: var(--text-color-hover);
				text-align: center;
				font-family: 'Raleway Variable', sans-serif;
				font-optical-sizing: auto;
				font-style: normal;
				z-index: 10;
			}
		}
	}

	.cta-button {
		background-color: #1d60c2;
		color: #fff;
		padding: 1rem 2rem;
		border: none;
		border-radius: 5px;
		text-decoration: none;
		font-size: 1rem;
		transition: background-color 0.3s;
		cursor: pointer;
		margin-top: 40px;
		z-index: 10;
		transition: outline 0.3s ease-in-out;

		&:hover {
			outline: 7px solid var(--bg-color-light);
		}
	}

	.question-container {
		position: relative;
		max-width: 400px;
		border-radius: 20px;
		background: var(--bg-color-light);
		padding: 10px 20px;
		flex-shrink: 1;
		box-sizing: border-box;
		word-break: break-word;
		overflow-wrap: break-word;
		margin: 50px 0;
		margin-left: auto;

		p {
			padding: 0;
			margin: 0;
			font-weight: 300;
			line-height: 30px;
			font-family: 'Albert Sans', sans-serif;
		}
	}

	.llm-container {
		position: relative;
		display: flex;
		gap: 20px;
		width: 100%;
		box-sizing: border-box;
		max-width: 850px;
		margin-left: auto;
		font-family: 'Albert Sans', sans-serif;
		transition: opacity 0.6s ease;

		.gpt-icon-container {
			position: relative;
			width: 24px;
			height: 24px;
			display: flex;
			border-radius: 50%;
			padding: 2px;
			padding-top: 0px;
			margin-top: 6px;
			border: none;
			// border: 1px solid var(--text-color-light-opacity);
		}

		.llm-icon-container {
			position: relative;
			display: flex;
			width: 28px;
			height: 28px;
			padding-top: 4px;
			flex: 1;
		}

		.llm-chat {
			position: relative;
			width: calc(100% - 50px);
			padding: 3px 0px;
			box-sizing: border-box;

			.content-paragraph {
				display: flex;
				flex-direction: column;
				font-weight: 300;
				line-height: 30px;
				max-width: 100%;
				overflow-y: hidden;
				overflow-x: visible !important;
				color: var(--text-color);
				margin: 0;
				font-family: 'Albert Sans', sans-serif;

				p {
					font-family: 'Albert Sans', sans-serif;
					font-weight: 300;
					line-height: 30px;
				}
			}

			ol {
				li {
					font-family: 'Albert Sans', sans-serif !important;
					font-weight: 200 !important;
					line-height: 30px !important;
				}
			}
		}

		.image-container {
			position: relative;
			border-radius: 5px;
			overflow: hidden;

			img {
				border-radius: 10px;
			}
		}

		.code-container {
			padding-bottom: 10px;
			border-radius: 10px;
			margin: 0 0;
			width: 818px;

			.code-header {
				display: flex;
				padding: 10px 20px;
				background: rgba(46, 56, 66, 255);
				border-top-left-radius: 10px;
				border-top-right-radius: 10px;

				.right-side-container {
					display: flex;
					margin-left: auto;

					.tab-width-container {
						position: relative;
						display: flex;
						gap: 5px;
						cursor: pointer;

						.dropdown-icon {
							width: 15px;
							height: 15px;
							transform: translateY(1px);
							margin: auto 0;
						}
					}

					.copy-code-container {
						display: flex;
						margin-left: 30px;
						gap: 5px;
						cursor: pointer;

						.copy-icon-container {
							height: 15px;
							width: 15px;
							margin: auto 0;
						}

						p {
							margin: auto 0;
						}
					}
				}

				p {
					margin: auto 0;
					line-height: 15px !important;
					color: rgba(255, 255, 255, 0.65);
					font-weight: 300;
					font-size: 12px;
				}
			}

			.code-content {
				overflow: hidden;
				border-bottom-left-radius: 10px;
				border-bottom-right-radius: 10px;
			}
		}
	}

	.explain-section {
		display: flex;
		flex-direction: column;
		max-width: 1000px;
		margin: 100px auto;
		padding: 0 40px;
		transition: opacity 1s ease;
		perspective: 1000px;

		h1 {
			max-width: 700px;
			font-size: 40px;
			font-weight: 200;
			font-family: 'Raleway Variable', sans-serif;
		}

		video {
			border-radius: 10px;
		}

		.pay-paragraph {
			font-family: 'Raleway Variable', sans-serif;
			font-size: 22px;
			font-weight: 800;
			margin-top: 20px;
		}

		.payment-explain-container {
			padding: 0 15px;
			transform: perspective(1000px) rotateY(0deg);
		}

		.price-open-container {
			position: absolute;
			display: flex;
			gap: 15px;
			flex-direction: column;
			top: calc(100% + 50px);
			left: -10px;
			padding: 10px;
			border-radius: 10px;
			border: 1px solid var(--text-color-light-opacity);
			width: max-content;
			background: linear-gradient(270deg, #e91e63, #1d60c2, #9c27b0, #e91e63);
			background-size: 400%; /* To ensure smooth animation */
			animation: gradient-animation 25s ease infinite; /* Animation */

			&::before {
				content: '';
				position: absolute;
				top: -10px; /* Position above container */
				left: calc(50% - 10px); /* Center the arrow */
				width: 20px; /* Width of the arrow */
				height: 10px; /* Height of the arrow */
				background: inherit; /* Inherit the gradient */
				clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
				/* Creates a triangle shape */
			}

			.price-record {
				position: relative;
				display: flex;
				gap: 5px;

				p {
					position: relative;
					margin: 0;
					transition: none;
					opacity: 1;
					font-size: 14px;
					width: 50px;
					padding: 0;
					left: 0;
					top: 0;
					transform: translateX(0);
					color: white;
				}

				span {
					position: relative;
					margin: 0;
					width: max-content;
					color: white;
				}
			}
		}
	}

	.what-waiting-container {
		display: flex;
		flex-direction: column;
		gap: 50px;
		background: var(--text-color);
		padding: 50px;
		border-radius: 20px;
		margin-top: 420px;

		h1,
		p {
			text-align: center;
		}

		p {
			color: var(--bg-color-light-alt);
		}

		.cta-button {
			&:hover {
				outline: 7px solid var(--text-color-light);
			}
		}
	}

	footer {
		display: flex;
		gap: 50px;
		border-radius: 20px;
		padding: 50px 20px;
		box-sizing: border-box;
		margin-top: 200px;
		max-width: 1000px;
		margin: 0 auto;

		a {
			flex: 1;
			text-align: center;
			font-size: 18px;
			font-weight: 300;
			font-family: 'Raleway Variable', sans-serif;
			color: var(--text-color);
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.animated-text {
		font-weight: 800; /* High font weight */
		background: linear-gradient(270deg, #1d60c2, #e91e63, #9c27b0, #1d60c2);
		background-size: 400%; /* To ensure smooth animation */
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent; /* Makes text fill color transparent */
		animation: gradient-animation 25s ease infinite; /* Animation */
	}

	.animated-background {
		background: linear-gradient(270deg, #e91e63, #1d60c2, #9c27b0, #e91e63);
		background-size: 400%; /* To ensure smooth animation */
		// -webkit-background-clip: text;
		// -webkit-text-fill-color: transparent; /* Makes text fill color transparent */
		animation: gradient-animation 25s ease infinite; /* Animation */
	}

	@keyframes gradient-animation {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}
</style>
