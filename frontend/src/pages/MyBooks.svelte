<script lang="ts">
    import { route as routeAction, goto } from "@mateothegreat/svelte5-router";
    import {
        getMyBookListings,
        getSavedBooks,
        deleteBookListing,
        markBookAsSold,
        unsaveBook,
        type BookListing,
        type SavedBook,
    } from "../lib/api";
    import LoadingSpinner from "../components/LoadingSpinner.svelte";
    import { fade, fly } from "svelte/transition";
    import { authClient } from "../lib/auth-client";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";

    const session = authClient.useSession();
    const queryClient = useQueryClient();

    let activeTab = $state<"listings" | "saved">("listings");

    $effect(() => {
        if (!$session.isPending && !$session.data?.user) {
            goto("/register?message=login_required");
        }
    });

    const myListingsQuery = createQuery(() => ({
        queryKey: ["my-book-listings"],
        queryFn: async () => {
            const result = await getMyBookListings();
            if (result.success && result.data) {
                return result.data;
            }
            throw new Error(result.message || "Failed to load listings");
        },
        enabled: !!$session.data?.user,
    }));

    const savedBooksQuery = createQuery(() => ({
        queryKey: ["saved-books"],
        queryFn: async () => {
            const result = await getSavedBooks();
            if (result.success && result.data) {
                return result.data;
            }
            throw new Error(result.message || "Failed to load saved books");
        },
        enabled: !!$session.data?.user,
    }));

    const conditionLabels: Record<string, string> = {
        new: "New",
        like_new: "Like New",
        good: "Good",
        fair: "Fair",
        poor: "Poor",
    };

    const conditionColors: Record<string, string> = {
        new: "bg-emerald-100 text-emerald-700",
        like_new: "bg-blue-100 text-blue-700",
        good: "bg-amber-100 text-amber-700",
        fair: "bg-orange-100 text-orange-700",
        poor: "bg-red-100 text-red-700",
    };

    const statusColors: Record<string, string> = {
        available: "bg-green-100 text-green-700",
        pending: "bg-yellow-100 text-yellow-700",
        sold: "bg-gray-100 text-gray-700",
        removed: "bg-red-100 text-red-700",
    };

    function formatPrice(price: string) {
        return `Rs. ${parseFloat(price).toLocaleString()}`;
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        const result = await deleteBookListing(id);
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ["my-book-listings"] });
        }
    }

    async function handleMarkSold(id: number) {
        if (!confirm("Mark this book as sold?")) return;
        const result = await markBookAsSold(id);
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ["my-book-listings"] });
        }
    }

    async function handleUnsave(listingId: number) {
        const result = await unsaveBook(listingId);
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ["saved-books"] });
        }
    }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
        <!-- Back Button -->
        <a
            href="/books"
            use:routeAction
            class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
        >
            <svg
                class="w-5 h-5 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
            </svg>
            Back to Marketplace
        </a>

        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
            <div>
                <a href="/books" use:routeAction class="group block">
                    <h1
                        class="text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                    >
                        My <span class="text-blue-600">Books</span>
                    </h1>
                </a>
                <p class="text-gray-600 mt-1">
                    Manage your listings and saved books
                </p>
            </div>
            <a
                href="/books/sell"
                use:routeAction
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
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
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Sell a Book
            </a>
        </div>

        <!-- Tabs -->
        <div
            class="flex gap-2 mb-6 bg-white p-1.5 rounded-xl border border-gray-100 w-fit"
        >
            <button
                onclick={() => (activeTab = "listings")}
                class="px-6 py-2.5 rounded-lg font-medium transition-all {activeTab ===
                'listings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'}"
            >
                My Listings
                {#if myListingsQuery.data}
                    <span
                        class="ml-2 px-2 py-0.5 text-xs rounded-full {activeTab ===
                        'listings'
                            ? 'bg-blue-500'
                            : 'bg-gray-100'}"
                    >
                        {myListingsQuery.data.length}
                    </span>
                {/if}
            </button>
            <button
                onclick={() => (activeTab = "saved")}
                class="px-6 py-2.5 rounded-lg font-medium transition-all {activeTab ===
                'saved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'}"
            >
                Saved Books
                {#if savedBooksQuery.data}
                    <span
                        class="ml-2 px-2 py-0.5 text-xs rounded-full {activeTab ===
                        'saved'
                            ? 'bg-blue-500'
                            : 'bg-gray-100'}"
                    >
                        {savedBooksQuery.data.length}
                    </span>
                {/if}
            </button>
        </div>

        <!-- My Listings Tab -->
        {#if activeTab === "listings"}
            {#if myListingsQuery.isLoading}
                <div class="flex items-center justify-center py-20" in:fade>
                    <LoadingSpinner size="lg" text="Loading your listings..." />
                </div>
            {:else if myListingsQuery.error}
                <div
                    class="p-6 bg-white border border-red-100 rounded-2xl text-center"
                >
                    <p class="text-red-600 mb-4">
                        {myListingsQuery.error.message}
                    </p>
                    <button
                        onclick={() => myListingsQuery.refetch()}
                        class="px-4 py-2 bg-red-600 text-white rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            {:else if !myListingsQuery.data || myListingsQuery.data.length === 0}
                <div
                    class="text-center py-16 bg-white rounded-2xl border border-gray-100"
                    in:fade
                >
                    <svg
                        class="w-16 h-16 text-gray-200 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        ></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                        No listings yet
                    </h3>
                    <p class="text-gray-500 mb-6">
                        Start selling your books to other students.
                    </p>
                    <a
                        href="/books/sell"
                        use:routeAction
                        class="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Create Your First Listing
                    </a>
                </div>
            {:else}
                <div class="space-y-4" in:fade>
                    {#each myListingsQuery.data as book (book.id)}
                        <div
                            class="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
                        >
                            <div class="flex gap-4">
                                <!-- Image -->
                                <a
                                    href="/books/{book.id}"
                                    use:routeAction
                                    class="flex-shrink-0"
                                >
                                    <div
                                        class="w-20 h-24 rounded-lg overflow-hidden bg-gray-100"
                                    >
                                        {#if book.images && book.images.length > 0}
                                            <img
                                                src={book.images[0].imageUrl}
                                                alt=""
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <svg
                                                    class="w-8 h-8 text-gray-300"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="1.5"
                                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                                    ></path>
                                                </svg>
                                            </div>
                                        {/if}
                                    </div>
                                </a>

                                <!-- Details -->
                                <div class="flex-1 min-w-0">
                                    <div
                                        class="flex items-start justify-between gap-2"
                                    >
                                        <div>
                                            <a
                                                href="/books/{book.id}"
                                                use:routeAction
                                                class="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                                            >
                                                {book.title}
                                            </a>
                                            <p class="text-sm text-gray-500">
                                                {book.author}
                                            </p>
                                        </div>
                                        <span
                                            class="px-2.5 py-1 text-xs font-medium rounded-full {statusColors[
                                                book.status
                                            ]}"
                                        >
                                            {book.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                book.status.slice(1)}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-3 mt-2">
                                        <span
                                            class="text-lg font-bold text-blue-600"
                                            >{formatPrice(book.price)}</span
                                        >
                                        <span
                                            class="px-2 py-0.5 text-xs font-medium rounded {conditionColors[
                                                book.condition
                                            ]}"
                                        >
                                            {conditionLabels[book.condition]}
                                        </span>
                                    </div>

                                    <div
                                        class="flex items-center justify-between mt-3"
                                    >
                                        <span class="text-xs text-gray-400">
                                            Listed {formatDate(book.createdAt)} •
                                            {book.viewCount} views
                                        </span>
                                        <div
                                            class="flex flex-wrap gap-2 pt-2 border-t border-slate-50"
                                        >
                                            {#if book.status === "available"}
                                                <button
                                                    onclick={() =>
                                                        handleMarkSold(book.id)}
                                                    class="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-200 hover:shadow-md active:scale-95"
                                                >
                                                    <svg
                                                        class="w-3.5 h-3.5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        ><path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2.5"
                                                            d="M5 13l4 4L19 7"
                                                        /></svg
                                                    >
                                                    Mark Sold
                                                </button>
                                            {/if}
                                            <a
                                                href="/books/sell?edit={book.id}"
                                                use:routeAction
                                                class="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all shadow-sm shadow-blue-200 hover:shadow-md active:scale-95"
                                            >
                                                <svg
                                                    class="w-3.5 h-3.5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    ><path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2.5"
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    /></svg
                                                >
                                                Edit
                                            </a>
                                            <button
                                                onclick={() =>
                                                    handleDelete(book.id)}
                                                class="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all shadow-sm shadow-rose-200 hover:shadow-md active:scale-95"
                                            >
                                                <svg
                                                    class="w-3.5 h-3.5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    ><path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2.5"
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    /></svg
                                                >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}

        <!-- Saved Books Tab -->
        {#if activeTab === "saved"}
            {#if savedBooksQuery.isLoading}
                <div class="flex items-center justify-center py-20" in:fade>
                    <LoadingSpinner size="lg" text="Loading saved books..." />
                </div>
            {:else if savedBooksQuery.error}
                <div
                    class="p-6 bg-white border border-red-100 rounded-2xl text-center"
                >
                    <p class="text-red-600 mb-4">
                        {savedBooksQuery.error.message}
                    </p>
                    <button
                        onclick={() => savedBooksQuery.refetch()}
                        class="px-4 py-2 bg-red-600 text-white rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            {:else if !savedBooksQuery.data || savedBooksQuery.data.length === 0}
                <div
                    class="text-center py-16 bg-white rounded-2xl border border-gray-100"
                    in:fade
                >
                    <svg
                        class="w-16 h-16 text-gray-200 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                        No saved books
                    </h3>
                    <p class="text-gray-500 mb-6">
                        Books you save will appear here.
                    </p>
                    <a
                        href="/books"
                        use:routeAction
                        class="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Browse Marketplace
                    </a>
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    in:fade
                >
                    {#each savedBooksQuery.data as saved (saved.id)}
                        {#if saved.listing}
                            {@const book = saved.listing}
                            <div
                                class="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <a href="/books/{book.id}" use:routeAction>
                                    <div
                                        class="h-32 bg-gradient-to-br from-blue-50 to-indigo-100"
                                    >
                                        {#if book.images && book.images.length > 0}
                                            <img
                                                src={book.images[0].imageUrl}
                                                alt=""
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <svg
                                                    class="w-12 h-12 text-blue-200"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="1.5"
                                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                                    ></path>
                                                </svg>
                                            </div>
                                        {/if}
                                    </div>
                                </a>
                                <div class="p-4">
                                    <a
                                        href="/books/{book.id}"
                                        use:routeAction
                                        class="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                                    >
                                        {book.title}
                                    </a>
                                    <p class="text-sm text-gray-500 mb-2">
                                        {book.author}
                                    </p>
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <span class="font-bold text-blue-600"
                                            >{formatPrice(book.price)}</span
                                        >
                                        <button
                                            onclick={() =>
                                                handleUnsave(book.id)}
                                            class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove from saved"
                                        >
                                            <svg
                                                class="w-5 h-5"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
