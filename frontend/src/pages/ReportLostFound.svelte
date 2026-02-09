<script lang="ts">
  import { goto, route } from "@mateothegreat/svelte5-router";
  import { onMount } from "svelte";
  import {
    createLostFoundItem,
    uploadLostFoundImage,
    type LostFoundCategory,
    type LostFoundItemType,
  } from "../lib/api";
  import { authClient } from "../lib/auth-client";

  const session = authClient.useSession();
  const role = $derived(
    ($session.data?.user as any)?.role as string | undefined,
  );
  const isGuest = $derived(role === "guest");
  const canCreate = $derived(!!$session.data?.user && !isGuest);

  let itemType = $state<LostFoundItemType>("lost");
  let title = $state("");
  let description = $state("");
  let category = $state<LostFoundCategory>("other");
  let lostFoundDate = $state(new Date().toISOString().slice(0, 10));
  let locationText = $state("");
  let contactNote = $state("");
  let rewardText = $state("");
  let files = $state<File[]>([]);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  const categories: Array<{ value: LostFoundCategory; label: string }> = [
    { value: "documents", label: "Documents" },
    { value: "electronics", label: "Electronics" },
    { value: "accessories", label: "Accessories" },
    { value: "ids_cards", label: "ID Cards" },
    { value: "keys", label: "Keys" },
    { value: "bags", label: "Bags" },
    { value: "other", label: "Other" },
  ];

  function handleFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    files = [...input.files].slice(0, 5);
  }

  function clearSelectedFiles() {
    files = [];
    const input = document.getElementById(
      "lost-found-files",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function resetFormState() {
    title = "";
    description = "";
    locationText = "";
    contactNote = "";
    rewardText = "";
    files = [];
    error = null;
    lostFoundDate = new Date().toISOString().slice(0, 10);
    const input = document.getElementById(
      "lost-found-files",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  }

  async function submitForm() {
    if (!canCreate) return;
    if (!title.trim() || !description.trim() || !locationText.trim()) {
      error = "Title, description, and location are required.";
      return;
    }

    isSubmitting = true;
    error = null;

    const createResult = await createLostFoundItem({
      itemType,
      title: title.trim(),
      description: description.trim(),
      category,
      lostFoundDate,
      locationText: locationText.trim(),
      contactNote: contactNote.trim() || null,
      rewardText: rewardText.trim() || null,
    });

    if (!createResult.success || !createResult.data) {
      error = createResult.message || "Failed to create post.";
      isSubmitting = false;
      return;
    }

    if (files.length > 0) {
      for (const file of files) {
        const upload = await uploadLostFoundImage(createResult.data.id, file);
        if (!upload.success) {
          error = upload.message || "Item created, but image upload failed.";
          break;
        }
      }
    }

    isSubmitting = false;
    goto(`/lost-found/${createResult.data.id}`);
  }

  onMount(() => {
    // Avoid browser/session restoring old values so placeholders remain visible.
    resetFormState();
  });
</script>

<div class="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto space-y-4">
    <div>
      <a
        use:route
        href="/lost-found"
        class="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Lost & Found
      </a>
      <h1 class="mt-2 text-3xl font-black text-slate-900">
        Report Lost/Found Item
      </h1>
      <p class="text-sm text-slate-500 mt-1">
        Share clear details to help campus users identify the item quickly.
      </p>
    </div>

    {#if !canCreate}
      <div
        class="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-800"
      >
        Sign in with a non-guest account to post lost/found items.
      </div>
    {:else}
      <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        {#if error}
          <div
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500">Type</label>
            <select
              bind:value={itemType}
              class="cursor-pointer mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500">Category</label>
            <select
              bind:value={category}
              class="cursor-pointer mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              {#each categories as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs font-semibold text-slate-500">Title</label>
          <input
            bind:value={title}
            autocomplete="off"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 placeholder:opacity-100"
            placeholder="Black wallet with TU ID card"
          />
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs font-semibold text-slate-500">Description</label
          >
          <textarea
            bind:value={description}
            rows="4"
            autocomplete="off"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 placeholder:opacity-100"
            placeholder="Key details that can verify ownership..."
          ></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500">Date</label>
            <input
              type="date"
              bind:value={lostFoundDate}
              autocomplete="off"
              class="cursor-pointer mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500">Location</label>
            <input
              bind:value={locationText}
              autocomplete="off"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 placeholder:opacity-100"
              placeholder="Near library entrance"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500"
              >Contact Note (optional)</label
            >
            <input
              bind:value={contactNote}
              autocomplete="off"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 placeholder:opacity-100"
              placeholder="Meet at dept office 11am-2pm"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-xs font-semibold text-slate-500"
              >Reward (optional)</label
            >
            <input
              bind:value={rewardText}
              autocomplete="off"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 placeholder:opacity-100"
              placeholder="Reward available"
            />
          </div>
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs font-semibold text-slate-500">
            Images (up to 5)
          </label>
          <input
            id="lost-found-files"
            type="file"
            accept="image/*"
            multiple
            onchange={handleFilesChange}
            class="hidden"
          />
          <div class="mt-1 flex items-center gap-2">
            <label
              for="lost-found-files"
              class="cursor-pointer inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Choose Files
            </label>
            <span class="text-sm text-slate-500">
              {#if files.length === 0}
                No file chosen
              {:else if files.length === 1}
                {files[0].name}
              {:else}
                {files.length} files selected
              {/if}
            </span>
            {#if files.length > 0}
              <button
                type="button"
                class="cursor-pointer rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                onclick={clearSelectedFiles}
              >
                Clear
              </button>
            {/if}
          </div>
        </div>

        <button
          class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          onclick={submitForm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    {/if}
  </div>
</div>
