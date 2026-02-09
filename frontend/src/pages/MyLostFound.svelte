<script lang="ts">
  import { onMount } from 'svelte'
  import { route } from '@mateothegreat/svelte5-router'
  import {
    getMyLostFoundClaims,
    getMyLostFoundItems,
    updateLostFoundItemStatus,
    type LostFoundClaim,
    type LostFoundItem,
  } from '../lib/api'
  import { authClient } from '../lib/auth-client'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'

  const session = authClient.useSession()
  const role = $derived(($session.data?.user as any)?.role as string | undefined)
  const isGuest = $derived(role === 'guest')

  let tab = $state<'posts' | 'claims'>('posts')
  let loading = $state(true)
  let error = $state<string | null>(null)
  let myItems = $state<LostFoundItem[]>([])
  let myClaims = $state<LostFoundClaim[]>([])

  async function loadData() {
    loading = true
    error = null
    const [itemsResult, claimsResult] = await Promise.all([
      getMyLostFoundItems(),
      getMyLostFoundClaims(),
    ])
    if (!itemsResult.success || !claimsResult.success) {
      error = itemsResult.message || claimsResult.message || 'Failed to load data.'
      myItems = []
      myClaims = []
    } else {
      myItems = itemsResult.data || []
      myClaims = claimsResult.data || []
    }
    loading = false
  }

  async function markResolved(itemId: number) {
    const result = await updateLostFoundItemStatus(itemId, 'resolved')
    if (!result.success) {
      alert(result.message || 'Failed to update status')
      return
    }
    await loadData()
  }

  onMount(loadData)
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto space-y-4">
    <div>
      <h1 class="text-3xl font-black text-slate-900">My Lost & Found</h1>
      <p class="text-sm text-slate-500 mt-1">Manage your reported items and claim requests.</p>
    </div>

    {#if !$session.data?.user || isGuest}
      <div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-800">
        Sign in with a non-guest account to manage lost/found posts.
      </div>
    {:else}
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex gap-2">
          <button
            class="cursor-pointer rounded-xl px-3.5 py-2 text-sm font-semibold {tab === 'posts'
              ? 'bg-blue-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700'}"
            onclick={() => (tab = 'posts')}
          >
            My Posts ({myItems.length})
          </button>
          <button
            class="cursor-pointer rounded-xl px-3.5 py-2 text-sm font-semibold {tab === 'claims'
              ? 'bg-blue-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700'}"
            onclick={() => (tab = 'claims')}
          >
            My Claims ({myClaims.length})
          </button>
        </div>
      </div>

      {#if loading}
        <div class="rounded-2xl border border-slate-200 bg-white p-8">
          <LoadingSpinner text="Loading your data..." />
        </div>
      {:else if error}
        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          {error}
        </div>
      {:else if tab === 'posts'}
        <div class="space-y-3">
          {#if myItems.length === 0}
            <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No posts yet.
            </div>
          {:else}
            {#each myItems as item}
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <a
                      use:route
                      href={`/lost-found/${item.id}`}
                      class="cursor-pointer text-lg font-bold text-slate-900 hover:text-blue-700"
                    >
                      {item.title}
                    </a>
                    <p class="text-sm text-slate-500 mt-1">
                      {item.itemType} • {item.category.replace('_', ' ')} • {item.status}
                    </p>
                  </div>
                  {#if item.status !== 'resolved' && item.status !== 'closed'}
                    <button
                      class="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      onclick={() => markResolved(item.id)}
                    >
                      Mark Resolved
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <div class="space-y-3">
          {#if myClaims.length === 0}
            <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No claims yet.
            </div>
          {:else}
            {#each myClaims as claim}
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between gap-2">
                  <a
                    use:route
                    href={`/lost-found/${claim.itemId}`}
                    class="cursor-pointer text-base font-semibold text-slate-900 hover:text-blue-700"
                  >
                    {claim.item?.title || `Item #${claim.itemId}`}
                  </a>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {claim.status}
                  </span>
                </div>
                <p class="text-sm text-slate-600 mt-1">{claim.message}</p>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
