<script lang="ts">
  import { onMount } from 'svelte'
  import { query as routeQuery, route as routeAction } from '@mateothegreat/svelte5-router'
  import {
    createLostFoundClaim,
    getLostFoundItem,
    getLostFoundItemClaims,
    updateLostFoundClaimStatus,
    updateLostFoundItemStatus,
    type LostFoundClaim,
    type LostFoundItem,
  } from '../lib/api'
  import { authClient } from '../lib/auth-client'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'

  const { route } = $props()
  const itemId = $derived(Number(route.result.path.params.id || 0))
  const highlight = $derived(routeQuery('highlight') === 'item')

  const session = authClient.useSession()
  const role = $derived(($session.data?.user as any)?.role as string | undefined)
  const userId = $derived(($session.data?.user as any)?.id as string | undefined)
  const isGuest = $derived(role === 'guest')

  let loading = $state(true)
  let claimsLoading = $state(false)
  let submitting = $state(false)
  let error = $state<string | null>(null)
  let claimMessage = $state('')
  let item = $state<LostFoundItem | null>(null)
  let ownerClaims = $state<LostFoundClaim[]>([])
  let activeImageIndex = $state(0)

  const isOwner = $derived(!!item && !!userId && item.ownerId === userId)
  const canClaim = $derived(
    !!item &&
      !!userId &&
      !isOwner &&
      !isGuest &&
      (item.status === 'open' || item.status === 'claimed') &&
      !item.viewerClaim,
  )

  async function loadItem() {
    if (!itemId) return
    loading = true
    error = null
    const result = await getLostFoundItem(itemId)
    if (!result.success || !result.data) {
      error = result.message || 'Failed to load item.'
      item = null
    } else {
      item = result.data
      activeImageIndex = 0
      if (item.ownerId === userId) {
        await loadClaims()
      }
    }
    loading = false
  }

  async function loadClaims() {
    if (!itemId || !isOwner) return
    claimsLoading = true
    const result = await getLostFoundItemClaims(itemId)
    ownerClaims = result.success && result.data ? result.data : []
    claimsLoading = false
  }

  async function submitClaim() {
    if (!canClaim || !claimMessage.trim()) return
    submitting = true
    const result = await createLostFoundClaim(itemId, claimMessage.trim())
    submitting = false
    if (!result.success) {
      alert(result.message || 'Failed to submit claim.')
      return
    }
    claimMessage = ''
    await loadItem()
  }

  async function updateClaim(claimId: number, status: 'accepted' | 'rejected') {
    if (!isOwner) return
    submitting = true
    const result = await updateLostFoundClaimStatus(itemId, claimId, status)
    submitting = false
    if (!result.success) {
      alert(result.message || 'Failed to update claim.')
      return
    }
    await loadItem()
  }

  async function setStatus(status: 'open' | 'claimed' | 'resolved' | 'closed') {
    if (!isOwner) return
    submitting = true
    const result = await updateLostFoundItemStatus(itemId, status)
    submitting = false
    if (!result.success) {
      alert(result.message || 'Failed to update item status.')
      return
    }
    await loadItem()
  }

  onMount(loadItem)
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="max-w-5xl mx-auto space-y-5">
    <a
      use:routeAction
      href="/lost-found"
      class="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Lost & Found
    </a>

    {#if loading}
      <div class="rounded-2xl border border-slate-200 bg-white p-10">
        <LoadingSpinner text="Loading item details..." />
      </div>
    {:else if error || !item}
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p class="font-semibold">Failed to load item</p>
        <p class="text-sm mt-1">{error || 'Item not found.'}</p>
      </div>
    {:else}
      <div
        class="rounded-2xl border bg-white p-5 {highlight
          ? 'border-blue-400 ring-4 ring-blue-100'
          : 'border-slate-200'}"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-black text-slate-900">{item.title}</h1>
            <div class="mt-2 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                {item.itemType}
              </span>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                {item.category.replace('_', ' ')}
              </span>
              <span class="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">
                {item.status}
              </span>
            </div>
          </div>
          {#if isOwner}
            <div class="flex flex-wrap gap-2">
              <button
                class="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                onclick={() => setStatus('resolved')}
                disabled={submitting}
              >
                Mark Resolved
              </button>
              <button
                class="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                onclick={() => setStatus('closed')}
                disabled={submitting}
              >
                Close
              </button>
            </div>
          {/if}
        </div>

        <p class="mt-4 text-slate-700">{item.description}</p>
        <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p><span class="font-semibold text-slate-800">Date:</span> {new Date(item.lostFoundDate).toLocaleDateString()}</p>
          <p><span class="font-semibold text-slate-800">Location:</span> {item.locationText}</p>
          {#if item.contactNote}
            <p><span class="font-semibold text-slate-800">Contact note:</span> {item.contactNote}</p>
          {/if}
          {#if item.rewardText}
            <p><span class="font-semibold text-slate-800">Reward:</span> {item.rewardText}</p>
          {/if}
          {#if item.owner?.name}
            <p><span class="font-semibold text-slate-800">Posted by:</span> {item.owner.name}</p>
          {/if}
        </div>

        {#if item.images && item.images.length > 0}
          <div class="mt-5">
            <div class="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <img
                src={item.images[activeImageIndex]?.imageUrl}
                alt={item.title}
                class="w-full max-h-[380px] object-contain bg-white"
              />
            </div>
            {#if item.images.length > 1}
              <div class="mt-2 flex flex-wrap gap-2">
                {#each item.images as image, index}
                  <button
                    class="cursor-pointer w-14 h-14 overflow-hidden rounded-lg border {index === activeImageIndex
                      ? 'border-blue-400'
                      : 'border-slate-200'}"
                    onclick={() => (activeImageIndex = index)}
                  >
                    <img src={image.imageUrl} alt={item.title} class="w-full h-full object-cover" />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if canClaim}
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-bold text-slate-900">Claim this item</h2>
          <p class="text-sm text-slate-500 mt-1">
            Explain details that help verify ownership.
          </p>
          <textarea
            bind:value={claimMessage}
            rows="4"
            class="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-hidden"
            placeholder="I can identify the item by..."
          ></textarea>
          <button
            class="cursor-pointer mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            onclick={submitClaim}
            disabled={submitting || !claimMessage.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      {:else if !isOwner && item.viewerClaim}
        <div class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          Your claim status: <span class="font-semibold">{item.viewerClaim.status}</span>
        </div>
      {:else if isGuest}
        <div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm text-cyan-800">
          Sign in with a non-guest account to submit claims.
        </div>
      {/if}

      {#if isOwner}
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-bold text-slate-900">Claims on your post</h2>
          {#if claimsLoading}
            <div class="mt-3">
              <LoadingSpinner text="Loading claims..." />
            </div>
          {:else if ownerClaims.length === 0}
            <p class="mt-3 text-sm text-slate-500">No claims yet.</p>
          {:else}
            <div class="mt-3 space-y-2">
              {#each ownerClaims as claim}
                <div class="rounded-xl border border-slate-200 p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-800">
                      {claim.requester?.name || claim.requesterId}
                    </p>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {claim.status}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-slate-600">{claim.message}</p>
                  {#if claim.status === 'pending'}
                    <div class="mt-2 flex gap-2">
                      <button
                        class="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                        onclick={() => updateClaim(claim.id, 'accepted')}
                        disabled={submitting}
                      >
                        Accept
                      </button>
                      <button
                        class="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        onclick={() => updateClaim(claim.id, 'rejected')}
                        disabled={submitting}
                      >
                        Reject
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
