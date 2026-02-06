<script lang="ts">
  import { goto, route } from '@mateothegreat/svelte5-router'
  import { fade, fly } from 'svelte/transition'
  import { onMount } from 'svelte'
  import { searchEverything, type GlobalSearchResponse } from '../lib/api'

  let wrapper: HTMLDivElement | null = $state(null)
  let query = $state('')
  let open = $state(false)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let results = $state<GlobalSearchResponse | null>(null)

  const trimmedQuery = $derived(query.trim())

  let debounce: ReturnType<typeof setTimeout> | null = null

  async function runSearch(term: string) {
    loading = true
    error = null
    const response = await searchEverything(term, 4)
    if (response.success && response.data) {
      results = response.data
    } else {
      error = response.message || 'Search failed'
      results = null
    }
    loading = false
  }

  function submitSearch() {
    const term = trimmedQuery
    if (!term) return

    open = false
    goto(`/search?q=${encodeURIComponent(term)}`)
  }

  function handleClickOutside(event: MouseEvent) {
    if (!wrapper) return
    if (!wrapper.contains(event.target as Node)) open = false
  }

  onMount(() => {
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  })

  $effect(() => {
    const term = trimmedQuery

    if (debounce) clearTimeout(debounce)

    if (!open || term.length < 2) {
      loading = false
      if (term.length < 2) results = null
      return
    }

    debounce = setTimeout(() => {
      runSearch(term)
    }, 250)

    return () => {
      if (debounce) clearTimeout(debounce)
    }
  })
</script>

<div bind:this={wrapper} class="relative w-full max-w-2xl">
  <form
    class="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 shadow-xl shadow-slate-200/40"
    onsubmit={(e) => {
      e.preventDefault()
      submitSearch()
    }}
  >
    <div class="flex-1 flex items-center gap-3 px-3">
      <svg
        class="w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-5.2-5.2M16 10.8a5.2 5.2 0 11-10.4 0 5.2 5.2 0 0110.4 0z"
        />
      </svg>
      <input
        bind:value={query}
        onfocus={() => (open = true)}
        placeholder="Search clubs, events, books, notices, locations..."
        class="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
      />
    </div>
    <button
      type="submit"
      class="px-4 py-2 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700 transition"
    >
      Search
    </button>
  </form>

  {#if open && trimmedQuery.length >= 2}
    <div
      class="absolute z-[60] top-[calc(100%+0.5rem)] w-full bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/30 overflow-hidden"
      transition:fade
    >
      {#if loading}
        <div class="px-4 py-6 text-sm text-slate-500">Searching campus...</div>
      {:else if error}
        <div class="px-4 py-6 text-sm text-rose-600">{error}</div>
      {:else if results}
        <div class="max-h-[65vh] overflow-auto">
          {#if results.total === 0}
            <div class="px-4 py-6 text-sm text-slate-500">No results found.</div>
          {:else}
            <div class="p-3 text-xs uppercase tracking-[0.18em] font-bold text-slate-400">
              Quick Results
            </div>

            {#if results.clubs.length > 0}
              <div class="px-3 pb-2">
                <p class="px-2 py-1 text-xs font-semibold text-slate-500">Clubs</p>
                {#each results.clubs as club}
                  <a
                    use:route
                    href={`/clubs/${club.id}`}
                    onclick={() => (open = false)}
                    class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cyan-50 transition"
                  >
                    <div class="w-8 h-8 rounded-lg bg-cyan-100 overflow-hidden flex items-center justify-center">
                      {#if club.logoUrl}
                        <img src={club.logoUrl} alt={club.name} class="w-full h-full object-cover" />
                      {:else}
                        <span class="text-xs font-bold text-cyan-700">{club.name.charAt(0)}</span>
                      {/if}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 truncate">{club.name}</p>
                    </div>
                  </a>
                {/each}
              </div>
            {/if}

            {#if results.events.length > 0}
              <div class="px-3 pb-2">
                <p class="px-2 py-1 text-xs font-semibold text-slate-500">Events</p>
                {#each results.events as event}
                  <a
                    use:route
                    href={`/clubs/${event.clubId}/events/${event.id}`}
                    onclick={() => (open = false)}
                    class="block px-2 py-2 rounded-lg hover:bg-blue-50 transition"
                  >
                    <p class="text-sm font-semibold text-slate-800 truncate">{event.title}</p>
                    <p class="text-xs text-slate-500 truncate">{event.club?.name || 'Event'}</p>
                  </a>
                {/each}
              </div>
            {/if}

            {#if results.books.length > 0}
              <div class="px-3 pb-2">
                <p class="px-2 py-1 text-xs font-semibold text-slate-500">Books</p>
                {#each results.books as book}
                  <a
                    use:route
                    href={`/books/${book.id}`}
                    onclick={() => (open = false)}
                    class="block px-2 py-2 rounded-lg hover:bg-emerald-50 transition"
                  >
                    <p class="text-sm font-semibold text-slate-800 truncate">{book.title}</p>
                    <p class="text-xs text-slate-500 truncate">by {book.author}</p>
                  </a>
                {/each}
              </div>
            {/if}

            {#if results.notices.length > 0}
              <div class="px-3 pb-2">
                <p class="px-2 py-1 text-xs font-semibold text-slate-500">Notices</p>
                {#each results.notices as note}
                  <a
                    use:route
                    href="/notices"
                    onclick={() => (open = false)}
                    class="block px-2 py-2 rounded-lg hover:bg-amber-50 transition"
                  >
                    <p class="text-sm font-semibold text-slate-800 truncate">{note.title}</p>
                  </a>
                {/each}
              </div>
            {/if}

            {#if results.places.length > 0}
              <div class="px-3 pb-2">
                <p class="px-2 py-1 text-xs font-semibold text-slate-500">Locations</p>
                {#each results.places as place}
                  <a
                    use:route
                    href="/map"
                    onclick={() => (open = false)}
                    class="block px-2 py-2 rounded-lg hover:bg-indigo-50 transition"
                  >
                    <p class="text-sm font-semibold text-slate-800 truncate">{place.name}</p>
                    <p class="text-xs text-slate-500 truncate">{place.description}</p>
                  </a>
                {/each}
              </div>
            {/if}

            <div class="p-3 border-t border-slate-100">
              <button
                onclick={submitSearch}
                class="w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
              >
                View all results for "{trimmedQuery}"
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

