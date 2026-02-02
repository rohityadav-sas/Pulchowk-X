<script lang="ts">
  import { goto, route } from "@mateothegreat/svelte5-router";
  import { authClient } from "../lib/auth-client";
  import { getEnrollments, type Registration } from "../lib/api";
  import { createQuery } from "@tanstack/svelte-query";
  import { formatEventDate, formatEventTime } from "../lib/event-dates";

  let loading = $state(false);
  let error = $state<string | null>(null);
  const session = authClient.useSession();

  const query = createQuery(() => ({
    queryKey: ["enrollments", $session.data?.user?.id],
    queryFn: async () => {
      if (!$session.data?.user?.id) return [];
      const result = await getEnrollments();
      if (result.success && result.registrations) {
        return result.registrations;
      }
      return [];
    },
    enabled: !!$session.data?.user?.id,
  }));

  const handleSignOut = async () => {
    loading = true;
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/";
          },
        },
      });
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  };

  function formatDate(dateStr: string): string {
    return formatEventDate(dateStr, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(dateStr: string): string {
    return formatEventTime(dateStr);
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    {#if $session.isPending}
      <div class="flex items-center justify-center gap-3 py-20">
        <div
          class="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style="animation-delay: 0ms"
        ></div>
        <div
          class="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style="animation-delay: 150ms"
        ></div>
        <div
          class="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style="animation-delay: 300ms"
        ></div>
      </div>
    {:else if $session.data?.user}
      <div class="space-y-6">
        <!-- Header -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p class="text-gray-500">
              Manage your account and view your enrollments
            </p>
          </div>
          <button
            onclick={handleSignOut}
            disabled={loading}
            class="inline-flex items-center justify-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing Out..." : "Sign Out"}
          </button>
        </div>

        {#if error}
          <div
            class="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
          >
            <svg
              class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p class="text-red-600 text-sm">{error}</p>
          </div>
        {/if}

        <!-- User Profile Card -->
        <div
          class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div class="p-6 sm:p-8">
            <div class="flex items-center gap-6">
              <div
                class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-sm"
              >
                {#if $session.data.user.image}
                  <img
                    src={$session.data.user.image}
                    alt="User Avatar"
                    class="w-full h-full object-cover rounded-full"
                  />
                {:else}
                  {$session.data.user.name
                    ? $session.data.user.name.charAt(0).toUpperCase()
                    : "U"}
                {/if}
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  {$session.data.user.name}
                </h2>
                <p class="text-gray-500">
                  {$session.data.user.email}
                </p>
                <div
                  class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Active Student
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div class="text-sm text-gray-500">
              Member since {new Date().getFullYear()}
            </div>
          </div>
        </div>

        <!-- My Enrollments -->
        <div
          class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg
                class="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                ></path>
              </svg>
              My Event Enrollments
            </h2>
          </div>
          <div class="p-6">
            {#if query.isLoading}
              <div class="flex items-center justify-center py-8">
                <div class="flex items-center gap-3">
                  <div
                    class="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style="animation-delay: 0ms"
                  ></div>
                  <div
                    class="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style="animation-delay: 150ms"
                  ></div>
                  <div
                    class="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style="animation-delay: 300ms"
                  ></div>
                </div>
              </div>
            {:else if query.data && query.data.length > 0}
              <div class="space-y-4">
                {#each query.data as registration}
                  <a
                    href="/clubs/{registration.event
                      ?.clubId}/events/{registration.eventId}"
                    use:route
                    class="block p-4 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors group"
                  >
                    <div
                      class="flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div
                        class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0"
                      >
                        <svg
                          class="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          ></path>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3
                          class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors"
                        >
                          {registration.event?.title || "Event"}
                        </h3>
                        <p class="text-sm text-gray-600">
                          {registration.event?.club?.name || "Club"}
                        </p>
                        <div
                          class="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500"
                        >
                          <span class="flex items-center gap-1">
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
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              ></path>
                            </svg>
                            {registration.event?.eventStartTime
                              ? formatDate(registration.event.eventStartTime)
                              : "TBA"}
                          </span>
                          {#if registration.event?.venue}
                            <span class="flex items-center gap-1">
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
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                ></path>
                              </svg>
                              {registration.event.venue}
                            </span>
                          {/if}
                          <span
                            class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium"
                          >
                            {registration.status}
                          </span>
                        </div>
                      </div>
                      <svg
                        class="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all hidden sm:block"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        ></path>
                      </svg>
                    </div>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <div
                  class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                </div>
                <p class="text-gray-500 text-sm mb-4">
                  You haven't registered for any events yet
                </p>
                <a
                  href="/clubs"
                  use:route
                  class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Browse Events
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
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    ></path>
                  </svg>
                </a>
              </div>
            {/if}
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Clubs Card -->
          <a
            href="/clubs"
            use:route
            class="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div
              class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
            </div>
            <h3
              class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors"
            >
              Campus Clubs
            </h3>
            <p class="text-gray-500 text-sm">
              Explore clubs and discover upcoming events.
            </p>
          </a>

          <!-- Map Card -->
          <a
            href="/map"
            use:route
            class="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all"
          >
            <div
              class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4"
                ></path>
              </svg>
            </div>
            <h3
              class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors"
            >
              Campus Map
            </h3>
            <p class="text-gray-500 text-sm">
              Navigate the campus, find classrooms, and explore locations.
            </p>
          </a>

          <!-- Settings Card (Placeholder) -->
          <div
            class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 opacity-60 cursor-not-allowed"
          >
            <div
              class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 mb-4"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
            <p class="text-gray-500 text-sm">
              Account settings and preferences coming soon.
            </p>
          </div>
        </div>
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div
          class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6"
        >
          <svg
            class="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            ></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p class="text-gray-500 mb-8 max-w-md">
          Please sign in to view your dashboard and access personalized
          features.
        </p>
        <a
          href="/register"
          use:route
          class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
        >
          Sign In
        </a>
      </div>
    {/if}
  </div>
</div>
