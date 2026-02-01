<script lang="ts">
    import { query as routeQuery } from "@mateothegreat/svelte5-router";
    import {
        getConversations,
        getMessages,
        sendMessageToConversation,
        startConversation,
        deleteConversation,
        type ChatConversation,
        type ChatMessage,
    } from "../lib/api";
    import LoadingSpinner from "./LoadingSpinner.svelte";
    import { fade, fly } from "svelte/transition";
    import { authClient } from "../lib/auth-client";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";
    import { onMount, onDestroy } from "svelte";

    const session = authClient.useSession();
    const queryClient = useQueryClient();

    // URL query params for auto-selecting conversation
    const listingParam = routeQuery("listing");
    const conversationParam = routeQuery("conversation");

    let selectedConversationId = $state<number | null>(null);
    let messageInput = $state("");
    let sendingMessage = $state(false);
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    let messagesContainer: HTMLDivElement;

    // Delete conversation state
    let showDeleteModal = $state(false);
    let conversationToDelete = $state<ChatConversation | null>(null);
    let deletingConversation = $state(false);

    // Conversations query
    const conversationsQuery = createQuery(() => ({
        queryKey: ["chat-conversations"],
        queryFn: async () => {
            const result = await getConversations();
            return result.success ? result.data || [] : [];
        },
        enabled: !!$session.data?.user,
    }));

    // Messages query for selected conversation
    const messagesQuery = createQuery(() => ({
        queryKey: ["chat-messages", selectedConversationId],
        queryFn: async () => {
            if (!selectedConversationId) return [];
            const result = await getMessages(selectedConversationId);
            return result.success ? result.data || [] : [];
        },
        enabled: !!selectedConversationId,
    }));

    // Auto-select from URL params or find by listing
    $effect(() => {
        if (conversationParam && conversationsQuery.data) {
            const convId = parseInt(conversationParam);
            if (!isNaN(convId)) {
                selectedConversationId = convId;
            }
        } else if (listingParam && conversationsQuery.data) {
            const listingId = parseInt(listingParam);
            if (!isNaN(listingId)) {
                const conv = conversationsQuery.data.find(
                    (c) => c.listingId === listingId,
                );
                if (conv) {
                    selectedConversationId = conv.id;
                }
            }
        }
    });

    // 7-second polling for new messages when viewing a conversation
    $effect(() => {
        if (selectedConversationId) {
            // Clear any existing interval
            if (pollingInterval) clearInterval(pollingInterval);

            pollingInterval = setInterval(() => {
                queryClient.invalidateQueries({
                    queryKey: ["chat-messages", selectedConversationId],
                });
                queryClient.invalidateQueries({
                    queryKey: ["chat-conversations"],
                });
            }, 7000);
        }

        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        };
    });

    // Scroll to bottom when messages change
    $effect(() => {
        if (messagesQuery.data && messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    });

    onDestroy(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
    });

    const selectedConversation = $derived(
        conversationsQuery.data?.find((c) => c.id === selectedConversationId),
    );

    const otherUser = $derived.by(() => {
        if (!selectedConversation || !$session.data?.user) return null;
        return selectedConversation.buyerId === $session.data.user.id
            ? selectedConversation.seller
            : selectedConversation.buyer;
    });

    const isBuyer = $derived.by(() => {
        if (!selectedConversation || !$session.data?.user) return false;
        return selectedConversation.buyerId === $session.data.user.id;
    });

    // Sorted messages (oldest first for display)
    const sortedMessages = $derived(
        [...(messagesQuery.data || [])].sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
        ),
    );

    async function handleSendMessage() {
        if (!messageInput.trim() || sendingMessage) return;

        sendingMessage = true;
        const content = messageInput.trim();
        messageInput = "";

        try {
            let result;
            if (selectedConversationId) {
                result = await sendMessageToConversation(
                    selectedConversationId,
                    content,
                );
            } else if (listingParam) {
                // Start new conversation for this listing
                const listingId = parseInt(listingParam);
                if (!isNaN(listingId)) {
                    result = await startConversation(listingId, content);
                    if (result.success) {
                        // Refetch conversations to get the new one
                        await queryClient.invalidateQueries({
                            queryKey: ["chat-conversations"],
                        });
                        // Wait a moment for the query to refetch, then find and select the new conversation
                        setTimeout(() => {
                            const conversations = queryClient.getQueryData<
                                ChatConversation[]
                            >(["chat-conversations"]);
                            if (conversations) {
                                const newConv = conversations.find(
                                    (c) => c.listingId === listingId,
                                );
                                if (newConv) {
                                    selectedConversationId = newConv.id;
                                }
                            }
                        }, 500);
                    }
                }
            }

            if (result?.success) {
                // Refetch messages
                await queryClient.invalidateQueries({
                    queryKey: ["chat-messages", selectedConversationId],
                });
            } else {
                alert(result?.message || "Failed to send message");
                messageInput = content; // Restore input
            }
        } catch (error) {
            console.error("Error sending message:", error);
            messageInput = content;
        } finally {
            sendingMessage = false;
        }
    }

    function formatTime(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
            });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return date.toLocaleDateString("en-US", { weekday: "short" });
        }
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    function formatMessageTime(dateStr: string) {
        return new Date(dateStr).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    function selectConversation(convId: number) {
        selectedConversationId = convId;
    }

    function openDeleteModal(conv: ChatConversation, e: Event) {
        e.stopPropagation();
        conversationToDelete = conv;
        showDeleteModal = true;
    }

    function closeDeleteModal() {
        showDeleteModal = false;
        conversationToDelete = null;
    }

    async function handleDeleteConversation() {
        if (!conversationToDelete || deletingConversation) return;

        deletingConversation = true;
        try {
            const result = await deleteConversation(conversationToDelete.id);
            if (result.success) {
                // If we're viewing this conversation, deselect it
                if (selectedConversationId === conversationToDelete.id) {
                    selectedConversationId = null;
                }
                // Refresh the conversation list
                await queryClient.invalidateQueries({
                    queryKey: ["chat-conversations"],
                });
                closeDeleteModal();
            } else {
                alert(result.message || "Failed to delete conversation");
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
            alert("An error occurred while deleting the conversation.");
        } finally {
            deletingConversation = false;
        }
    }
</script>

<div
    class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    style="height: calc(100vh - 12rem);"
    in:fly={{ y: 20, duration: 400 }}
>
    <div class="flex h-full">
        <!-- Conversations List (Left Panel) -->
        <div
            class="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col {selectedConversationId
                ? 'hidden md:flex'
                : 'flex'}"
        >
            <!-- Header -->
            <div
                class="p-4 border-b border-gray-100 bg-linear-to-r from-blue-50 to-indigo-50"
            >
                <h1 class="text-lg font-bold text-gray-900">Messages</h1>
                <p class="text-sm text-gray-500">
                    Chat with buyers and sellers
                </p>
            </div>

            <!-- Conversations -->
            <div class="flex-1 overflow-y-auto">
                {#if conversationsQuery.isLoading}
                    <div class="flex items-center justify-center py-12">
                        <LoadingSpinner text="Loading conversations..." />
                    </div>
                {:else if conversationsQuery.data && conversationsQuery.data.length === 0}
                    <div class="p-6 text-center text-gray-500">
                        <svg
                            class="w-16 h-16 mx-auto mb-4 text-gray-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            ></path>
                        </svg>
                        <p class="font-medium">No conversations yet</p>
                        <p class="text-sm mt-1">
                            Start a chat from a book listing
                        </p>
                    </div>
                {:else if conversationsQuery.data}
                    {#each conversationsQuery.data as conv (conv.id)}
                        {@const other =
                            conv.buyerId === $session.data?.user?.id
                                ? conv.seller
                                : conv.buyer}
                        {@const lastMessage = conv.messages?.[0]}
                        <div
                            role="button"
                            tabindex="0"
                            onclick={() => selectConversation(conv.id)}
                            onkeydown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                selectConversation(conv.id)}
                            class="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 relative group {selectedConversationId ===
                            conv.id
                                ? 'bg-blue-50'
                                : ''}"
                        >
                            <!-- Avatar -->
                            {#if other?.image}
                                <img
                                    src={other.image}
                                    alt=""
                                    class="w-12 h-12 rounded-full flex-shrink-0"
                                />
                            {:else}
                                <div
                                    class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                >
                                    {other?.name?.charAt(0) || "?"}
                                </div>
                            {/if}

                            <div class="flex-1 min-w-0 pr-8">
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <span
                                        class="font-medium text-gray-900 truncate"
                                        >{other?.name || "Unknown"}</span
                                    >
                                    {#if lastMessage}
                                        <span
                                            class="text-xs text-gray-400 flex-shrink-0"
                                            >{formatTime(
                                                lastMessage.createdAt,
                                            )}</span
                                        >
                                    {/if}
                                </div>
                                {#if conv.listing}
                                    <p
                                        class="text-xs text-blue-600 truncate mt-0.5"
                                    >
                                        📚 {conv.listing.title}
                                    </p>
                                {/if}
                                {#if lastMessage}
                                    <p
                                        class="text-sm text-gray-500 truncate mt-1"
                                    >
                                        {lastMessage.content}
                                    </p>
                                {/if}
                            </div>

                            <!-- Delete Button -->
                            <button
                                onclick={(e) => openDeleteModal(conv, e)}
                                class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete"
                            >
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- Chat View (Right Panel) -->
        <div
            class="flex-1 flex flex-col {selectedConversationId
                ? 'flex'
                : 'hidden md:flex'}"
        >
            {#if selectedConversationId && selectedConversation}
                <!-- Chat Header -->
                <div
                    class="p-4 border-b border-gray-100 bg-white flex items-center gap-3"
                >
                    <!-- Back button (mobile) -->
                    <button
                        onclick={() => (selectedConversationId = null)}
                        class="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            ></path>
                        </svg>
                    </button>

                    {#if otherUser}
                        {#if otherUser?.image}
                            <img
                                src={otherUser?.image}
                                alt=""
                                class="w-10 h-10 rounded-full"
                            />
                        {:else}
                            <div
                                class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold"
                            >
                                {otherUser?.name?.charAt(0) || "?"}
                            </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900">
                                {otherUser?.name}
                            </p>
                            {#if selectedConversation.listing}
                                <p class="text-xs text-gray-500 truncate">
                                    {isBuyer ? "Seller" : "Buyer"} • {selectedConversation
                                        .listing.title}
                                </p>
                            {/if}
                        </div>
                    {/if}

                    <!-- View book link -->
                    {#if selectedConversation.listing}
                        <a
                            href="/books/{selectedConversation.listingId}"
                            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                        >
                            View Book
                        </a>
                    {/if}
                </div>

                <!-- Messages -->
                <div
                    bind:this={messagesContainer}
                    class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
                >
                    {#if messagesQuery.isLoading}
                        <div class="flex items-center justify-center py-8">
                            <LoadingSpinner text="Loading messages..." />
                        </div>
                    {:else if sortedMessages.length === 0}
                        <div class="text-center py-8 text-gray-500">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    {:else}
                        {#each sortedMessages as message (message.id)}
                            {@const isOwn =
                                message.senderId === $session.data?.user?.id}
                            <div
                                class="flex {isOwn
                                    ? 'justify-end'
                                    : 'justify-start'}"
                                in:fade={{ duration: 150 }}
                            >
                                <div
                                    class="max-w-[75%] {isOwn
                                        ? 'order-2'
                                        : 'order-1'}"
                                >
                                    <div
                                        class="px-4 py-2.5 rounded-2xl {isOwn
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                                            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md shadow-sm'}"
                                    >
                                        <p
                                            class="text-sm whitespace-pre-wrap break-words"
                                        >
                                            {message.content}
                                        </p>
                                    </div>
                                    <p
                                        class="text-[10px] text-gray-400 mt-1 {isOwn
                                            ? 'text-right'
                                            : 'text-left'}"
                                    >
                                        {formatMessageTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

                <!-- Message Input -->
                <div class="p-4 border-t border-gray-100 bg-white">
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                        class="flex items-center gap-3"
                    >
                        <input
                            type="text"
                            bind:value={messageInput}
                            placeholder="Type a message..."
                            disabled={sendingMessage}
                            class="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!messageInput.trim() || sendingMessage}
                            class="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {#if sendingMessage}
                                <div
                                    class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                                ></div>
                            {:else}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                    ></path>
                                </svg>
                            {/if}
                        </button>
                    </form>
                </div>
            {:else if listingParam && !selectedConversationId}
                <!-- New conversation view (Same as original) -->
                <div class="flex-1 flex flex-col">
                    <div
                        class="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3"
                    >
                        <div
                            class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </div>
                        <div>
                            <p class="font-medium text-gray-900">
                                Start New Chat
                            </p>
                            <p class="text-xs text-gray-500">
                                Send your first message to the seller
                            </p>
                        </div>
                    </div>
                    <div
                        class="flex-1 flex items-center justify-center p-8 bg-gray-50/50"
                    >
                        <div class="text-center max-w-sm">
                            <div
                                class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <svg
                                    class="w-10 h-10 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="1.5"
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">
                                Ready to chat!
                            </h3>
                            <p class="text-gray-500 text-sm">
                                Type your message below to start a conversation
                                about this book listing.
                            </p>
                        </div>
                    </div>
                    <!-- Message Input -->
                    <div class="p-4 border-t border-gray-100 bg-white">
                        <form
                            onsubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            class="flex items-center gap-3"
                        >
                            <input
                                type="text"
                                bind:value={messageInput}
                                placeholder="Type your first message..."
                                disabled={sendingMessage}
                                class="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!messageInput.trim() ||
                                    sendingMessage}
                                class="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            {:else}
                <div
                    class="flex-1 flex items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50"
                >
                    <div class="max-w-xs transition-opacity duration-300">
                        <svg
                            class="w-20 h-20 mx-auto mb-4 opacity-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <p class="font-bold text-lg text-gray-500">
                            Pick a chat
                        </p>
                        <p class="text-sm mt-1 opacity-70">
                            Choose a conversation from the left to start
                            messaging.
                        </p>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal (Original Style) -->
{#if showDeleteModal && conversationToDelete}
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        in:fade={{ duration: 200 }}
    >
        <div
            class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8"
            in:fly={{ y: 20, duration: 300 }}
        >
            <div class="text-center">
                <div
                    class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                    <svg
                        class="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">
                    Delete Chat?
                </h3>
                <p class="text-sm text-gray-500 mb-8">
                    This will remove the conversation record for you. It's
                    permanent!
                </p>
            </div>
            <div class="flex gap-4">
                <button
                    onclick={closeDeleteModal}
                    class="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onclick={handleDeleteConversation}
                    disabled={deletingConversation}
                    class="flex-1 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
                >
                    {#if deletingConversation}
                        <div
                            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"
                        ></div>
                    {:else}
                        Delete
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}
