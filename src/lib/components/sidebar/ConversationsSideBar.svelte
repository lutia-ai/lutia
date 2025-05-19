<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import type { Conversation } from '@prisma/client';
	import { PaymentTier } from '@prisma/client';
	import EditIcon from '../icons/EditIcon.svelte';
	import BinIcon from '../icons/BinIcon.svelte';
	import { conversationsOpen } from '$lib/stores';
	import { goto } from '$app/navigation';

	export let paymentTier: PaymentTier; // User with payment tier

	let conversations: Conversation[] = [];
	let loading = true;
	let error: Error | null = null;
	let page = 1;
	const pageSize = 20;
	let hasMore = true;
	let loadingMore = false;
	let totalConversations = 0;
	let groupedConversations: { [key: string]: Conversation[] } = {};
	let editInputRef: HTMLInputElement | null = null;

	// For dropdown menu
	let activeMenuId: string | null = null;

	let editingConversation: Conversation | null = null;
	let newTitle = '';

	// For delete confirmation
	let showDeleteModal = false;
	let deletingConversation: Conversation | null = null;

	// Function to get conversations with pagination
	async function getUsersConversations(resetPage = false) {
		try {
			if (resetPage) {
				page = 1;
				hasMore = true;
				conversations = [];
			}

			if (!hasMore || loadingMore) return;

			loading = page === 1;
			loadingMore = page > 1;

			const formData = new FormData();
			formData.append('page', page.toString());
			formData.append('pageSize', pageSize.toString());

			const response = await fetch('?/getUsersConversations', {
				method: 'POST',
				body: formData
			});

			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				const newConversations = result.data.data.conversations;
				hasMore = result.data.data.hasMore;
				totalConversations = result.data.data.total;

				if (page === 1) {
					conversations = newConversations;
				} else {
					conversations = [...conversations, ...newConversations];
				}

				// Increment page for next load
				page++;

				// Group conversations by date
				groupConversations();
			} else if (result.type === 'failure' && result.data) {
				console.error('Failed to fetch conversations');
			}
		} catch (error) {
			console.error('Error getting conversations:', error);
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	// Group conversations by time periods
	function groupConversations() {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const last7Days = new Date(today);
		last7Days.setDate(last7Days.getDate() - 7);
		const last30Days = new Date(today);
		last30Days.setDate(last30Days.getDate() - 30);

		const groups: { [key: string]: Conversation[] } = {
			Today: [],
			Yesterday: [],
			'Previous 7 Days': [],
			'Previous 30 Days': [],
			Older: []
		};

		if (conversations && Array.isArray(conversations)) {
			conversations.forEach((conversation) => {
				const conversationDate = new Date(
					conversation.updated_at || conversation.created_at
				);

				if (conversationDate >= today) {
					groups['Today'].push(conversation);
				} else if (conversationDate >= yesterday) {
					groups['Yesterday'].push(conversation);
				} else if (conversationDate >= last7Days) {
					groups['Previous 7 Days'].push(conversation);
				} else if (conversationDate >= last30Days) {
					groups['Previous 30 Days'].push(conversation);
				} else {
					groups['Older'].push(conversation);
				}
			});
		}

		// Filter out empty groups
		groupedConversations = Object.fromEntries(
			Object.entries(groups).filter(([_, convos]) => convos.length > 0)
		);
	}

	// Handle scroll for infinite loading
	function handleScroll(e: Event) {
		const container = e.target as HTMLElement;
		const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

		if (scrollBottom < 100 && hasMore && !loadingMore) {
			getUsersConversations();
		}
	}

	// Open menu for a conversation
	function toggleMenu(id: string, event: MouseEvent) {
		event.stopPropagation();
		activeMenuId = activeMenuId === id ? null : id;
	}

	// Close all open menus
	function closeAllMenus() {
		activeMenuId = null;
	}

	// Handle delete conversation
	function openDeleteModal(conversation: Conversation, event: MouseEvent) {
		event.stopPropagation();
		activeMenuId = null;
		deletingConversation = conversation;
		showDeleteModal = true;
	}

	async function deleteConversation() {
		if (!deletingConversation) return;

		try {
			const formData = new FormData();
			formData.append('conversationId', deletingConversation.id);

			const response = await fetch('?/deleteConversation', {
				method: 'POST',
				body: formData
			});

			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success') {
				// Remove from list
				conversations = conversations.filter((c) => c.id !== deletingConversation!.id);
				groupConversations();

				// Reset state
				showDeleteModal = false;
				deletingConversation = null;
			}
		} catch (error) {
			console.error('Error deleting conversation:', error);
		}
	}

	async function updateConversationTitle() {
		if (!editingConversation) return;

		try {
			const formData = new FormData();
			formData.append('conversationId', editingConversation.id);
			formData.append('title', newTitle);

			const response = await fetch('?/updateConversationTitle', {
				method: 'POST',
				body: formData
			});

			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success') {
				// Update in the list
				conversations = conversations.map((c) =>
					c.id === editingConversation!.id ? { ...c, title: newTitle } : c
				);
				groupConversations();

				editingConversation = null;
			}
		} catch (error) {
			console.error('Error updating conversation title:', error);
		}
	}

	function navigateToConversation(id: string) {
		goto(`/chat/${id}`);
	}

	onMount(async () => {
		try {
			await getUsersConversations(true);
		} catch (err) {
			error = err instanceof Error ? err : new Error(String(err));
			loading = false;
		}
	});
