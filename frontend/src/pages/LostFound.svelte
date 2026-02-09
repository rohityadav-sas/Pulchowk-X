<script lang="ts">
  import { onMount } from 'svelte'
  import { route } from '@mateothegreat/svelte5-router'
  import {
    getLostFoundItems,
    type LostFoundCategory,
    type LostFoundItem,
    type LostFoundStatus,
    type LostFoundItemType,
  } from '../lib/api'
  import { authClient } from '../lib/auth-client'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'

  const session = authClient.useSession()
  const isGuest = $derived(($session.data?.user as any)?.role === 'guest')
  const canManage = $derived(!!$session.data?.user && !isGuest)

  const categories: Array<{ value: LostFoundCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All categories' },
    { value: 'documents', label: 'Documents' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'ids_cards', label: 'ID Cards' },
    { value: 'keys', label: 'Keys' },
    { value: 'bags', label: 'Bags' },
    { value: 'other', label: 'Other' },
  ]

  const statuses: Array<{ value: LostFoundStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Open + Claimed' },
    { value: 'open', label: 'Open' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ]

  let itemType = $state<LostFoundItemType>('lost')
  let category = $state<LostFoundCategory | 'all'>('all')
  let status = $state<LostFoundStatus | 'all'>('all')
  let search = $state('')

  let loading = $state(true)
  let loadingMore = $state(false)
  let error = $state<string | null>(null)
  let items = $state<LostFoundItem[]>([])
  let nextCursor = $state<string | null>(null)
  let hasMore = $state(false)
  let total = $state(0)
  let refreshToken = $state(0)
  let lastFilterKey = $state('')

  function formatDate(dateLike: string) {
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 'Unknown date'
    return date.toLocaleDateString()
  }

  function statusClass(value: LostFoundStatus) {
    if (value === 'open') return 'bg-emerald-100 text-emerald-700'
    if (value === 'claimed') return 'bg-amber-100 text-amber-700'
    if (value === 'resolved') return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-700'
  }

  async function fetchItems(reset: boolean) {
    if (reset) {
      loading = true
      error = null
      nextCursor = null
      hasMore = false
    } else {
      loadingMore = true
    }

    const result = await getLostFoundItems({
      itemType,
      category: category === 'all' ? undefined : category,
      status: status === 'all' ? undefined : status,
      q: search.trim() || undefined,
      limit: 8,
      cursor: reset ? null : nextCursor,
    })

    if (!result.success || !result.data) {
      error = result.message || 'Failed to load lost/found items.'
      if (reset) {
        items = []
      }
    } else {
      if (reset) items = result.data.items
      else items = [...items, ...result.data.items]
      nextCursor = result.data.nextCursor
      hasMore = result.data.hasMore
      total = result.meta?.total ?? items.length
    }

    loading = false
    loadingMore = false
  }

  async function refresh() {
    refreshToken += 1
    lastFilterKey = `${itemType}|${category}|${status}|${search.trim()}|${refreshToken}`
    await fetchItems(true)
  }

  async function loadMore() {
    if (!hasMore || loadingMore || loading) return
    await fetchItems(false)
  }

  onMount(async () => {
    await fetchItems(true)
  })

  $effect(() => {
    const key = `${itemType}|${category}|${status}|${search.trim()}|${refreshToken}`
    if (!loading && key !== lastFilterKey) {
      lastFilterKey = key
      fetchItems(true)
    } else if (loading && lastFilterKey === '') {
      lastFilterKey = key
    }
  })
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Lost & Found</h1>
        <p class="text-sm text-slate-500 mt-1">
          Browse reported campus items and help reunite owners with belongings.
        </p>
      </div>
      <div class="flex items-center gap-2">
        {#if canManage}
          <a
            use:route
            href="/lost-found/my"
            class="cursor-pointer inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            My Posts
          </a>
          <a
            use:route
            href="/lost-found/report"
            class="cursor-pointer inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Report Item
          </a>
        {/if}
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap gap-2">
        <button
          class="cursor-pointer inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-semibold {itemType ===
          'lost'
            ? 'bg-blue-600 text-white'
            : 'border border-slate-200 bg-white text-slate-700'}"
          onclick={() => (itemType = 'lost')}
        >
          Lost
        </button>
        <button
          class="cursor-pointer inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-semibold {itemType ===
          'found'
            ? 'bg-blue-600 text-white'
            : 'border border-slate-200 bg-white text-slate-700'}"
          onclick={() => (itemType = 'found')}
        >
          Found
        </button>
        <input
          type="text"
          placeholder="Search title, location, or description..."
          bind:value={search}
          class="min-w-[260px] flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-hidden"
        />
        <div class="relative">
          <select
            bind:value={category}
            class="cursor-pointer bg-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-700"
          >
            {#each categories as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <svg
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div class="relative">
          <select
            bind:value={status}
            class="cursor-pointer bg-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-700"
          >
            {#each statuses as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <svg
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <button
          class="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onclick={refresh}
        >
          Refresh
        </button>
      </div>
    </div>

    {#if loading}
      <div class="rounded-2xl border border-slate-200 bg-white p-8">
        <LoadingSpinner text="Loading items..." />
      </div>
    {:else if error}
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p class="font-semibold">Failed to load lost/found items</p>
        <p class="text-sm mt-1">{error}</p>
      </div>
    {:else}
      <div class="space-y-3">
        <p class="text-xs text-slate-500">{items.length} of {total} items</p>
        {#if items.length === 0}
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p class="text-lg font-semibold text-slate-800">No items found</p>
            <p class="text-sm text-slate-500 mt-1">
              Try changing filters or search terms.
            </p>
          </div>
        {:else}
          {#each items as item (item.id)}
            <a
              use:route
              href={`/lost-found/${item.id}`}
              class="cursor-pointer block rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
            >
              <div class="flex items-start gap-3">
                <div class="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                  {#if item.images?.[0]?.imageUrl}
                    <img
                      src={item.images[0].imageUrl}
                      alt={item.title}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-slate-400">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 7h18M7 3v4m10-4v4M5 11h14v8H5z"
                        />
                      </svg>
                    </div>
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-bold text-slate-900 truncate">{item.title}</h3>
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold {statusClass(item.status)}"
                    >
                      {item.status}
                    </span>
                    <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p class="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                  <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{item.itemType === 'lost' ? 'Lost on' : 'Found on'} {formatDate(item.lostFoundDate)}</span>
                    <span>{item.locationText}</span>
                    {#if item.owner?.name}
                      <span>Posted by {item.owner.name}</span>
                    {/if}
                  </div>
                </div>
              </div>
            </a>
          {/each}
        {/if}
      </div>

      {#if hasMore}
        <div class="flex justify-center pt-2">
          <button
            class="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onclick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
