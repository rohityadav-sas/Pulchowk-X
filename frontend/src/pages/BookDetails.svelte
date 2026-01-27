<script lang="ts">
    import { route as routeAction, goto } from "@mateothegreat/svelte5-router";
    import {
        getBookListingById,
        saveBook,
        unsaveBook,
        deleteBookListing,
        markBookAsSold,
        type BookListing,
    } from "../lib/api";
    import LoadingSpinner from "../components/LoadingSpinner.svelte";
    import { fade, fly } from "svelte/transition";
    import { authClient } from "../lib/auth-client";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";

    const { route } = $props();
    const bookId = $derived(parseInt(route.result.path.params.bookId) || 0);

    const session = authClient.useSession();
    const queryClient = useQueryClient();

    let savingBook = $state(false);
    let deletingBook = $state(false);
    let markingSold = $state(false);
    let currentImageIndex = $state(0);
    let isSavedState = $state(false);

    $effect(() => {
        if (!$session.isPending && !$session.error && !$session.data?.user) {
            goto("/register?message=login_required");
        }
    });

    const query = createQuery(() => ({
        queryKey: ["book-listing", bookId],
        queryFn: async () => {
            if (!bookId) throw new Error("Invalid book ID");
            const result = await getBookListingById(bookId);
            if (result.success && result.data) {
                isSavedState = result.data.isSaved || false;
                return result.data;
            }
            throw new Error(result.message || "Failed to load book");
        },
        enabled: bookId > 0,
    }));

    const conditionLabels: Record<string, string> = {
        new: "New",
        like_new: "Like New",
        good: "Good",
        fair: "Fair",
        poor: "Poor",
    };

    const conditionColors: Record<string, string> = {
        new: "bg-emerald-100 text-emerald-700 border-emerald-200",
        like_new: "bg-blue-100 text-blue-700 border-blue-200",
        good: "bg-amber-100 text-amber-700 border-amber-200",
        fair: "bg-orange-100 text-orange-700 border-orange-200",
        poor: "bg-red-100 text-red-700 border-red-200",
    };

    function formatPrice(price: string) {
        return `Rs. ${parseFloat(price).toLocaleString()}`;
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    async function handleSaveBook() {
        if (!$session.data?.user || !query.data) return;

        // Optimistic update
        const previousState = isSavedState;
        isSavedState = !isSavedState;
        savingBook = true;

        try {
            if (previousState) {
                await unsaveBook(bookId);
            } else {
                await saveBook(bookId);
            }

            // Invalidate to ensure sync with server
            await queryClient.invalidateQueries({
                queryKey: ["book-listing", bookId],
            });
            await queryClient.invalidateQueries({ queryKey: ["saved-books"] });
        } catch (error) {
            console.error("Error saving book:", error);
            // Rollback on error
            isSavedState = previousState;
        } finally {
            savingBook = false;
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                "Are you sure you want to delete this listing? This cannot be undone.",
            )
        )
            return;
        deletingBook = true;
        try {
            const result = await deleteBookListing(bookId);
            if (result.success) {
                goto("/books");
            }
        } catch (error) {
            console.error("Error deleting book:", error);
        } finally {
            deletingBook = false;
        }
    }

    async function handleMarkSold() {
        if (
            !confirm(
                "Mark this book as sold? It will no longer appear in the marketplace.",
            )
        )
            return;
        markingSold = true;
        try {
            const result = await markBookAsSold(bookId);
            if (result.success) {
                query.refetch();
            }
        } catch (error) {
            console.error("Error marking book as sold:", error);
        } finally {
            markingSold = false;
        }
    }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
        <!-- Back Button -->
        <a
            href="/books"
            use:routeAction
            class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
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
                />
            </svg>
            Back to Marketplace
        </a>

        {#if query.isLoading}
            <div class="flex items-center justify-center py-20" in:fade>
                <LoadingSpinner size="lg" text="Loading book details..." />
            </div>
        {:else if query.error}
            <div
                class="max-w-md mx-auto p-6 bg-white border border-red-100 rounded-2xl shadow-lg text-center"
                in:fly={{ y: 20, duration: 400 }}
            >
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
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        ></path>
                    </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">
                    Book Not Found
                </h3>
                <p class="text-gray-500 mb-6">{query.error.message}</p>
                <a
                    href="/books"
                    use:routeAction
                    class="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
                >
                    Browse Books
                </a>
            </div>
        {:else if query.data}
            {@const book = query.data}
            <div
                class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                in:fly={{ y: 20, duration: 400 }}
            >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <!-- Image Gallery -->
                    <div
                        class="relative bg-gradient-to-br from-blue-50 to-indigo-100 p-6 lg:p-8"
                    >
                        {#if book.status === "sold"}
                            <div
                                class="absolute inset-0 bg-gray-900/60 z-10 flex items-center justify-center"
                            >
                                <span
                                    class="text-3xl font-bold text-white uppercase tracking-wider"
                                    >Sold</span
                                >
                            </div>
                        {/if}

                        <div
                            class="aspect-square rounded-2xl overflow-hidden bg-white shadow-lg"
                        >
                            {#if book.images && book.images.length > 0}
                                <img
                                    src={book.images[currentImageIndex]
                                        .imageUrl}
                                    alt={book.title}
                                    class="w-full h-full object-contain"
                                />
                            {:else}
                                <div
                                    class="w-full h-full flex items-center justify-center bg-gray-50"
                                >
                                    <svg
                                        class="w-24 h-24 text-gray-200"
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

                        {#if book.images && book.images.length > 1}
                            <div class="flex gap-2 mt-4 overflow-x-auto pb-2">
                                {#each book.images as image, i}
                                    <button
                                        onclick={() => (currentImageIndex = i)}
                                        class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all {i ===
                                        currentImageIndex
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : 'border-transparent opacity-70 hover:opacity-100'}"
                                    >
                                        <img
                                            src={image.imageUrl}
                                            alt=""
                                            class="w-full h-full object-cover"
                                        />
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Book Details -->
                    <div class="p-6 lg:p-8">
                        <div
                            class="flex items-start justify-between gap-4 mb-4"
                        >
                            <div>
                                <span
                                    class="inline-block px-3 py-1 text-sm font-semibold rounded-full border {conditionColors[
                                        book.condition
                                    ]} mb-3"
                                >
                                    {conditionLabels[book.condition]}
                                </span>
                                <h1
                                    class="text-2xl lg:text-3xl font-bold text-gray-900 mb-2"
                                >
                                    {book.title}
                                </h1>
                                <p class="text-lg text-gray-600">
                                    by {book.author}
                                </p>
                            </div>
                        </div>

                        <div class="text-3xl font-bold text-blue-600 mb-6">
                            {formatPrice(book.price)}
                        </div>

                        <!-- Book Metadata -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            {#if book.edition}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >Edition</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.edition}
                                    </p>
                                </div>
                            {/if}
                            {#if book.publisher}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >Publisher</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.publisher}
                                    </p>
                                </div>
                            {/if}
                            {#if book.publicationYear}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >Year</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.publicationYear}
                                    </p>
                                </div>
                            {/if}
                            {#if book.isbn}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >ISBN</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.isbn}
                                    </p>
                                </div>
                            {/if}
                            {#if book.courseCode}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >Course</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.courseCode}
                                    </p>
                                </div>
                            {/if}
                            {#if book.category}
                                <div>
                                    <span class="text-sm text-gray-500"
                                        >Category</span
                                    >
                                    <p class="font-medium text-gray-900">
                                        {book.category.name}
                                    </p>
                                </div>
                            {/if}
                        </div>

                        {#if book.description}
                            <div class="mb-6">
                                <h3
                                    class="text-sm font-medium text-gray-500 mb-2"
                                >
                                    Description
                                </h3>
                                <p class="text-gray-700 whitespace-pre-line">
                                    {book.description}
                                </p>
                            </div>
                        {/if}

                        <!-- Seller Info -->
                        {#if book.seller}
                            <div class="p-4 bg-gray-50 rounded-xl mb-6">
                                <h3
                                    class="text-sm font-medium text-gray-500 mb-3"
                                >
                                    Seller
                                </h3>
                                <div class="flex items-center gap-3">
                                    {#if book.seller.image}
                                        <img
                                            src={book.seller.image}
                                            alt=""
                                            class="w-12 h-12 rounded-full"
                                        />
                                    {:else}
                                        <div
                                            class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg"
                                        >
                                            {book.seller.name.charAt(0)}
                                        </div>
                                    {/if}
                                    <div>
                                        <p class="font-medium text-gray-900">
                                            {book.seller.name}
                                        </p>
                                        {#if book.seller.email}
                                            <a
                                                href="mailto:{book.seller
                                                    .email}"
                                                class="text-sm text-blue-600 hover:underline"
                                                >{book.seller.email}</a
                                            >
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <!-- Action Buttons -->
                        <div class="flex flex-col sm:flex-row gap-3">
                            {#if book.isOwner}
                                <!-- Owner Actions -->
                                <a
                                    href="/books/sell?edit={book.id}"
                                    use:routeAction
                                    class="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-center transition-all"
                                >
                                    Edit Listing
                                </a>
                                {#if book.status === "available"}
                                    <button
                                        onclick={handleMarkSold}
                                        disabled={markingSold}
                                        class="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {markingSold
                                            ? "Marking..."
                                            : "Mark as Sold"}
                                    </button>
                                {/if}
                                <button
                                    onclick={handleDelete}
                                    disabled={deletingBook}
                                    class="px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-all disabled:opacity-50"
                                >
                                    {deletingBook ? "Deleting..." : "Delete"}
                                </button>
                            {:else if $session.data?.user && book.status === "available"}
                                <!-- Buyer Actions -->
                                <button
                                    onclick={handleSaveBook}
                                    disabled={savingBook}
                                    class="flex-1 px-6 py-3 {isSavedState
                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'} font-medium rounded-xl border transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 group"
                                >
                                    <svg
                                        class="w-5 h-5 transition-transform group-active:scale-125"
                                        fill={isSavedState ? "#e11d48" : "none"}
                                        stroke={isSavedState
                                            ? "#e11d48"
                                            : "currentColor"}
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                        />
                                    </svg>
                                    {savingBook
                                        ? "Updating..."
                                        : isSavedState
                                          ? "Saved to Wishlist"
                                          : "Save to Wishlist"}
                                </button>
                                {#if book.seller?.email}
                                    <a
                                        href="mailto:{book.seller
                                            .email}?subject=Interested in: {book.title}"
                                        class="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-center transition-all"
                                    >
                                        Contact Seller
                                    </a>
                                {/if}
                            {:else if !$session.data?.user}
                                <a
                                    href="/register"
                                    use:routeAction
                                    class="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-center transition-all"
                                >
                                    Sign in to Contact Seller
                                </a>
                            {/if}
                        </div>

                        <!-- Meta Info -->
                        <div
                            class="flex items-center gap-4 mt-6 text-sm text-gray-500"
                        >
                            <span>Posted {formatDate(book.createdAt)}</span>
                            <span>•</span>
                            <span>{book.viewCount} views</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
