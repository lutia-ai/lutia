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
	import DemoVideo1 from '$lib/videos/video1.mp4';
	import DemoVideo2 from '$lib/videos/video2.mp4';
	import DemoVideo3 from '$lib/videos/video3.mp4';
	import DemoVideo4 from '$lib/videos/video4.mp4';
	import GrokIcon from '$lib/components/icons/GrokIcon.svelte';

	let videoElement: HTMLVideoElement;
	let videoSwitch = 1;
	let demoVideo = DemoVideo1;

	let getStartedHovering = false;

	$: if (videoSwitch) {
		switch (videoSwitch) {
			case 1:
				demoVideo = DemoVideo1;
				break;
			case 2:
				demoVideo = DemoVideo2;
				break;
			case 3:
				demoVideo = DemoVideo3;
				break;
			case 4:
				demoVideo = DemoVideo4;
				break;
		}
		if (videoElement) {
			videoElement.load(); // Load the new source
			videoElement.play(); // Play the video
		}
	}

	let accordian1Open = false;
	let accordian2Open = false;
	let accordian3Open = false;

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
	<meta
		name="description"
		content="Level up your productivity by accessing all the leading generative AI models from the same chat window. Avoid those costly monthly subscriptions with the choice of either pay-as-you-go pricing or monthly subscriptions from as little as $4.99."
	/>
	<title>Lutia | Access leading AI models from as little as $3.99 a month</title>
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
				<div class="llm-icon-container">
					<GrokIcon color="var(--text-color)" />
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
		<h1>
			Making AI <span class="animated-text">accessible</span> to
			<span class="animated-text">everyone.</span>
		</h1>
		<div class="demo-videos-container">
			<div class="video-switches">
				<div
					class="switch"
					role="button"
					tabindex="0"
					on:click={() => (videoSwitch = 1)}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							videoSwitch = 1;
						}
					}}
				>
					<div class="switch-border {videoSwitch === 1 ? 'active' : ''}" />
					<div class="switch-content">
						<h2><span class="animated-text">Harness</span> leading AI models</h2>
						{#if videoSwitch === 1}
							<p>
								Access a host of the most powerful LLMs all from the same chat
								window.
							</p>
						{/if}
					</div>
				</div>
				<div
					class="switch"
					role="button"
					tabindex="0"
					on:click={() => (videoSwitch = 2)}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							videoSwitch = 2;
						}
					}}
				>
					<div class="switch-border {videoSwitch === 2 ? 'active' : ''}" />
					<div class="switch-content">
						<h2><span class="animated-text">Pay-as-you-go</span> pricing</h2>
						{#if videoSwitch === 2}
							<p>
								Pay only for what you use meaning you will always get your moneys
								worth.
							</p>
						{/if}
					</div>
				</div>
				<div
					class="switch"
					role="button"
					tabindex="0"
					on:click={() => (videoSwitch = 3)}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							videoSwitch = 3;
						}
					}}
				>
					<div class="switch-border {videoSwitch === 3 ? 'active' : ''}" />
					<div class="switch-content">
						<h2>A <span class="animated-text">customisable</span> context window</h2>
						{#if videoSwitch === 3}
							<p>
								Have control over how many of your previous messages get sent with
								your prompt.
							</p>
						{/if}
					</div>
				</div>
				<div
					class="switch"
					role="button"
					tabindex="0"
					on:click={() => (videoSwitch = 4)}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							videoSwitch = 4;
						}
					}}
				>
					<div class="switch-border {videoSwitch === 4 ? 'active' : ''}" />
					<div class="switch-content">
						<h2>Track <span class="animated-text">usage</span> across models</h2>
						{#if videoSwitch === 4}
							<p>
								Gain valuable insight into which models you use most and how much
								they cost.
							</p>
						{/if}
					</div>
				</div>
			</div>
			<div class="video-container">
				<video
					width="100%"
					loop
					controls
					playsinline
					aria-label="Demo video"
					bind:this={videoElement}
					use:viewport
					on:enterViewport={() => playVideo(videoElement)}
					on:exitViewport={() => pauseVideo(videoElement)}
					muted={true}
				>
					<source src={demoVideo} type="video/mp4" />
					<track kind="captions" src="" srclang="en" label="English" />
				</video>
			</div>
		</div>

		<div class="what-waiting-container">
			<h1 class="animated-text" style="margin: 0 auto 0 auto; font-weight: 400;">
				What are you waiting for?
			</h1>
			<p class="pay-paragraph" style="margin: 0 auto;">
				<span class="animated-background">Create</span> an account
				<span class="animated-background">now</span>
				and <span class="animated-background">receive</span> $1 in
				<span class="animated-background">free credit</span>.
			</p>
			<div class="filling-border animated-background">
				<a
					class="filling-button"
					on:mouseenter={() => (getStartedHovering = true)}
					on:mouseleave={() => (getStartedHovering = false)}
					style="
                    width: max-content; 
                    margin: 0 auto;
                    "
					href="/chat"
				>
					Get started
				</a>
			</div>
			<!-- <button
				class="cta-button"
				style="width: max-content; margin: 0 auto;"
				on:click={() => goto('chat')}
			>
				Get Started
			</button> -->
		</div>
	</div>

	<footer>
		<div class="left">
			<h2>FAQ</h2>
			<h1>Frequently Asked Questions</h1>
		</div>
		<div class="right">
			<div
				class="accordian"
				role="button"
				tabindex="0"
				on:click={() => (accordian1Open = !accordian1Open)}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						accordian1Open = !accordian1Open;
					}
				}}
			>
				<div class="question">
					<h3>Is my data safe?</h3>
					<div class="plus">
						<h3>{accordian1Open ? '-' : '+'}</h3>
					</div>
				</div>
				<p style="display: {accordian1Open ? 'block' : 'none'}">
					Yes! We take security <b>very seriously</b>.<br /><br />

					Lutia will <b>never</b> use any of your data or share it with third parties
					without your explicit consent.<br /><br />

					Our platform is designed to ensure that your data remains confidential and
					secure. Lutia does not use your personal data to train any machine learning
					models, and no user data is ever sent to external APIs. <br /><br />

					<b>Note: </b>For your own protection, we advise against entering any sensitive
					or valuable information into prompts. Your privacy and trust are our top
					priorities.
				</p>
			</div>
			<div
				class="accordian"
				role="button"
				tabindex="0"
				on:click={() => (accordian2Open = !accordian2Open)}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						accordian2Open = !accordian2Open;
					}
				}}
			>
				<div class="question">
					<h3>I have another question</h3>
					<div class="plus">
						<h3>{accordian2Open ? '-' : '+'}</h3>
					</div>
				</div>
				<p style="display: {accordian2Open ? 'block' : 'none'}">
					Shoot me an email at joe@lutia.ai
				</p>
			</div>
			<div
				class="accordian"
				role="button"
				tabindex="0"
				on:click={() => (accordian3Open = !accordian3Open)}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						accordian3Open = !accordian3Open;
					}
				}}
			>
				<div class="question">
					<h3>What is your Privacy Policy?</h3>
					<div class="plus">
						<h3>{accordian3Open ? '-' : '+'}</h3>
					</div>
				</div>
				<p style="display: {accordian3Open ? 'block' : 'none'}">
					Our Privacy Policy is available <a href="/privacy-policy" target="_blank"
						>here</a
					>
				</p>
			</div>
		</div>
	</footer>
