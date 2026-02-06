<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { authClient } from '../lib/auth-client'
  import {
    getAdminOverview,
    getAdminUsers,
    getModerationReports,
    toggleSellerVerification,
    updateAdminUserRole,
    updateModerationReport,
    type AdminUser,
    type MarketplaceReport,
  } from '../lib/api'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'
  import { fade, fly } from 'svelte/transition'

  const session = authClient.useSession()
  const queryClient = useQueryClient()

  const sessionRole = $derived(($session.data?.user as any)?.role as
    | string
    | undefined)
  const isAdmin = $derived(sessionRole === 'admin')

  let userSearch = $state('')
  let roleFilter = $state('')
  let reportsFilter = $state<'all' | 'open' | 'in_review' | 'resolved' | 'rejected'>('all')
  let activeTab = $state<'users' | 'moderation'>('users')

  let busyUserId = $state<string | null>(null)
  let busyReportId = $state<number | null>(null)

  const overviewQuery = createQuery(() => ({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const result = await getAdminOverview()
      if (result.success && result.data) return result.data
      throw new Error(result.message || 'Failed to load overview')
    },
    enabled: isAdmin,
  }))

  const usersQuery = createQuery(() => ({
    queryKey: ['admin-users', userSearch, roleFilter],
    queryFn: async () => {
      const result = await getAdminUsers({
        search: userSearch.trim() || undefined,
        role: roleFilter || undefined,
        limit: 200,
      })
      if (result.success && result.data) return result.data
      throw new Error(result.message || 'Failed to load users')
    },
    enabled: isAdmin,
  }))

  const reportsQuery = createQuery(() => ({
    queryKey: ['admin-reports', reportsFilter],
    queryFn: async () => {
      const result = await getModerationReports(
        reportsFilter === 'all' ? undefined : reportsFilter,
      )
      if (result.success && result.data) return result.data
      throw new Error(result.message || 'Failed to load reports')
    },
    enabled: isAdmin,
  }))

  async function handleRoleUpdate(user: AdminUser, role: string) {
    busyUserId = user.id
    const result = await updateAdminUserRole(user.id, role)
    busyUserId = null
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    } else {
      alert(result.message || 'Failed to update role')
    }
  }

  async function handleVerification(user: AdminUser, verified: boolean) {
    busyUserId = user.id
    const result = await toggleSellerVerification(user.id, verified)
    busyUserId = null
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    } else {
      alert(result.message || 'Failed to update verification')
    }
  }

  async function handleModeration(report: MarketplaceReport, status: MarketplaceReport['status']) {
    busyReportId = report.id
    const result = await updateModerationReport(report.id, {
      status,
      resolutionNotes:
        status === 'resolved' || status === 'rejected'
          ? `Status updated to ${status} on admin panel.`
          : undefined,
    })
    busyReportId = null
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    } else {
      alert(result.message || 'Failed to update report')
    }
  }

  const roleOptions = ['student', 'teacher', 'notice_manager', 'admin', 'guest']
</script>

