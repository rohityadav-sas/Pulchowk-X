<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'
  import { query as routeQuery, route } from '@mateothegreat/svelte5-router'
  import { fade, fly } from 'svelte/transition'
  import { searchEverything } from '../lib/api'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'

  const q = routeQuery('q') || ''
  const searchTerm = $derived((q || '').trim())

  const searchQuery = createQuery(() => ({
    queryKey: ['global-search', searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      const result = await searchEverything(searchTerm, 20)
      if (result.success && result.data) return result.data
      throw new Error(result.message || 'Search failed')
    },
  }))
</script>

<div class="min-h-[calc(100vh-4rem)] bg-linear-to-b from-cyan-50 via-white to-blue-50 px-4 py-8 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto space-y-8">
    <section class="rounded-3xl border border-cyan-100 bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-cyan-100/50" in:fly={{ y: 16, duration: 300 }}>
      <p class="text-xs uppercase tracking-[0.2em] text-cyan-600 font-bold">Global Search</p>
      <h1 class="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
        Results for <span class="text-cyan-600">"{searchTerm || '...'}"</span>
      </h1>
      <p class="mt-3 text-slate-500 max-w-3xl">
        Unified search across clubs, events, books, notices, and campus places.
      </p>
    </section>

    {#if searchTerm.length < 2}
      <section class="rounded-3xl border border-slate-200 bg-white p-10 text-center" in:fade>
        <h2 class="text-2xl font-bold text-slate-900">Type at least 2 characters</h2>
        <p class="mt-2 text-slate-500">Try searching "robotics", "library", "civil", or "results".</p>
      </section>
    {:else if searchQuery.isLoading}
      <section class="rounded-3xl border border-slate-200 bg-white p-16 flex justify-center" in:fade>
        <LoadingSpinner size="lg" text="Searching all modules..." />
      </section>
    {:else if searchQuery.error}
      <section class="rounded-3xl border border-rose-200 bg-rose-50 p-10" in:fade>
        <h2 class="text-2xl font-bold text-rose-700">Search failed</h2>
        <p class="mt-2 text-rose-600">{searchQuery.error.message}</p>
      </section>
    {:else if searchQuery.data}
      {@const data = searchQuery.data}
      <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" transition:fade>
        <article class="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900">Clubs ({data.clubs.length})</h3>
          <div class="mt-3 space-y-2">
            {#if data.clubs.length === 0}
              <p class="text-sm text-slate-500">No matches.</p>
            {:else}
              {#each data.clubs as club}
                <a use:route href={`/clubs/${club.id}`} class="block rounded-lg px-3 py-2 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 transition">
                  {club.name}
                </a>
              {/each}
            {/if}
          </div>
        </article>

        <article class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900">Events ({data.events.length})</h3>
          <div class="mt-3 space-y-2">
            {#if data.events.length === 0}
              <p class="text-sm text-slate-500">No matches.</p>
            {:else}
              {#each data.events as event}
                <a use:route href={`/clubs/${event.clubId}/events/${event.id}`} class="block rounded-lg px-3 py-2 hover:bg-blue-50 transition">
                  <p class="font-semibold text-slate-800">{event.title}</p>
                  <p class="text-xs text-slate-500">{event.club?.name || 'Event'}</p>
                </a>
              {/each}
            {/if}
          </div>
        </article>

        <article class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900">Books ({data.books.length})</h3>
          <div class="mt-3 space-y-2">
            {#if data.books.length === 0}
              <p class="text-sm text-slate-500">No matches.</p>
            {:else}
              {#each data.books as book}
                <a use:route href={`/books/${book.id}`} class="block rounded-lg px-3 py-2 hover:bg-emerald-50 transition">
                  <p class="font-semibold text-slate-800">{book.title}</p>
                  <p class="text-xs text-slate-500">by {book.author}</p>
                </a>
              {/each}
            {/if}
          </div>
        </article>

        <article class="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900">Notices ({data.notices.length})</h3>
          <div class="mt-3 space-y-2">
            {#if data.notices.length === 0}
              <p class="text-sm text-slate-500">No matches.</p>
            {:else}
              {#each data.notices as notice}
                <a use:route href="/notices" class="block rounded-lg px-3 py-2 hover:bg-amber-50 transition">
                  <p class="font-semibold text-slate-800">{notice.title}</p>
                  <p class="text-xs text-slate-500">{notice.section.toUpperCase()} / {notice.subsection.toUpperCase()}</p>
                </a>
              {/each}
            {/if}
          </div>
        </article>

        <article class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-2">
          <h3 class="text-lg font-bold text-slate-900">Campus Locations ({data.places.length})</h3>
          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {#if data.places.length === 0}
              <p class="text-sm text-slate-500">No matches.</p>
            {:else}
              {#each data.places as place}
                <a use:route href="/map" class="block rounded-lg px-3 py-2 hover:bg-indigo-50 transition">
                  <p class="font-semibold text-slate-800">{place.name}</p>
                  <p class="text-xs text-slate-500 line-clamp-2">{place.description}</p>
                </a>
              {/each}
            {/if}
          </div>
        </article>
      </section>
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