</script>

<svelte:window
	on:click={() => {
		closeAllMenus();
		updateConversationTitle(); // Save changes
		editingConversation = null; // Close the input
	}}
/>

<div
	class="conversations-sidebar"
	in:fly={{ x: -300, duration: 300 }}
	out:fly={{ x: -300, duration: 300 }}
	on:click|stopPropagation={closeAllMenus}
	on:keydown|stopPropagation={() => {}}
	role="button"
	tabindex="0"
>
	<div class="header">
		<h2>Chat history</h2>
		<button class="close-button" on:click={() => conversationsOpen.set(false)}> × </button>
	</div>

	<div class="conversations-container" on:scroll={handleScroll}>
		{#if loading && page === 1}
			<div class="loading">
				<p>Loading conversations...</p>
			</div>
		{:else if error}
			<div class="error">
				<p>Error loading conversations: {error.message}</p>
			</div>
		{:else if conversations.length === 0}
			<div class="empty">
				<p>No conversations yet</p>
			</div>
		{:else}
			{#if paymentTier === PaymentTier.PayAsYouGo && totalConversations >= 30}
				<div class="limit-warning">
					<p>You've reached the 30 conversation limit for Pay-As-You-Go users.</p>
					<p>
						When creating a new conversation, your oldest conversation will be
						automatically deleted.
					</p>
				</div>
			{/if}
			<!-- Grouped conversations by date -->
			{#each Object.entries(groupedConversations) as [timeGroup, groupConvos] (timeGroup)}
				<div class="time-group">
					<div class="time-header">{timeGroup}</div>
					<ul class="conversation-list">
						{#each groupConvos as conversation}
							<li class="conversation-item">
								{#if editingConversation && editingConversation.id === conversation.id}
									<input
										type="text"
										bind:value={newTitle}
										bind:this={editInputRef}
										on:keydown={(e) => {
											if (e.key === 'Enter') {
												updateConversationTitle();
											}
										}}
										class="inline-edit-input"
										placeholder="Edit title"
									/>
								{:else}
									<a
										class="conversation-button"
										role="button"
										tabindex="0"
										href="/chat/{conversation.id}"
										on:click|preventDefault={() =>
											navigateToConversation(conversation.id)}
									>
										<div class="conversation-title">
											{conversation.title || 'Untitled conversation'}
										</div>
									</a>
								{/if}
								<button
									class="menu-button"
									on:click={(e) => toggleMenu(conversation.id, e)}
								>
									<span class="dots">•••</span>
								</button>

								<!-- Dropdown menu -->
								{#if activeMenuId === conversation.id}
									<div class="dropdown-menu">
										<button
											on:click={() => {
												newTitle = conversation.title;
												editingConversation = conversation;
												// The input won't exist yet in this tick, so we use setTimeout
												setTimeout(() => {
													if (editInputRef) editInputRef.focus();
												}, 0);
											}}
											class="dropdown-item"
										>
											<span class="icon"
												><EditIcon color="var(--text-color-light)" /></span
											> Rename
										</button>
										<button
											on:click={(e) => openDeleteModal(conversation, e)}
											class="dropdown-item delete"
										>
											<span class="icon"><BinIcon color="#ff6b6b" /></span> Delete
										</button>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}

			{#if loadingMore}
				<div class="loading-more">
					<p>Loading more...</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Delete confirmation modal -->
{#if showDeleteModal && deletingConversation}
	<div
		class="modal-overlay"
		on:click|stopPropagation={() => (showDeleteModal = false)}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				showDeleteModal = false;
			}
		}}
		role="button"
		tabindex="0"
	>
		<div
			class="modal-content delete-modal"
			on:click|stopPropagation
			on:keydown|stopPropagation={(e) => {
				if (e.key === 'Enter') {
					// showDeleteModal = false;
				}
			}}
			role="button"
			tabindex="0"
		>
			<h3>Delete chat?</h3>
			<p>This will delete <strong>{deletingConversation.title}</strong>.</p>
			<div class="modal-actions">
				<button class="cancel-button" on:click={() => (showDeleteModal = false)}
					>Cancel</button
				>
				<button class="delete-button" on:click={deleteConversation}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	::-webkit-scrollbar {
		width: 5px;
	}

	/* Scrollbar handle */
	::-webkit-scrollbar-thumb {
		background-color: #888;
		border-radius: 6px;
	}

	/* Scrollbar track background */
	::-webkit-scrollbar-track {
		background-color: transparent;
	}

	a {
		text-decoration: none;
	}

	.conversations-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 300px;
		height: 100%;
		background: var(--bg-color-conversations);
		box-shadow:
			0 0 #0000,
			0 0 #0000,
			0 9px 9px 0px rgba(0, 0, 0, 0.01),
			0 2px 5px 0px rgba(0, 0, 0, 0.06);
		z-index: 10000;
		display: flex;
		flex-direction: column;
		font-family:
			ui-sans-serif,
			-apple-system,
			system-ui,
			Segoe UI,
			Helvetica,
			Arial,
			sans-serif;

		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 25px 20px;
			margin-bottom: 20px;

			h2 {
				margin: 0;
				font-size: 22px;
				font-weight: 500;
				color: var(--text-color);
			}

			.close-button {
				background: none;
				border: none;
				font-size: 24px;
				color: var(--text-color-light);
				cursor: pointer;
				padding: 0;
				width: 24px;
				height: 24px;
				display: flex;
				align-items: center;
				justify-content: center;

				&:hover {
					color: var(--text-color);
				}
			}
		}

		.conversations-container {
			flex: 1;
			overflow-y: auto;
			padding: 0;

			.loading,
			.error,
			.empty,
			.loading-more {
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				height: 100px;
				color: var(--text-color-light);

				button {
					margin-top: 10px;
					padding: 5px 10px;
					background: var(--bg-color-light);
					border: 1px solid var(--bg-color-dark);
					border-radius: 5px;
					color: var(--text-color);
					cursor: pointer;

					&:hover {
						background: var(--bg-color-light-alt);
					}
				}
			}

			.limit-warning {
				padding: 12px 16px;
				background-color: rgba(255, 87, 87, 0.1);
				border-left: 3px solid var(--error-color);
				margin: 8px;

				p {
					font-size: 12px;
					color: var(--text-color);
					margin: 4px 0;

					&:first-child {
						font-weight: 600;
					}
				}
			}

			.loading-more {
				height: 60px;
				padding: 10px;
			}

			.time-group {
				margin-bottom: 0;

				.time-header {
					padding: 5px 22px;
					font-size: 14px;
					font-weight: 500;
					color: var(--text-color-light);
					margin-top: 15px;
					background-color: var(--bg-color-conversations);
					position: sticky;
					top: 0;
					z-index: 1;
				}

				.conversation-list {
					list-style: none;
					margin: 0;
					padding: 5px 10px;
					gap: 2px;
					display: flex;
					flex-direction: column; // Ensure items stack vertically

					.conversation-item {
						margin: 0;
						position: relative;
						display: flex;
						align-items: center;
						border-radius: 8px;

						&:hover {
							background: var(--bg-color-light-alt);

							.menu-button {
								opacity: 0.5;
							}
						}

						.inline-edit-input {
							background: rgba(0, 0, 0, 0);
							color: var(--text-color);
							margin-left: 15px;
							width: 220px;
							padding: 2px 0;
							box-sizing: border-box;
							font-size: 15px;
							border: none; /* Remove the border */
							// outline: none; /* Remove the outline on focus */
						}

						.conversation-button {
							flex: 1;
							background: none;
							border: none;
							text-align: left;
							padding: 6px 15px;
							cursor: pointer;
							transition: background 0.2s ease;

							.conversation-title {
								font-size: 15px;
								color: var(--text-color);
								white-space: nowrap;
								overflow: hidden;
								width: 220px;
								text-overflow: ellipsis;
							}
						}

						.menu-button {
							background: none;
							border: none;
							width: 36px;
							height: 36px;
							display: flex;
							justify-content: center;
							align-items: center;
							cursor: pointer;
							color: var(--text-color-light);
							margin-right: 5px;
							opacity: 0;
							transition: opacity 0.2s;

							&:hover {
								opacity: 1;
							}

							.dots {
								font-size: 16px;
								transform: rotate(90deg);
								display: inline-block;
								letter-spacing: 0px;
							}
						}

						.dropdown-menu {
							position: absolute;
							right: 20px;
							top: 150%;
							transform: translateY(-50%);
							background: var(--bg-color-light);
							border-radius: 8px;
							box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
							z-index: 100000;

							.dropdown-item {
								display: flex;
								align-items: center;
								width: 100%;
								padding: 10px 15px;
								background: none;
								border: none;
								text-align: left;
								color: var(--text-color);
								cursor: pointer;
								white-space: nowrap;
								font-size: 14px;
								border-radius: 8px;

								&:hover {
									background: rgba(255, 255, 255, 0.1);
								}

								&.delete {
									color: #ff6b6b;
								}

								.icon {
									margin-right: 8px;
									font-size: 16px;
									width: 24px;
									height: 24px;
									padding: 4px;
									box-sizing: border-box;
								}
							}
						}
					}
				}
			}
		}
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 20000;

		.modal-content {
			background: var(--bg-color-dark);
			border-radius: 12px;
			padding: 20px;
			width: 350px;
			max-width: 95%;

			h3 {
				margin-top: 0;
				margin-bottom: 15px;
				font-size: 18px;
				font-weight: 500;
			}

			&.delete-modal {
				p {
					margin-bottom: 10px;
				}
			}

			.modal-actions {
				display: flex;
				justify-content: flex-end;
				gap: 10px;

				button {
					padding: 8px 16px;
					border-radius: 6px;
					font-size: 14px;
					cursor: pointer;

					&.cancel-button {
						background: transparent;
						border: 1px solid var(--bg-color-light);
						color: var(--text-color);

						&:hover {
							background: var(--bg-color-light);
						}
					}

					&.delete-button {
						background: #ff4a4a;
						border: 1px solid #ff4a4a;
						color: white;

						&:hover {
							background: #e53e3e;
						}
					}
				}
			}
		}
	}

	@media (max-width: 810px) {
		.menu-button {
			opacity: 0.5 !important;
		}
	}
</style>
