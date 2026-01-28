<script lang="ts">
  import { route as routeAction, goto } from "@mateothegreat/svelte5-router";
  import { authClient } from "../lib/auth-client";
  import {
    createEvent,
    getClub,
    type Club,
    getClubAdmins,
    uploadEventBanner,
  } from "../lib/api";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { Datepicker, Input, Label, Timepicker } from "flowbite-svelte";

  const { route } = $props();
  const clubId = $derived(route.result.path.params.clubId);

  const session = authClient.useSession();
  const userId = $derived($session.data?.user?.id);

  let club = $state<Club | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);
  let isAuthorized = $state<boolean | null>(null);

  let title = $state("");
  let description = $state("");
  let eventType = $state("workshop");
  let venue = $state("");
  let maxParticipants = $state<number | null>(null);

  // Date/Time States
  let startDate = $state<Date | undefined>(undefined);
  let startTime = $state("");

  let endDate = $state<Date | undefined>(undefined);
  let endTime = $state("");

  let regDate = $state<Date | undefined>(undefined);
  let regTime = $state("");

  let bannerUrl = $state("");
  let bannerFile = $state<File | null>(null);
  let bannerPreview = $state<string | null>(null);
  let bannerSource = $state<"url" | "local">("url");
  let isUploadingBanner = $state(false);

  // Derived ISO Strings
  const eventStartTime = $derived(
    startDate && startTime
      ? `${startDate.toISOString().split("T")[0]}T${startTime}`
      : "",
  );

  const eventEndTime = $derived(
    endDate && endTime
      ? `${endDate.toISOString().split("T")[0]}T${endTime}`
      : "",
  );

  const registrationDeadline = $derived(
    regDate && regTime
      ? `${regDate.toISOString().split("T")[0]}T${regTime}`
      : "",
  );

  const eventTypes = [
    "workshop",
    "seminar",
    "competition",
    "hackathon",
    "meetup",
    "conference",
    "cultural",
    "sports",
    "other",
  ];

  $effect(() => {
    if (clubId) {
      loadClub();
    }
  });

  $effect(() => {
    if (club && userId) {
      checkPermissions();
    }
  });

  $effect(() => {
    if (!$session.isPending && !$session.error && !$session.data?.user) {
      error = "You must be logged in to create events";
      isAuthorized = false;
    }
  });

  async function loadClub() {
    loading = true;
    try {
      const result = await getClub(parseInt(clubId));
      if (result.success && result.clubData) {
        club = result.clubData;
        // Initial permission check if user already loaded
        if (userId) await checkPermissions();
      } else {
        error = "Club not found";
        isAuthorized = false;
      }
    } catch (err: any) {
      error = err.message || "An error occurred";
      isAuthorized = false;
    } finally {
      loading = false;
    }
  }

  async function checkPermissions() {
    if (!club || !userId) return;

    // Check if owner
    if (club.authClubId === userId) {
      isAuthorized = true;
    } else {
      // Check if admin
      try {
        const adminRes = await getClubAdmins(parseInt(clubId));
        if (adminRes.success && adminRes.admins) {
          isAuthorized = adminRes.admins.some(
            (admin: any) => admin.id === userId,
          );
        } else {
          isAuthorized = false;
        }
      } catch (e) {
        console.error("Failed to check admin status", e);
        isAuthorized = false;
      }
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      bannerFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        bannerPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!$session.data?.user) {
      error = "You must be logged in to create events";
      return;
    }

    if (!title || !eventType || !eventStartTime || !eventEndTime) {
      error = "Please fill in all required fields";
      return;
    }

    const start = new Date(eventStartTime);
    const end = new Date(eventEndTime);
    const deadline = registrationDeadline
      ? new Date(registrationDeadline)
      : null;

    if (end <= start) {
      error = "Event end time must be after start time";
      return;
    }

    if (deadline && deadline >= start) {
      error = "Registration deadline must be before event start time";
      return;
    }

    submitting = true;
    error = null;

    try {
      let finalBannerUrl = bannerUrl;

      if (bannerSource === "local" && bannerFile) {
        isUploadingBanner = true;
        const uploadRes = await uploadEventBanner(bannerFile);
        isUploadingBanner = false;
        if (uploadRes.success && uploadRes.data) {
          finalBannerUrl = uploadRes.data.url;
        } else {
          error = uploadRes.message || "Failed to upload banner image";
          submitting = false;
          return;
        }
      }

      const result = await createEvent(
        $session.data.user.id,
        parseInt(clubId),
        {
          title,
          description,
          eventType,
          venue,
          maxParticipants: maxParticipants || 0,
          registrationDeadline: registrationDeadline,
          eventStartTime: eventStartTime,
          eventEndTime: eventEndTime,
          bannerUrl: finalBannerUrl || undefined,
        },
      );

      if (result.success) {
        success = true;
        // Redirect to club events page after 1 seconds
        setTimeout(() => {
          goto(`/clubs/${clubId}/events`);
        }, 1000);
      } else {
        error = result.message || "Failed to create event";
      }
    } catch (err: any) {
      error = err.message + "An error occurred";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/30 px-4 py-8 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-8" in:fade>
      <a
        href="/clubs"
        use:routeAction
        class="hover:text-blue-600 transition-colors hover:underline">Clubs</a
      >
      <svg
        class="w-4 h-4 text-gray-300"
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
      <a
        href="/clubs/{clubId}/events"
        use:routeAction
        class="hover:text-blue-600 transition-colors hover:underline"
        >{club?.name || "Club"}</a
      >
      <svg
        class="w-4 h-4 text-gray-300"
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
      <span class="text-gray-900 font-medium">Create Event</span>
    </nav>

    {#if loading || $session.isPending || isAuthorized === null}
      <div class="flex items-center justify-center py-20" in:fade>
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    {:else if !isAuthorized}
      <div
        class="max-w-md mx-auto p-8 bg-white border border-red-100 rounded-3xl shadow-lg text-center"
        in:fly={{ y: 20, duration: 400 }}
      >
        <div
          class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg
            class="w-10 h-10 text-red-500"
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
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p class="text-red-600 mb-6 font-medium">
          {error || "You are not authorized to create events for this club"}
        </p>
        <a
          href="/clubs/{clubId}/events"
          use:routeAction
          class="inline-block px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
        >
          Back to Events
        </a>
      </div>
    {:else if success}
      <div
        class="max-w-md mx-auto p-12 bg-white border border-green-100 rounded-3xl shadow-lg text-center"
        in:fly={{ y: 20, duration: 400 }}
      >
        <div
          class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg
            class="w-12 h-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Event Created!</h2>
        <p class="text-gray-600 text-lg">
          Redirecting you to the event list...
        </p>
      </div>
    {:else}
      <div
        class="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        in:fly={{ y: 20, duration: 600 }}
      >
        <div
          class="p-8 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-purple-50/50"
        >
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">
            Create New Event
          </h1>
          <p class="text-gray-600 mt-2 text-lg">
            Fill in the details to create a new event for <span
              class="font-semibold text-blue-600">{club?.name}</span
            >
          </p>
        </div>

        <form onsubmit={handleSubmit} class="p-8 space-y-8">
          <div class="grid gap-8">
            <!-- Basic Info Section -->
            <div class="space-y-6">
              <h3 class="text-lg font-semibold text-gray-900 border-b pb-2">
                Basic Information
              </h3>

              <div class="grid sm:grid-cols-2 gap-6">
                <div class="col-span-2">
                  <label
                    for="title"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Event Title <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    bind:value={title}
                    placeholder="e.g., Annual Tech Symposium 2024"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-gray-400"
                    required
                  />
                </div>

                <div>
                  <label
                    for="eventType"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Event Type <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <select
                      id="eventType"
                      bind:value={eventType}
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none bg-white"
                      required
                    >
                      {#each eventTypes as type}
                        <option value={type}
                          >{type.charAt(0).toUpperCase() +
                            type.slice(1)}</option
                        >
                      {/each}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    for="venue"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Venue
                  </label>
                  <input
                    type="text"
                    id="venue"
                    bind:value={venue}
                    placeholder="e.g., Block A, Room 101"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label
                  for="description"
                  class="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  bind:value={description}
                  placeholder="Describe what your event is about..."
                  rows="4"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-y placeholder:text-gray-400"
                ></textarea>
              </div>
            </div>

            <!-- Logistics Section -->
            <div class="space-y-6">
              <h3 class="text-lg font-semibold text-gray-900 border-b pb-2">
                Date & Logistics
              </h3>

              <div class="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label class="mb-2 block text-sm font-semibold text-gray-700"
                    >Start Date & Time <span class="text-red-500">*</span
                    ></Label
                  >
                  <div class="flex gap-2">
                    <div class="grow">
                      <Datepicker
                        bind:value={startDate}
                        required
                        class="w-72"
                        monthBtnSelected="bg-blue-600 text-white"
                        placeholder="Select Date"
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                    <div class="w-32">
                      <Timepicker
                        bind:value={startTime}
                        required
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label class="mb-2 block text-sm font-semibold text-gray-700"
                    >End Date & Time <span class="text-red-500">*</span></Label
                  >
                  <div class="flex gap-2">
                    <div class="grow">
                      <Datepicker
                        bind:value={endDate}
                        required
                        class="w-72"
                        monthBtnSelected="bg-blue-600 text-white"
                        placeholder="Select Date"
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                    <div class="w-32">
                      <Timepicker
                        bind:value={endTime}
                        required
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label class="mb-2 block text-sm font-semibold text-gray-700"
                    >Registration Deadline</Label
                  >
                  <div class="flex gap-2">
                    <div class="grow">
                      <Datepicker
                        bind:value={regDate}
                        required
                        class="w-72"
                        monthBtnSelected="bg-blue-600 text-white"
                        placeholder="Select Date"
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                    <div class="w-32">
                      <Timepicker
                        bind:value={regTime}
                        required
                        inputClass="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-600 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    for="maxParticipants"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Max Participants
                  </label>
                  <input
                    type="number"
                    id="maxParticipants"
                    bind:value={maxParticipants}
                    placeholder="No limit"
                    min="1"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <!-- Media Section -->
            <div class="space-y-6">
              <div class="flex items-center justify-between border-b pb-2">
                <h3 class="text-lg font-semibold text-gray-900">Media</h3>
                <div class="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    class="px-4 py-1.5 text-sm font-medium rounded-md transition-all {bannerSource ===
                    'url'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}"
                    onclick={() => (bannerSource = "url")}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    class="px-4 py-1.5 text-sm font-medium rounded-md transition-all {bannerSource ===
                    'local'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}"
                    onclick={() => (bannerSource = "local")}
                  >
                    Upload Image
                  </button>
                </div>
              </div>

              <div>
                {#if bannerSource === "url"}
                  <div in:fade>
                    <label
                      for="bannerUrl"
                      class="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Banner Image URL
                    </label>
                    <div class="flex gap-6 items-start">
                      <div class="flex-1">
                        <input
                          type="url"
                          id="bannerUrl"
                          bind:value={bannerUrl}
                          placeholder="https://example.com/image.jpg"
                          class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-gray-400"
                        />
                        <p class="text-xs text-gray-500 mt-2">
                          Paste a direct link to an image to be displayed on the
                          event card.
                        </p>
                      </div>
                      {#if bannerUrl}
                        <div
                          class="w-40 h-24 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 shrink-0 shadow-inner group relative"
                        >
                          <img
                            src={bannerUrl}
                            alt="Preview"
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onerror={(e) =>
                              ((
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none")}
                          />
                          <div
                            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <span class="text-white text-xs font-bold"
                              >URL Preview</span
                            >
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div in:fade>
                    <label
                      for="bannerFile"
                      class="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Upload Event Banner
                    </label>
                    <div class="flex gap-6 items-start">
                      <div class="flex-1">
                        <div
                          class="relative group cursor-pointer border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300"
                        >
                          <input
                            type="file"
                            id="bannerFile"
                            accept="image/*"
                            onchange={handleFileChange}
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div class="text-center">
                            <svg
                              class="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                            </svg>
                            <div
                              class="mt-4 flex text-sm text-gray-600 justify-center"
                            >
                              <span
                                class="font-semibold text-blue-600 hover:text-blue-500"
                                >Upload a file</span
                              >
                              <p class="pl-1 text-gray-500">or drag and drop</p>
                            </div>
                            <p class="mt-1 text-xs text-gray-500">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        </div>
                        {#if bannerFile}
                          <p class="text-sm font-medium text-blue-600 mt-2">
                            Selected: {bannerFile.name}
                          </p>
                        {/if}
                      </div>

                      {#if bannerPreview}
                        <div
                          class="w-40 h-24 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 shrink-0 shadow-inner group relative"
                        >
                          <img
                            src={bannerPreview}
                            alt="Local Preview"
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div
                            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <span class="text-white text-xs font-bold"
                              >Local Preview</span
                            >
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
          {#if error}
            <div
              class="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-pulse"
              in:slide
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
              <p class="text-red-600 font-medium">{error}</p>
            </div>
          {/if}

          <!-- Submit Button -->
          <div
            class="flex items-center gap-4 pt-8 border-t border-gray-100 mt-8"
          >
            <button
              type="submit"
              disabled={submitting || isUploadingBanner}
              class="flex-1 sm:flex-none px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30 min-w-[160px]"
            >
              {#if submitting || isUploadingBanner}
                <div class="flex items-center justify-center gap-2">
                  <div
                    class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  ></div>
                  <span
                    >{isUploadingBanner ? "Uploading..." : "Creating..."}</span
                  >
                </div>
              {:else}
                Create Event
              {/if}
            </button>
            <a
              href="/clubs/{clubId}/events"
              use:routeAction
              class="px-8 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    {/if}
  </div>
</div>
