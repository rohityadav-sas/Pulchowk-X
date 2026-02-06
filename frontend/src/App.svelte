<script lang="ts">
  import {
    Router,
    type RouteConfig,
    type RouterInstance,
    query,
    goto,
    route,
  } from '@mateothegreat/svelte5-router'
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import { queryClient } from './lib/query-client'
  import { authClient } from './lib/auth-client'
  import LoadingSpinner from './components/LoadingSpinner.svelte'
  import ErrorToast from './components/ErrorToast.svelte'
  import Home from './pages/Home.svelte'
  import Register from './pages/Register.svelte'
  import Dashboard from './pages/Dashboard.svelte'
  import Classroom from './pages/Classroom.svelte'
  import Clubs from './pages/Clubs.svelte'
  import ClubDetails from './pages/ClubDetails.svelte'
  import ClubEvents from './pages/ClubEvents.svelte'
  import AllEvents from './pages/AllEvents.svelte'
  import EventDetails from './pages/EventDetails.svelte'
  import EventCategoryDetails from './pages/EventCategoryDetails.svelte'
  import CreateEvent from './pages/CreateEvent.svelte'
  import CreateClub from './pages/CreateClub.svelte'
  import MapPlaceholder from './pages/MapPlaceholder.svelte'
  import BookMarketplace from './pages/BookMarketplace.svelte'
  import BookDetails from './pages/BookDetails.svelte'
  import SellBook from './pages/SellBook.svelte'
  import MyBooks from './pages/MyBooks.svelte'
  import Messages from './pages/Messages.svelte'
  import Notices from './pages/Notices.svelte'
  import Search from './pages/Search.svelte'
  import Admin from './pages/Admin.svelte'
  import GlobalSearch from './components/GlobalSearch.svelte'
  import { onMount, type Component } from 'svelte'

  let MapComponent: Component | any = $state(null)

  onMount(() => {
    const loadMap = () => {
      import('./pages/Map.svelte').then((module) => {
        MapComponent = module.default
      })
    }

    if (document.readyState === 'complete') loadMap()
    else
      window.addEventListener('load', loadMap, {
        once: true,
      })
  })

  let instance: RouterInstance = $state()!

  const isMapRoute = $derived(instance?.current?.route?.path === '/map')

  const session = authClient.useSession()
  const currentRole = $derived(($session.data?.user as any)?.role as
    | string
    | undefined)

  const error = query('message')
  let showError = $state(error === 'unauthorized_domain')

  if (error === 'unauthorized_domain') {
    goto('/')
  }

  const embed = query('embed')
  const isEmbedded = $derived(embed === 'true')

  const routes: RouteConfig[] = [
    {
      component: Home,
    },
    {
      path: 'register',
      component: Register,
    },
    {
      path: 'dashboard',
      component: Dashboard,
    },
    {
      path: 'classroom',
      component: Classroom,
    },
    {
      path: 'create-club',
      component: CreateClub,
    },
    {
      path: 'map',
      component: MapPlaceholder,
    },
    {
      path: /^\/events\/?$/,
      component: AllEvents,
    },
    {
      path: /^\/clubs\/(?<clubId>\d+)\/events\/create\/?$/,
      component: CreateEvent,
    },
    {
      path: /^\/clubs\/(?<clubId>\d+)\/events\/(?<eventId>\d+)\/?$/,
      component: EventDetails,
    },
    {
      path: /^\/clubs\/(?<clubId>\d+)\/categories\/(?<categoryId>\d+)\/?$/,
      component: EventCategoryDetails,
    },
    {
      path: /^\/clubs\/(?<clubId>\d+)\/events\/?$/,
      component: ClubEvents,
    },
    {
      path: /^\/clubs\/(?<clubId>\d+)\/?$/,
      component: ClubDetails,
    },
    {
      path: /^\/clubs\/?$/,
      component: Clubs,
    },
    {
      path: /^\/books\/?$/,
      component: BookMarketplace,
    },
    {
      path: /^\/books\/sell\/?$/,
      component: SellBook,
    },
    {
      path: /^\/books\/my-books\/?$/,
      component: MyBooks,
    },
    {
      path: /^\/books\/(?<bookId>\d+)\/?$/,
      component: BookDetails,
    },
    {
      path: /^\/messages\/?$/,
      component: Messages,
    },
    {
      path: /^\/notices\/?$/,
      component: Notices,
    },
    {
      path: /^\/search\/?$/,
      component: Search,
    },
    {
      path: /^\/admin\/?$/,
      component: Admin,
    },
  ]
</script>

<QueryClientProvider client={queryClient}>
  {#if !isEmbedded}
    <nav
      class="bg-white/85 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-xl"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <a href="/" class="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" class="size-8 rounded-lg shadow-sm" />
            <span
              class="text-xl mt-0.5 font-black text-slate-900 tracking-tight"
              >Smart Pulchowk</span
            >
          </a>
          <div class="flex items-center gap-2">
            {#if $session.isPending}
              <div class="px-3 py-2">
                <div
                  class="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"
                ></div>
              </div>
            {:else if $session.data?.user}
              <a
                use:route
                href="/dashboard"
                class="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                >Dashboard</a
              >
              <a
                use:route
                href="/classroom"
                class="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                >Classroom</a
              >
              {#if currentRole === 'admin'}
                <a
                  use:route
                  href="/admin"
                  class="px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
                  >Admin</a
                >
              {/if}
            {:else}
              <a
                href="/register"
                class="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-all active:scale-95"
                >Sign In</a
              >
            {/if}
          </div>
        </div>

        <div class="flex flex-col xl:flex-row xl:items-center gap-3">
          <div class="flex-1">
            <GlobalSearch />
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <a
              use:route
              href="/"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Home</a
            >
            <a
              use:route
              href="/clubs"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Clubs</a
            >
            <a
              use:route
              href="/events"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Events</a
            >
            <a
              use:route
              href="/books"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Books</a
            >
            <a
              use:route
              href="/map"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Map</a
            >
            <a
              use:route
              href="/notices"
              class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >Notices</a
            >
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <!-- Error Toast -->
  <ErrorToast bind:show={showError} title="Access Denied">
    Please use your <span class="font-medium text-gray-900"
      >@pcampus.edu.np</span
    >
    email address to sign in.
  </ErrorToast>

  <main
    class="{isEmbedded
      ? 'h-screen'
      : 'min-h-[calc(100vh-4rem)]'} bg-gray-50 relative"
  >
    {#if MapComponent}
      <div
        class="absolute inset-0 z-0 transition-opacity duration-300 {isMapRoute
          ? 'opacity-100 visible'
          : 'opacity-0 invisible pointer-events-none'}"
      >
        <MapComponent />
      </div>
    {/if}
    {#if instance?.navigating}
      <div
        class="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center"
      >
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    {/if}
    <div class={isMapRoute ? 'hidden' : 'contents'}>
      <Router bind:instance {routes} />
    </div>
  </main>

  {#if instance?.current?.route?.path !== '/map'}
    <footer class="bg-white border-t border-gray-200 py-8 mt-auto">
      <div
        class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p class="text-gray-500 text-sm">
          Copyright 2026 Smart Pulchowk. Built for IOE Pulchowk Campus.
        </p>
        <div class="flex items-center gap-6">
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            >Privacy</a
          >
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="text-gray-400 hover:text-gray-600 transition-colors">Terms</a
          >
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            >Contact</a
          >
        </div>
      </div>
    </footer>
  {/if}
</QueryClientProvider>