<div class="min-h-[calc(100vh-4rem)] bg-linear-to-br from-slate-100 via-cyan-50 to-blue-100 px-4 py-8 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <section class="rounded-3xl bg-white/80 border border-slate-200 p-8 shadow-2xl shadow-slate-300/30" in:fly={{ y: 16, duration: 300 }}>
      <p class="text-xs uppercase tracking-[0.22em] font-bold text-cyan-700">Control Center</p>
      <h1 class="mt-2 text-3xl md:text-4xl font-black text-slate-900">Admin Panel</h1>
      <p class="mt-3 text-slate-600 max-w-3xl">
        Manage user roles, seller verification, and trust moderation queue from one workspace.
      </p>
    </section>

    {#if $session.isPending}
      <section class="mt-6 rounded-3xl bg-white border border-slate-200 p-14 flex justify-center" in:fade>
        <LoadingSpinner size="lg" text="Loading admin panel..." />
      </section>
    {:else if !isAdmin}
      <section class="mt-6 rounded-3xl bg-rose-50 border border-rose-200 p-10" in:fade>
        <h2 class="text-2xl font-black text-rose-700">Access denied</h2>
        <p class="mt-2 text-rose-600">Only admin users can access this panel.</p>
      </section>
    {:else}
      <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4" transition:fade>
        <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">Users</p>
          <p class="mt-2 text-3xl font-black text-slate-900">{overviewQuery.data?.users ?? '—'}</p>
        </article>
        <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">Open Reports</p>
          <p class="mt-2 text-3xl font-black text-amber-600">{overviewQuery.data?.openReports ?? '—'}</p>
        </article>
        <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">Active Blocks</p>
          <p class="mt-2 text-3xl font-black text-cyan-700">{overviewQuery.data?.activeBlocks ?? '—'}</p>
        </article>
        <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">Avg Seller Rating</p>
          <p class="mt-2 text-3xl font-black text-emerald-700">{overviewQuery.data?.averageSellerRating ?? '—'}</p>
        </article>
      </div>

      <div class="mt-6 rounded-3xl bg-white border border-slate-200 p-3 inline-flex gap-2 shadow-sm">
        <button
          onclick={() => (activeTab = 'users')}
          class="px-5 py-2.5 rounded-2xl text-sm font-bold transition {activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}"
        >
          User Roles
        </button>
        <button
          onclick={() => (activeTab = 'moderation')}
          class="px-5 py-2.5 rounded-2xl text-sm font-bold transition {activeTab === 'moderation' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}"
        >
          Moderation Queue
        </button>
      </div>

      {#if activeTab === 'users'}
        <section class="mt-4 rounded-3xl bg-white border border-slate-200 p-6 shadow-xl">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              bind:value={userSearch}
              placeholder="Search name or email"
              class="px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-4 focus:ring-cyan-200"
            />
            <select
              bind:value={roleFilter}
              class="px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-4 focus:ring-cyan-200"
            >
              <option value="">All roles</option>
              {#each roleOptions as role}
                <option value={role}>{role}</option>
              {/each}
            </select>
            <button
              onclick={() => usersQuery.refetch()}
              class="px-4 py-3 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-700"
            >
              Refresh users
            </button>
          </div>

          {#if usersQuery.isLoading}
            <div class="py-10 flex justify-center">
              <LoadingSpinner size="md" text="Loading users..." />
            </div>
          {:else if usersQuery.error}
            <div class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {usersQuery.error.message}
            </div>
          {:else if usersQuery.data}
            <div class="mt-6 overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500 border-b border-slate-200">
                    <th class="py-3 pr-3 font-semibold">User</th>
                    <th class="py-3 pr-3 font-semibold">Role</th>
                    <th class="py-3 pr-3 font-semibold">Seller Badge</th>
                    <th class="py-3 pr-3 font-semibold">Reputation</th>
                  </tr>
                </thead>
                <tbody>
                  {#each usersQuery.data as user}
                    <tr class="border-b border-slate-100 align-top">
                      <td class="py-3 pr-3">
                        <p class="font-semibold text-slate-900">{user.name}</p>
                        <p class="text-slate-500 text-xs">{user.email}</p>
                      </td>
                      <td class="py-3 pr-3">
                        <select
                          value={user.role}
                          disabled={busyUserId === user.id}
                          onchange={(e) => handleRoleUpdate(user, (e.currentTarget as HTMLSelectElement).value)}
                          class="px-3 py-2 rounded-lg border border-slate-200 disabled:opacity-60"
                        >
                          {#each roleOptions as role}
                            <option value={role}>{role}</option>
                          {/each}
                        </select>
                      </td>
                      <td class="py-3 pr-3">
                        <button
                          disabled={busyUserId === user.id}
                          onclick={() => handleVerification(user, !user.isVerifiedSeller)}
                          class="px-3 py-2 rounded-lg font-semibold text-xs transition {user.isVerifiedSeller ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-60"
                        >
                          {user.isVerifiedSeller ? 'Verified Seller' : 'Unverified'}
                        </button>
                      </td>
                      <td class="py-3 pr-3">
                        <p class="font-semibold text-slate-900">{user.reputation.averageRating.toFixed(1)} / 5</p>
                        <p class="text-xs text-slate-500">{user.reputation.totalRatings} ratings</p>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>
      {:else}
        <section class="mt-4 rounded-3xl bg-white border border-slate-200 p-6 shadow-xl">
          <div class="flex flex-wrap items-center gap-2">
            {#each ['all', 'open', 'in_review', 'resolved', 'rejected'] as status}
              <button
                onclick={() => (reportsFilter = status as any)}
                class="px-4 py-2 rounded-full text-xs font-bold transition {reportsFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
              >
                {status}
              </button>
            {/each}
          </div>

          {#if reportsQuery.isLoading}
            <div class="py-10 flex justify-center">
              <LoadingSpinner size="md" text="Loading reports..." />
            </div>
          {:else if reportsQuery.error}
            <div class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {reportsQuery.error.message}
            </div>
          {:else if reportsQuery.data}
            <div class="mt-6 space-y-4">
              {#if reportsQuery.data.length === 0}
                <div class="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                  No reports in this state.
                </div>
              {/if}
              {#each reportsQuery.data as report}
                <article class="rounded-2xl border border-slate-200 bg-white p-5">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">{report.category}</p>
                      <h3 class="text-lg font-bold text-slate-900 mt-1">
                        Report #{report.id} • {report.status}
                      </h3>
                      <p class="text-sm text-slate-600 mt-2 max-w-3xl">{report.description}</p>
                      <p class="text-xs text-slate-500 mt-2">
                        Reporter: {report.reporter?.name || report.reporterId} • Reported user: {report.reportedUser?.name || report.reportedUserId}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      {#each ['open', 'in_review', 'resolved', 'rejected'] as status}
                        <button
                          disabled={busyReportId === report.id}
                          onclick={() => handleModeration(report, status as MarketplaceReport['status'])}
                          class="px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 {report.status === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                        >
                          {status}
                        </button>
                      {/each}
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </div>
</div>

