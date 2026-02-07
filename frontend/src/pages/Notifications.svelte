<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import {
    getInAppNotifications,
    getUnreadNotificationsCount,
    markAllInAppNotificationsRead,
    markInAppNotificationRead,
    type InAppNotification,
  } from '../lib/api'
  import LoadingSpinner from '../components/LoadingSpinner.svelte'
  import { route } from '@mateothegreat/svelte5-router'

  const queryClient = useQueryClient()
  let showUnreadOnly = $state(false)

  function publishUnreadCount(count: number) {
    window.dispatchEvent(
      new CustomEvent('notifications:unread-count', {
        detail: { count: Math.max(0, count) },
      }),
    )
  }

  const notificationsQuery = createQuery(() => ({
    queryKey: ['in-app-notifications', showUnreadOnly],
    queryFn: async () => {
      const result = await getInAppNotifications({
        limit: 100,
        unreadOnly: showUnreadOnly,
      })
      if (!result.success) throw new Error(result.message || 'Failed to load notifications')
      return result.data || []
    },
    staleTime: 10 * 1000,
    refetchInterval: 20 * 1000,
  }))

  const unreadCountQuery = createQuery(() => ({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const result = await getUnreadNotificationsCount()
      return result.success ? result.count || 0 : 0
    },
    staleTime: 10 * 1000,
    refetchInterval: 20 * 1000,
  }))

  const markReadMutation = createMutation(() => ({
    mutationFn: async (notificationId: number) => markInAppNotificationRead(notificationId),
    onMutate: async (notificationId: number) => {
      const currentUnread = queryClient.getQueryData<number>([
        'notifications-unread-count',
      ]) ?? 0
      const nextUnread = Math.max(0, currentUnread - 1)
      publishUnreadCount(nextUnread)
      queryClient.setQueryData(['notifications-unread-count'], nextUnread)

      const previousNotificationQueries = queryClient.getQueriesData<
        InAppNotification[]
      >({
        queryKey: ['in-app-notifications'],
      })
      for (const [key, data] of previousNotificationQueries) {
        if (!data) continue
        const unreadOnlyCache = Array.isArray(key) && key[0] === 'in-app-notifications' && key[1] === true
        if (unreadOnlyCache) {
          queryClient.setQueryData(
            key,
            data.filter((n) => n.id !== notificationId),
          )
          continue
        }
        queryClient.setQueryData(
          key,
          data.map((n) =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
          ),
        )
      }

      return { currentUnread, previousNotificationQueries }
    },
    onError: (_error, _notificationId, context) => {
      if (!context) return
      queryClient.setQueryData(
        ['notifications-unread-count'],
        context.currentUnread,
      )
      publishUnreadCount(context.currentUnread)
      for (const [key, data] of context.previousNotificationQueries) {
        queryClient.setQueryData(key, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  }))

  const markAllMutation = createMutation(() => ({
    mutationFn: async () => markAllInAppNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['in-app-notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] })

      const previousNotificationQueries = queryClient.getQueriesData<
        InAppNotification[]
      >({
        queryKey: ['in-app-notifications'],
      })
      const previousUnreadCount = queryClient.getQueryData<number>([
        'notifications-unread-count',
      ])

      const nowIso = new Date().toISOString()
      for (const [key, data] of previousNotificationQueries) {
        if (!data) continue
        const unreadOnlyCache = Array.isArray(key) && key[0] === 'in-app-notifications' && key[1] === true
        if (unreadOnlyCache) {
          queryClient.setQueryData(key, [] as InAppNotification[])
          continue
        }
        queryClient.setQueryData(
          key,
          data.map((notification) => ({
            ...notification,
            isRead: true,
            readAt: notification.readAt || nowIso,
          })),
        )
      }

      queryClient.setQueryData(['notifications-unread-count'], 0)
      publishUnreadCount(0)

      return {
        previousNotificationQueries,
        previousUnreadCount,
      }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      for (const [key, data] of context.previousNotificationQueries) {
        queryClient.setQueryData(key, data)
      }
      queryClient.setQueryData(
        ['notifications-unread-count'],
        context.previousUnreadCount ?? 0,
      )
      publishUnreadCount(context.previousUnreadCount ?? 0)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  }))

  function getNotificationHref(notification: InAppNotification) {
    const data = notification.data || {}
    const eventId = Number(data.eventId || 0)
    const clubId = Number(data.clubId || 0)
    const listingId = Number(data.listingId || data.bookId || 0)
    const conversationId = Number(data.conversationId || 0)
    const noticeId = Number(data.noticeId || 0)

    if (conversationId > 0) return `/messages?conversation=${conversationId}`
    if (listingId > 0) return `/books/${listingId}`
    if (clubId > 0 && eventId > 0) return `/clubs/${clubId}/events/${eventId}`
    if (eventId > 0) return '/events'
    if (noticeId > 0 || notification.type.startsWith('notice_')) return '/notices'
    if (notification.type.includes('assignment') || notification.type.includes('grading')) return '/classroom'
    return '/dashboard'
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  function getImageUrl(notification: InAppNotification) {
    const data = (notification.data || {}) as Record<string, string | number | boolean | null>
    const value =
      (data.thumbnailUrl as string | undefined) ||
      (data.bannerUrl as string | undefined) ||
      (data.attachmentUrl as string | undefined)
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }

  function getIconKey(notification: InAppNotification) {
    const data = (notification.data || {}) as Record<string, string | number | boolean | null>
    const iconKey = typeof data.iconKey === 'string' ? data.iconKey.toLowerCase() : ''
    if (iconKey) return iconKey
    const type = notification.type.toLowerCase()
    if (type.includes('event')) return 'event'
    if (
      type.includes('book') ||
      type.includes('purchase') ||
      type.includes('request') ||
      type.includes('chat')
    ) {
      return 'book'
    }
    if (type.includes('notice')) return 'notice'
    if (type.includes('assignment') || type.includes('grading')) return 'classroom'
    return 'general'
  }
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-black text-slate-900">Notifications</h1>
        <p class="text-sm text-slate-500">Unread: {unreadCountQuery.data ?? 0}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
          onclick={() => (showUnreadOnly = !showUnreadOnly)}
        >
          {showUnreadOnly ? 'Show All' : 'Show Unread'}
        </button>
        <button
          class="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={markAllMutation.isPending}
          onclick={() => markAllMutation.mutate()}
        >
          Mark all read
        </button>
      </div>
    </div>

    {#if notificationsQuery.isLoading}
      <div class="py-20">
        <LoadingSpinner text="Loading notifications..." />
      </div>
    {:else if notificationsQuery.error}
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        {(notificationsQuery.error as Error).message}
      </div>
    {:else if (notificationsQuery.data || []).length === 0}
      <div class="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        No notifications yet.
      </div>
    {:else}
      <div class="space-y-2">
        {#each notificationsQuery.data || [] as notification (notification.id)}
          <a
            use:route
            href={getNotificationHref(notification)}
            onclick={() => {
              if (!notification.isRead) markReadMutation.mutate(notification.id)
            }}
            class="block rounded-xl border p-4 transition {notification.isRead
              ? 'border-slate-200 bg-white hover:bg-slate-50'
              : 'border-cyan-200 bg-cyan-50/60 hover:bg-cyan-50'}"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                {#if getImageUrl(notification)}
                  <img
                    src={getImageUrl(notification) || ''}
                    alt={notification.title}
                    class="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                    loading="lazy"
                  />
                {:else}
                  <div class="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                    {#if getIconKey(notification) === 'event'}
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    {:else if getIconKey(notification) === 'book'}
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                    {:else if getIconKey(notification) === 'notice'}
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    {:else if getIconKey(notification) === 'classroom'}
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 10v6M2 10v6"></path>
                        <path d="M12 6 2 10l10 4 10-4-10-4z"></path>
                        <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"></path>
                      </svg>
                    {:else}
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    {/if}
                  </div>
                {/if}
                <div>
                  <p class="text-sm font-bold text-slate-900">{notification.title}</p>
                  <p class="text-sm text-slate-600 mt-1">{notification.body}</p>
                  <p class="text-xs text-slate-400 mt-2">{formatTime(notification.createdAt)}</p>
                </div>
              </div>
              {#if !notification.isRead}
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 mt-1"></span>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
