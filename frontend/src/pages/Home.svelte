<script lang="ts">
  import { route } from '@mateothegreat/svelte5-router'
  import { authClient } from '../lib/auth-client'
  import { fade, fly } from 'svelte/transition'

  const session = authClient.useSession()

  const quickLinks = [
    { label: 'Map', href: '/map', icon: 'map' },
    { label: 'Events', href: '/events', icon: 'calendar' },
    { label: 'Clubs', href: '/clubs', icon: 'users' },
    { label: 'Books', href: '/books', icon: 'book' },
    { label: 'Notices', href: '/notices', icon: 'notice' },
    { label: 'Search', href: '/search', icon: 'search' },
  ] as const
</script>

<div
  class="min-h-[calc(100vh-4rem)] flex flex-col px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden"
>
  <!-- Background gradients -->
  <div
    class="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl"
  ></div>
  <div
    class="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-300/12 blur-3xl"
  ></div>
  <div
    class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-indigo-200/8 blur-3xl"
  ></div>

  <div class="max-w-4xl mx-auto w-full">
    <!-- Main Hero -->
    <div class="text-center mb-8" in:fly={{ y: 16, duration: 400 }}>
      <div
        class="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700 shadow-sm mb-4 backdrop-blur-sm"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
        ></span>
        Smart Pulchowk
      </div>

      <h1
        class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-3"
      >
        Your Campus,
        <span
          class="text-transparent bg-clip-text bg-linear-to-r from-cyan-600 via-blue-600 to-indigo-600"
        >
          fully connected
        </span>
      </h1>

      <p
        class="max-w-lg mx-auto text-sm sm:text-base text-slate-600 leading-relaxed mb-6"
      >
        Maps, events, clubs, books, and notices — unified in one fast interface
        for Pulchowk students.
      </p>

      <!-- Primary CTA -->
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-2.5"
      >
        <a
          use:route
          href="/map"
          class="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-sm text-white font-bold bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.7 8.3A5.7 5.7 0 116.3 8.3c0 4.9 5.7 10.7 5.7 10.7s5.7-5.8 5.7-10.7z"
            /><circle cx="12" cy="8.3" r="2.2" />
          </svg>
          Explore Campus Map
        </a>

        {#if $session.isPending}
          <div
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-medium min-w-28"
          >
            <div
              class="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"
            ></div>
          </div>
        {:else if $session.data?.user}
          <a
            use:route
            href="/dashboard"
            class="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            Dashboard
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        {:else}
          <a
            href="/register"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            Get Started
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        {/if}
      </div>
    </div>

    <!-- Quick Links Grid -->
    <div
      class="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3"
      in:fade={{ duration: 500, delay: 150 }}
    >
      {#each quickLinks as link}
        <a
          use:route
          href={link.href}
          class="group flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-white/80 border border-slate-100 hover:border-cyan-200 hover:bg-white hover:shadow-lg hover:shadow-cyan-500/10 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
        >
          <div
            class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-cyan-600 group-hover:bg-cyan-50 group-hover:border-cyan-100 transition-colors"
          >
            {#if link.icon === 'map'}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.7 8.3A5.7 5.7 0 116.3 8.3c0 4.9 5.7 10.7 5.7 10.7s5.7-5.8 5.7-10.7z"
                /><circle cx="12" cy="8.3" r="2" /></svg
              >
            {:else if link.icon === 'calendar'}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
                /></svg
              >
            {:else if link.icon === 'users'}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.65-.12-1.28-.34-1.87M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.65.12-1.28.34-1.87M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                /></svg
              >
            {:else if link.icon === 'book'}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.25v13.5m0-13.5c-1.9-1.45-4.5-2.25-7.25-2.25v13.5c2.75 0 5.35.8 7.25 2.25m0-13.5c1.9-1.45 4.5-2.25 7.25-2.25v13.5c-2.75 0-5.35.8-7.25 2.25"
                /></svg
              >
            {:else if link.icon === 'notice'}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                /></svg
              >
            {:else}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-5.2-5.2M16 10.8a5.2 5.2 0 11-10.4 0 5.2 5.2 0 0110.4 0z"
                /></svg
              >
            {/if}
          </div>
          <span
            class="text-[11px] sm:text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors"
            >{link.label}</span
          >
        </a>
      {/each}
    </div>

    <!-- Footer Stats -->
    <div
      class="mt-10 flex flex-wrap items-center justify-center gap-6 text-center"
      in:fade={{ duration: 500, delay: 300 }}
    >
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span class="text-xs text-slate-500"
          ><span class="font-bold text-slate-700">100+</span> campus locations</span
        >
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
        <span class="text-xs text-slate-500"
          ><span class="font-bold text-slate-700">8</span> utility modules</span
        >
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
        <span class="text-xs text-slate-500"
          ><span class="font-bold text-slate-700">Unified</span> smart search</span
        >
      </div>
    </div>
  </div>
</div>
