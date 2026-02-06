<script lang="ts">
  import { route } from "@mateothegreat/svelte5-router";
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
      if (!$session.data?.user?.id) return [] as Registration[];
      const result = await getEnrollments();
      if (result.success && result.registrations) {
        return result.registrations as Registration[];
      }
      return [] as Registration[];
    },
    enabled: !!$session.data?.user?.id,
  }));

  const enrollments = $derived((query.data as Registration[] | undefined) ?? []);

  const totalEnrollments = $derived(enrollments.length);
  const upcomingEnrollments = $derived(
    enrollments.filter((registration) => {
      const eventTime = registration.event?.eventStartTime
        ? new Date(registration.event.eventStartTime).getTime()
        : NaN;
      return Number.isFinite(eventTime) && eventTime > Date.now();
    }).length,
  );
  const attendedEnrollments = $derived(
    enrollments.filter(
      (registration) => registration.status?.toLowerCase() === "attended",
    ).length,
  );

  const userInitial = $derived(
    $session.data?.user?.name?.charAt(0)?.toUpperCase() || "U",
  );

  const nextEnrollment = $derived.by(() => {
    const upcoming = enrollments
      .filter((registration) => registration.event?.eventStartTime)
      .filter((registration) => {
        const ms = new Date(registration.event!.eventStartTime).getTime();
        return Number.isFinite(ms) && ms > Date.now();
      })
      .sort(
        (a, b) =>
          new Date(a.event!.eventStartTime).getTime() -
          new Date(b.event!.eventStartTime).getTime(),
      );

    return upcoming[0] || null;
  });

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

  function getEnrollmentHref(registration: Registration) {
    if (!registration.event?.clubId) return "/events";
    return `/clubs/${registration.event.clubId}/events/${registration.eventId}`;
  }

  function getStatusClasses(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === "attended") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (normalized === "cancelled") {
      return "bg-rose-100 text-rose-700 border-rose-200";
    }
    if (normalized === "waitlisted") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-7xl space-y-5">
    {#if $session.isPending}
      <section
        class="rounded-3xl border border-cyan-100/80 bg-white/80 p-10 text-center backdrop-blur-sm"
      >
        <div class="mx-auto flex w-fit items-center gap-2">
          <div
            class="h-2 w-2 animate-bounce rounded-full bg-cyan-500"
            style="animation-delay: 0ms"
          ></div>
          <div
            class="h-2 w-2 animate-bounce rounded-full bg-blue-500"
            style="animation-delay: 140ms"
          ></div>
          <div
            class="h-2 w-2 animate-bounce rounded-full bg-indigo-500"
            style="animation-delay: 280ms"
          ></div>
        </div>
        <p class="mt-3 text-[13px] font-semibold text-slate-500">
          Loading your dashboard...
        </p>
      </section>
    {:else if $session.data?.user}
      <section
        class="overflow-hidden rounded-3xl border border-cyan-100/80 bg-white/82 backdrop-blur-xl"
      >
        <div class="p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-700 shadow-sm"
              >
                {#if $session.data.user.image}
                  <img
                    src={$session.data.user.image}
                    alt="User Avatar"
                    class="h-full w-full object-cover"
                  />
                {:else}
                  <div
                    class="flex h-full w-full items-center justify-center text-xl font-black"
                  >
                    {userInitial}
                  </div>
                {/if}
              </div>
              <div class="min-w-0">
                <p
                  class="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700"
                >
                  Student Dashboard
                </p>
                <h1 class="mt-1.5 truncate text-xl font-black text-slate-900">
                  {$session.data.user.name}
                </h1>
                <p class="truncate text-[13px] text-slate-500">
                  {$session.data.user.email}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <a
                href="/classroom"
                use:route
                class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
              >
                Classroom
              </a>
              <button
                onclick={handleSignOut}
                disabled={loading}
                class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>

          {#if error}
            <div
              class="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5"
            >
              <svg
                class="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600"
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
              <p class="text-[13px] font-medium text-rose-700">{error}</p>
            </div>
          {/if}

          <div class="mt-5 grid gap-2 sm:grid-cols-3">
            <div class="rounded-2xl border border-cyan-100 bg-white p-3">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Total Enrollments
              </p>
              <p class="mt-1 text-2xl font-black text-slate-900">
                {totalEnrollments}
              </p>
            </div>
            <div class="rounded-2xl border border-blue-100 bg-white p-3">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Upcoming Events
              </p>
              <p class="mt-1 text-2xl font-black text-blue-700">
                {upcomingEnrollments}
              </p>
            </div>
            <div class="rounded-2xl border border-emerald-100 bg-white p-3">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Attended
              </p>
              <p class="mt-1 text-2xl font-black text-emerald-700">
                {attendedEnrollments}
              </p>
            </div>
          </div>

          {#if nextEnrollment}
            <div
              class="mt-4 rounded-2xl border border-cyan-200 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(14,165,233,0.12),rgba(255,255,255,0.95)_50%,rgba(56,189,248,0.06)_100%)] p-3"
            >
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                Next Up
              </p>
              <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <p class="text-[13px] font-bold text-slate-900">
                  {nextEnrollment.event?.title || "Upcoming event"}
                </p>
                <p class="text-[11px] font-medium text-slate-500">
                  {nextEnrollment.event?.eventStartTime
                    ? `${formatDate(nextEnrollment.event.eventStartTime)} at ${formatTime(nextEnrollment.event.eventStartTime)}`
                    : "Schedule to be announced"}
                </p>
              </div>
            </div>
          {/if}
        </div>
      </section>

      <section
        class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 backdrop-blur-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"
        >
          <h2 class="flex items-center gap-2 text-base font-black text-slate-900">
            <svg
              class="h-4 w-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
              ></path>
            </svg>
            My Event Enrollments
          </h2>
          <span
            class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
          >
            {totalEnrollments} total
          </span>
        </div>

        <div class="p-4 sm:p-5">
          {#if query.isLoading}
            <div class="space-y-3">
              {#each Array(3) as _}
                <div
                  class="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                ></div>
              {/each}
            </div>
          {:else if enrollments.length > 0}
            <div class="space-y-3">
              {#each enrollments as registration}
                <a
                  href={getEnrollmentHref(registration)}
                  use:route
                  class="group flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center"
                >
                  <div
                    class="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    {#if registration.event?.bannerUrl}
                      <img
                        src={registration.event.bannerUrl}
                        alt={registration.event.title || "Event banner"}
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    {:else if registration.event?.club?.logoUrl}
                      <img
                        src={registration.event.club.logoUrl}
                        alt={registration.event.club.name || "Club logo"}
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    {:else}
                      <div
                        class="flex h-full w-full items-center justify-center text-slate-400"
                      >
                        <svg
                          class="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
                          ></path>
                        </svg>
                      </div>
                    {/if}
                  </div>

                  <div class="min-w-0 flex-1">
                    <h3
                      class="truncate text-[15px] font-bold text-slate-900 transition group-hover:text-blue-700"
                    >
                      {registration.event?.title || "Event"}
                    </h3>
                    <p class="truncate text-[13px] text-slate-500">
                      {registration.event?.club?.name || "Campus Club"}
                    </p>

                    <div
                      class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500"
                    >
                      <span>
                        {registration.event?.eventStartTime
                          ? `${formatDate(registration.event.eventStartTime)} · ${formatTime(registration.event.eventStartTime)}`
                          : "Schedule to be announced"}
                      </span>
                      {#if registration.event?.venue}
                        <span class="truncate">{registration.event.venue}</span>
                      {/if}
                    </div>
                  </div>

                  <div class="flex items-center gap-2 sm:ml-4">
                    <span
                      class={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getStatusClasses(registration.status)}`}
                    >
                      {registration.status}
                    </span>
                    <svg
                      class="hidden h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 sm:block"
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
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div
                class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>
              <p class="text-[13px] font-medium text-slate-600">
                You have not registered for any events yet.
              </p>
              <a
                href="/events"
                use:route
                class="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
              >
                Explore Events
                <svg
                  class="h-3.5 w-3.5"
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
      </section>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <a
          href="/events"
          use:route
          class="group rounded-2xl border border-blue-100 bg-white/85 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div
            class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
          <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-blue-700">
            Events
          </h3>
          <p class="mt-1 text-[13px] text-slate-500">
            Discover upcoming competitions and workshops.
          </p>
        </a>

        <a
          href="/clubs"
          use:route
          class="group rounded-2xl border border-cyan-100 bg-white/85 p-4 transition hover:border-cyan-200 hover:bg-cyan-50/40"
        >
          <div
            class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.65-.12-1.28-.34-1.87M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.65.12-1.28.34-1.87M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </div>
          <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-cyan-700">
            Clubs
          </h3>
          <p class="mt-1 text-[13px] text-slate-500">
            Follow communities and join the right team.
          </p>
        </a>

        <a
          href="/map"
          use:route
          class="group rounded-2xl border border-indigo-100 bg-white/85 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <div
            class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"
          >
            <svg
              class="h-4 w-4"
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
          <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-indigo-700">
            Campus Map
          </h3>
          <p class="mt-1 text-[13px] text-slate-500">
            Find departments, labs, and offices quickly.
          </p>
        </a>

        <a
          href="/classroom"
          use:route
          class="group rounded-2xl border border-emerald-100 bg-white/85 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <div
            class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 14l9-5-9-5-9 5 9 5z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 14l6.16-3.422A12.083 12.083 0 0112 20.055a12.083 12.083 0 01-6.16-9.477L12 14z"
              ></path>
            </svg>
          </div>
          <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-emerald-700">
            Classroom
          </h3>
          <p class="mt-1 text-[13px] text-slate-500">
            Continue learning, assignments, and updates.
          </p>
        </a>
      </section>
    {:else}
      <section
        class="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/85 p-8 text-center backdrop-blur-sm"
      >
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
        >
          <svg
            class="h-6 w-6"
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
        <h2 class="text-xl font-black text-slate-900">Access Restricted</h2>
        <p class="mt-2 text-[13px] text-slate-500">
          Sign in to access your personalized dashboard and event activity.
        </p>
        <a
          href="/register"
          use:route
          class="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
        >
          Sign In
        </a>
      </section>
    {/if}
  </div>
</div>