</div>

<style lang="scss">
	$bgColor: lightgrey;
	$textHoverColor: white;
	$debug: false;

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
			font-size: 60px;
			font-weight: 800;
			font-family: 'Raleway Variable', sans-serif;
		}

		.demo-videos-container {
			display: flex;
			gap: 25px;

			.video-switches {
				flex: 3;
				display: flex;
				flex-direction: column;
				gap: 35px;

				.switch {
					cursor: pointer;
					display: flex;
					gap: 15px;

					.switch-border {
						width: 2px;
						background: var(--text-color-light-opacity);
					}

					.active {
						background: linear-gradient(
							270deg,
							#1d60c2,
							#e91e63,
							#9c27b0,
							#1d60c2
						) !important;
						background-size: 400%; /* To ensure smooth animation */
						animation: gradient-animation 25s ease infinite; /* Animation */
					}

					.switch-content {
						display: flex;
						flex-direction: column;
						gap: 20px;
						padding: 10px 0;

						h2 {
							font-size: 22px;
							font-weight: 400;
							font-family: 'Raleway Variable', sans-serif;
							margin: 0;
						}

						p {
							font-size: 18px;
							font-weight: 300;
							font-family: 'Raleway Variable', sans-serif;
							margin: 0;
						}
					}
				}
			}

			.video-container {
				flex: 4;
			}
		}

		video {
			border-radius: 10px;
		}

		.pay-paragraph {
			font-family: 'Raleway Variable', sans-serif;
			font-size: 30px;
			font-weight: 800;
			line-height: 70px;

			span {
				padding: 4px 6px;
				border-radius: 5px;
				color: white;
			}
		}
	}

	.what-waiting-container {
		display: flex;
		flex-direction: column;
		gap: 50px;
		// background: var(--bg-color-light);
		padding: 50px;
		border-radius: 20px;
		margin-top: 420px;
		margin-bottom: 200px;

		h1,
		p {
			text-align: center;
		}

		h1 {
			font-size: 70px;
			font-weight: 600 !important;
		}

		p {
			color: var(--text-color);
			// max-width: 350px;
		}

		.cta-button {
			font-size: 30px;
			&:hover {
				outline: 7px solid var(--text-color-light);
			}
		}
		.filling-border {
			margin: auto;
			width: max-content;
			border-radius: calc(0.75em + 0.5em + 0.15em);
			transition: scale 0.5s;

			&:hover {
				transform: scale(0.98);
				box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
			}
		}

		.filling-button {
			display: inline-block;
			position: relative;
			z-index: 1;
			overflow: if($debug, unset, hidden);
			margin: auto;
			text-decoration: none;
			font-family: sans-serif;
			font-weight: 600;
			font-size: 2em;
			padding: 0.75em 1em;
			border-radius: inherit;
			border: 2px solid var(--bg-color);
			// Animate the text color
			animation: text-color-animation 14s linear infinite;

			&:before,
			&:after {
				content: '';
				position: absolute;
				top: -1.5em;
				z-index: -1;
				width: 200%;
				aspect-ratio: 1;
				border: if($debug, inherit, none);
				border-radius: 40%;
				background: linear-gradient(270deg, #1d60c2, #e91e63, #9c27b0, #1d60c2);
				animation: wave-animation 14s linear infinite;
			}

			&:before {
				left: -80%;
				animation-delay: -2s;
			}

			&:after {
				right: -80%;
				animation-delay: -4s;
			}

			&:hover,
			&:focus {
				animation-duration: 14s; // Optional: speed up on hover

				&:before,
				&:after {
					animation-duration: 14s; // Optional: speed up on hover
				}
			}
		}

		@keyframes wave-animation {
			0% {
				transform: translate3d(0, 5em, 0) rotate(-340deg);
			}
			50% {
				transform: translate3d(0, 0, 0) rotate(0deg);
			}
			100% {
				transform: translate3d(0, 5em, 0) rotate(-340deg);
			}
		}

		@keyframes text-color-animation {
			0% {
				color: $textHoverColor;
			}
			40% {
				color: $textHoverColor;
			}
			70% {
				color: $bgColor;
			}
			100% {
				color: $textHoverColor;
			}
		}
	}

	footer {
		display: flex;
		gap: 50px;
		padding: 100px 50px;
		box-sizing: border-box;
		margin: 0 auto;
		margin-top: 250px;
		background: var(--bg-color-light);

		h1,
		h2,
		h3,
		p,
		a {
			color: var(--text-color);
			font-family: 'Raleway Variable', sans-serif;
		}

		p {
			letter-spacing: 1px;
			line-height: 20px;
		}

		h1 {
			font-size: 28px;
			font-weight: 800;
		}

		.left {
			max-width: 500px;
			width: 50%;
			margin-left: auto;
		}

		.right {
			display: flex;
			flex-direction: column;
			// gap: 15px;
			width: 50%;
			max-width: 500px;
			margin-right: auto;

			.accordian {
				cursor: pointer !important;
				padding: 25px 0;
				border-top: 2px solid var(--bg-color-dark);

				.question {
					display: flex;
					width: 100%;

					.plus {
						margin: auto 0 auto auto;
						font-size: 40px;
					}
				}

				h3 {
					margin: auto 0 !important;
				}
			}
		}

		a {
			flex: 1;
			text-align: center;
			font-size: 18px;
			font-weight: 300;
			font-family: 'Raleway Variable', sans-serif;
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

	@media (max-width: 610px) {
		.llm-container {
			.llm-chat {
				display: none;
			}
		}

		.explain-section {
			.demo-videos-container {
				flex-direction: column;

				.video-switches {
					order: 2;
				}

				.video-container {
					order: 1;
				}
			}
		}

		.what-waiting-container {
			padding: 40px 10px;
			margin-top: 220px;
			gap: 30px;

			h1 {
				font-size: 50px;
			}

			p {
				padding: 0 10px;
			}
		}

		footer {
			flex-direction: column;

			.left {
				width: 100%;
				margin-left: 0;
			}

			.right {
				width: 100%;
				margin: 0 auto;
			}
		}
	}
</style>
