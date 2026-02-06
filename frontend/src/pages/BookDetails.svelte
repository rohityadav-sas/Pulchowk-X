<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { route as routeAction, goto } from '@mateothegreat/svelte5-router'
  import {
    getBookListingById,
    saveBook,
    unsaveBook,
    deleteBookListing,
    markBookAsSold,
    type BookListing,
  } from '../lib/api'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'
  import { fade, fly } from 'svelte/transition'
  import { authClient } from '../lib/auth-client'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  const { route } = $props()
  const bookId = $derived(parseInt(route.result.path.params.bookId) || 0)

  const session = authClient.useSession()
  const queryClient = useQueryClient()

  let hasRedirectedToLogin = $state(false)
  let activeImageIndex = $state(0)
  let saving = $state(false)
  let deleting = $state(false)
  let markingSold = $state(false)
  let savedState = $state(false)

  onMount(() => {
    window.scrollTo(0, 0)
  })

  $effect(() => {
    if (hasRedirectedToLogin) return

    if (!$session.isPending && !$session.error && !$session.data?.user) {
      hasRedirectedToLogin = true
      untrack(() => {
        goto('/register?message=login_required')
      })
    }
  })

  const bookQuery = createQuery(() => ({
    queryKey: ['book-listing', bookId],
    queryFn: async () => {
      if (!bookId) throw new Error('Invalid book ID')
      const result = await getBookListingById(bookId)
      if (result.success && result.data) {
        savedState = result.data.isSaved || false
        return result.data
      }
      throw new Error(result.message || 'Failed to load listing')
    },
    enabled: bookId > 0,
  }))

  $effect(() => {
    const total = bookQuery.data?.images?.length || 0
    if (total === 0) {
      activeImageIndex = 0
      return
    }
    if (activeImageIndex > total - 1) activeImageIndex = 0
  })

  const conditionLabel: Record<BookListing['condition'], string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }

  const conditionTone: Record<BookListing['condition'], string> = {
    new: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    like_new: 'bg-blue-100 text-blue-700 border-blue-200',
    good: 'bg-amber-100 text-amber-700 border-amber-200',
    fair: 'bg-orange-100 text-orange-700 border-orange-200',
    poor: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  function formatPrice(price: string) {
    return `Rs. ${parseFloat(price).toLocaleString()}`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  async function handleSaveToggle() {
    if (!bookQuery.data || !$session.data?.user || saving) return

    const previous = savedState
    savedState = !savedState
    saving = true

    try {
      if (previous) await unsaveBook(bookId)
      else await saveBook(bookId)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['book-listing', bookId] }),
        queryClient.invalidateQueries({ queryKey: ['saved-books'] }),
      ])
    } catch (error) {
      console.error('Failed to toggle saved state:', error)
      savedState = previous
    } finally {
      saving = false
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this listing permanently?')) return

    deleting = true
    try {
      const result = await deleteBookListing(bookId)
      if (result.success) {
        goto('/books')
      } else {
        alert(result.message || 'Could not delete listing.')
      }
    } catch (error) {
      console.error('Failed to delete listing:', error)
    } finally {
      deleting = false
    }
  }

  async function handleMarkSold() {
    if (!confirm('Mark this listing as sold?')) return

    markingSold = true
    try {
      const result = await markBookAsSold(bookId)
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['book-listing', bookId] })
        await bookQuery.refetch()
      } else {
        alert(result.message || 'Could not mark as sold.')
      }
    } catch (error) {
      console.error('Failed to mark sold:', error)
    } finally {
      markingSold = false
    }
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/50 px-4 py-5 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto">
    <a
      href="/books"
      use:routeAction
      class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Back to Marketplace
    </a>

    {#if bookQuery.isLoading}
      <div class="py-20 flex items-center justify-center" in:fade>
        <LoadingSpinner size="lg" text="Loading listing..." />
      </div>
    {:else if bookQuery.error}
      <div
        class="mt-5 max-w-md mx-auto rounded-2xl bg-white border border-red-100 shadow-sm p-6 text-center"
        in:fly={{ y: 16, duration: 260 }}
      >
        <div class="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900">Book not found</h2>
        <p class="text-sm text-gray-500 mt-1">{bookQuery.error.message}</p>
      </div>
    {:else if bookQuery.data}
      {@const book = bookQuery.data}
      {@const hasImages = !!book.images && book.images.length > 0}
      {@const activeImage = hasImages ? book.images![activeImageIndex] : null}

      <section
        class="mt-4 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
        in:fly={{ y: 12, duration: 260 }}
      >
        <div class="grid grid-cols-1 lg:grid-cols-2">
          <div class="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-gray-100">
            <div class="h-80 sm:h-96 lg:h-[28rem] w-full bg-white rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
              {#if activeImage}
                <img
                  src={activeImage.imageUrl}
                  alt={book.title}
                  class="w-full h-full object-contain p-2"
                />
              {:else}
                <div class="text-center text-gray-300">
                  <svg class="w-14 h-14 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.6"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <p class="text-xs mt-2">No image uploaded</p>
                </div>
              {/if}
            </div>

            {#if hasImages && book.images!.length > 1}
              <div class="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
                {#each book.images as image, index (image.id)}
                  <button
                    onclick={() => (activeImageIndex = index)}
                    class="aspect-square rounded-lg overflow-hidden border transition {index === activeImageIndex
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'}"
                    aria-label={`Open image ${index + 1}`}
                  >
                    <img src={image.imageUrl} alt="" class="w-full h-full object-cover" />
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold {conditionTone[
                    book.condition
                  ]}"
                >
                  {conditionLabel[book.condition]}
                </span>
                <h1 class="mt-2 text-2xl font-extrabold text-gray-900 leading-tight">
                  {book.title}
                </h1>
                <p class="mt-1 text-sm text-gray-600">by {book.author}</p>
              </div>

              {#if book.status === 'sold'}
                <span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                  Sold
                </span>
              {/if}
            </div>

            <div class="mt-4 text-2xl font-black text-blue-700">{formatPrice(book.price)}</div>

            <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
              {#if book.edition}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">Edition</p>
                  <p class="font-semibold text-gray-900 mt-0.5">{book.edition}</p>
                </div>
              {/if}
              {#if book.publisher}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">Publisher</p>
                  <p class="font-semibold text-gray-900 mt-0.5">{book.publisher}</p>
                </div>
              {/if}
              {#if book.publicationYear}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">Year</p>
                  <p class="font-semibold text-gray-900 mt-0.5">{book.publicationYear}</p>
                </div>
              {/if}
              {#if book.category}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">Category</p>
                  <p class="font-semibold text-gray-900 mt-0.5">{book.category.name}</p>
                </div>
              {/if}
              {#if book.isbn}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5 col-span-2">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">ISBN</p>
                  <p class="font-semibold text-gray-900 mt-0.5 break-all">{book.isbn}</p>
                </div>
              {/if}
              {#if book.courseCode}
                <div class="rounded-lg bg-gray-50 border border-gray-100 p-2.5 col-span-2">
                  <p class="text-[11px] uppercase tracking-wide text-gray-500">Course</p>
                  <p class="font-semibold text-gray-900 mt-0.5">{book.courseCode}</p>
                </div>
              {/if}
            </div>

            {#if book.description}
              <div class="mt-5">
                <h2 class="text-xs font-bold uppercase tracking-wide text-gray-500">Description</h2>
                <p class="text-sm text-gray-700 mt-1 whitespace-pre-line">{book.description}</p>
              </div>
            {/if}

            {#if book.seller}
              <div class="mt-5 rounded-xl border border-gray-100 bg-slate-50 p-3.5">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-500">Seller</p>
                <div class="mt-2 flex items-center gap-3">
                  {#if book.seller.image}
                    <img src={book.seller.image} alt="" class="w-10 h-10 rounded-full" />
                  {:else}
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                      {book.seller.name.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{book.seller.name}</p>
                    {#if book.seller.email}
                      <a href="mailto:{book.seller.email}" class="text-xs text-blue-700 hover:underline break-all">
                        {book.seller.email}
                      </a>
                    {/if}
                  </div>
                  {#if book.seller.isVerifiedSeller}
                    <span class="ml-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  {/if}
                </div>
              </div>
            {/if}

            <div class="mt-5 flex flex-wrap gap-2.5">
              {#if book.isOwner}
                {#if book.status === 'available'}
                  <a
                    href="/books/sell?edit={book.id}"
                    use:routeAction
                    class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Edit Listing
                  </a>
                  <button
                    onclick={handleMarkSold}
                    disabled={markingSold}
                    class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {markingSold ? 'Marking...' : 'Mark as Sold'}
                  </button>
                {/if}
                <button
                  onclick={handleDelete}
                  disabled={deleting}
                  class="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              {:else if $session.data?.user && book.status === 'available'}
                <button
                  onclick={handleSaveToggle}
                  disabled={saving}
                  class="px-4 py-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 {savedState
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
                >
                  {saving ? 'Updating...' : savedState ? 'Saved' : 'Save'}
                </button>
                <a
                  href="/messages?listing={book.id}"
                  class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Message Seller
                </a>
              {:else if !$session.data?.user && book.status === 'available'}
                <a
                  href="/register"
                  use:routeAction
                  class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Sign in to interact
                </a>
              {/if}
            </div>

            <div class="mt-5 text-xs text-gray-500 flex items-center gap-2">
              <span>Posted {formatDate(book.createdAt)}</span>
              <span>•</span>
              <span>{book.viewCount} views</span>
            </div>
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>

