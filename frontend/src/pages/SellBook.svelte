<script lang="ts">
    import {
        route as routeAction,
        goto,
        query as queryParams,
    } from "@mateothegreat/svelte5-router";
    import {
        createBookListing,
        updateBookListing,
        getBookListingById,
        getBookCategories,
        uploadBookImage,
    } from "../lib/api";
    import LoadingSpinner from "../components/LoadingSpinner.svelte";
    import { fade, fly } from "svelte/transition";
    import { authClient } from "../lib/auth-client";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";

    const session = authClient.useSession();
    const queryClient = useQueryClient();
    const editId = queryParams("edit");

    // Stepper logic
    let currentStep = $state(1);
    const totalSteps = 3;

    let isSubmitting = $state(false);
    let errorMessage = $state("");
    let imageFiles = $state<File[]>([]);
    let imagePreviews = $state<string[]>([]);

    // Form data
    let title = $state("");
    let author = $state("");
    let isbn = $state("");
    let edition = $state("");
    let publisher = $state("");
    let publicationYear = $state<number | undefined>(undefined);
    let condition = $state<"new" | "like_new" | "good" | "fair" | "poor">(
        "good",
    );
    let description = $state("");
    let price = $state("");
    let courseCode = $state("");
    let categoryId = $state<number | undefined>(undefined);

    const isEdit = $derived(!!editId);

    const categoriesQuery = createQuery(() => ({
        queryKey: ["book-categories"],
        queryFn: async () => {
            const result = await getBookCategories();
            return result.success && result.data ? result.data : [];
        },
    }));

    const editQuery = createQuery(() => ({
        queryKey: ["book-listing-edit", editId],
        queryFn: async () => {
            if (!editId) return null;
            const result = await getBookListingById(parseInt(editId));
            if (result.success && result.data) return result.data;
            throw new Error(result.message || "Failed to load listing");
        },
        enabled: !!editId,
    }));

    $effect(() => {
        if (editQuery.data && isEdit) {
            const book = editQuery.data;
            title = book.title;
            author = book.author;
            isbn = book.isbn || "";
            edition = book.edition || "";
            publisher = book.publisher || "";
            publicationYear = book.publicationYear || undefined;
            condition = book.condition;
            description = book.description || "";
            price = book.price;
            courseCode = book.courseCode || "";
            categoryId = book.categoryId || undefined;
            if (book.images)
                imagePreviews = book.images.map((img) => img.imageUrl);
        }
    });

    $effect(() => {
        if (!$session.isPending && !$session.data?.user) {
            goto("/register?message=login_required");
        }
    });

    const steps = [
        { id: 1, title: "Basics", icon: "📚" },
        { id: 2, title: "Details", icon: "🔍" },
        { id: 3, title: "Finish", icon: "✨" },
    ];

    const conditionOptions = [
        { value: "new", label: "New", icon: "🌟", desc: "Never opened" },
        {
            value: "like_new",
            label: "Like New",
            icon: "✨",
            desc: "Minimal use",
        },
        { value: "good", label: "Good", icon: "👍", desc: "Well kept" },
        { value: "fair", label: "Fair", icon: "📖", desc: "Used well" },
        { value: "poor", label: "Poor", icon: "🩹", desc: "Damaged" },
    ] as const;

    function nextStep() {
        if (currentStep === 1) {
            if (!title || !author) {
                errorMessage = "Please fill in the book title and author.";
                return;
            }
        }
        if (currentStep < totalSteps) {
            currentStep++;
            errorMessage = "";
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
            errorMessage = "";
        }
    }

    function handleImageChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            const newFiles = Array.from(input.files);
            imageFiles = [...imageFiles, ...newFiles];
            newFiles.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (e) =>
                    (imagePreviews = [
                        ...imagePreviews,
                        e.target?.result as string,
                    ]);
                reader.readAsDataURL(file);
            });
        }
    }

    function removeImage(index: number) {
        imageFiles = imageFiles.filter((_, i) => i !== index);
        imagePreviews = imagePreviews.filter((_, i) => i !== index);
    }

    async function handleSubmit() {
        if (!$session.data?.user) return;
        if (!price) {
            errorMessage = "Please set a price for your book.";
            return;
        }

        isSubmitting = true;
        errorMessage = "";

        try {
            const listingData = {
                title,
                author,
                isbn: isbn || undefined,
                edition: edition || undefined,
                publisher: publisher || undefined,
                publicationYear,
                condition,
                description: description || undefined,
                price,
                courseCode: courseCode || undefined,
                categoryId: categoryId || undefined,
            };

            const result =
                isEdit && editId
                    ? await updateBookListing(parseInt(editId), listingData)
                    : await createBookListing(listingData);

            if (!result.success) {
                errorMessage = result.message || "Failed to save listing";
                return;
            }

            if (!isEdit && result.data && imageFiles.length > 0) {
                for (const file of imageFiles) {
                    await uploadBookImage(result.data.id, file);
                }
            }

            queryClient.invalidateQueries({ queryKey: ["book-listings"] });
            queryClient.invalidateQueries({ queryKey: ["my-book-listings"] });
            goto(isEdit ? `/books/${editId}` : "/books/my-books");
        } catch (error: any) {
            errorMessage = error.message || "An error occurred";
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="min-h-screen bg-[#f8fafc] px-4 py-8 lg:py-12">
    <div class="max-w-4xl mx-auto">
        <!-- Back Link & Header -->
        <div class="flex items-center justify-between mb-8">
            <a
                href="/books"
                use:routeAction
                class="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
            >
                <div
                    class="p-2 rounded-full group-hover:bg-blue-50 transition-colors"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                </div>
                <span class="font-medium">Back to Marketplace</span>
            </a>
            {#if $session.data?.user}
                <div class="hidden md:block">
                    <span class="text-sm font-medium text-slate-400"
                        >Listed by {$session.data.user.name}</span
                    >
                </div>
            {/if}
        </div>

        <div
            class="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative"
        >
            <!-- Sleek Progress Bar -->
            <div class="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                <div
                    class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                    style="width: {(currentStep / totalSteps) * 100}%"
                ></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12">
                <!-- Left Sidebar: Steps Indicator -->
                <div
                    class="lg:col-span-4 bg-slate-50/50 border-r border-slate-100 p-8 pt-12"
                >
                    <h1
                        class="text-3xl font-black text-slate-900 mb-8 leading-tight"
                    >
                        {isEdit ? "Refine your" : "List your"}
                        <span
                            class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"
                            >Masterpiece</span
                        >
                    </h1>

                    <div class="space-y-8 relative">
                        <div
                            class="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-200"
                        ></div>

                        {#each steps as step}
                            <div
                                class="flex items-center gap-4 relative z-10 group"
                            >
                                <div
                                    class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                    {currentStep >= step.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                        : 'bg-white text-slate-400 border border-slate-200'}"
                                >
                                    <span class="text-xl">{step.icon}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span
                                        class="text-xs font-bold uppercase tracking-wider {currentStep >=
                                        step.id
                                            ? 'text-blue-600'
                                            : 'text-slate-400'}"
                                        >Step {step.id}</span
                                    >
                                    <span class="font-bold text-slate-900"
                                        >{step.title}</span
                                    >
                                </div>
                            </div>
                        {/each}
                    </div>

                    <div
                        class="mt-12 p-6 rounded-3xl bg-blue-600 text-white relative overflow-hidden group"
                    >
                        <div
                            class="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"
                        ></div>
                        <p
                            class="text-sm font-medium leading-relaxed relative z-10"
                        >
                            "Selling your old books helps fellow students and
                            keeps the campus cycle moving."
                        </p>
                    </div>
                </div>

                <!-- Right Content: Form Steps -->
                <div class="lg:col-span-8 p-8 lg:p-12">
                    {#if errorMessage}
                        <div
                            class="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3"
                            in:fade
                        >
                            <svg
                                class="w-5 h-5 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            <span class="text-sm font-medium"
                                >{errorMessage}</span
                            >
                        </div>
                    {/if}

                    {#if currentStep === 1}
                        <div in:fly={{ x: 20, duration: 400 }} out:fade>
                            <div class="mb-8">
                                <h2
                                    class="text-2xl font-bold text-slate-900 mb-2"
                                >
                                    Book Essentials
                                </h2>
                                <p class="text-slate-500">
                                    Let's start with the basics. What are you
                                    selling?
                                </p>
                            </div>

                            <div class="space-y-6">
                                <div class="group">
                                    <label
                                        for="title"
                                        class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                        >Title <span class="text-rose-500"
                                            >*</span
                                        ></label
                                    >
                                    <input
                                        type="text"
                                        id="title"
                                        bind:value={title}
                                        placeholder="Enter the full book title"
                                        class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                                <div class="group">
                                    <label
                                        for="author"
                                        class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                        >Author <span class="text-rose-500"
                                            >*</span
                                        ></label
                                    >
                                    <input
                                        type="text"
                                        id="author"
                                        bind:value={author}
                                        placeholder="Who wrote this?"
                                        class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    <div>
                                        <label
                                            for="isbn"
                                            class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                            >ISBN (Optional)</label
                                        >
                                        <input
                                            type="text"
                                            id="isbn"
                                            bind:value={isbn}
                                            placeholder="978-..."
                                            class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 placeholder:text-slate-300 shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for="edition"
                                            class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                            >Edition</label
                                        >
                                        <input
                                            type="text"
                                            id="edition"
                                            bind:value={edition}
                                            placeholder="e.g. 3rd Edition"
                                            class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 placeholder:text-slate-300 shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    {:else if currentStep === 2}
                        <div in:fly={{ x: 20, duration: 400 }} out:fade>
                            <div class="mb-8">
                                <h2
                                    class="text-2xl font-bold text-slate-900 mb-2"
                                >
                                    Deeper Details
                                </h2>
                                <p class="text-slate-500">
                                    Provide context to help buyers find your
                                    book.
                                </p>
                            </div>

                            <div class="space-y-8">
                                <div>
                                    <p
                                        class="block text-sm font-bold text-slate-700 mb-4 ml-1"
                                    >
                                        Condition <span class="text-rose-500"
                                            >*</span
                                        >
                                    </p>
                                    <div
                                        class="grid grid-cols-2 sm:grid-cols-3 gap-3"
                                    >
                                        {#each conditionOptions as opt}
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    (condition = opt.value)}
                                                class="flex flex-col items-center p-4 rounded-3xl border-2 transition-all duration-300 text-center group
                                                {condition === opt.value
                                                    ? 'border-blue-500 bg-blue-50/50 shadow-md scale-[1.02]'
                                                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}"
                                            >
                                                <span
                                                    class="text-2xl mb-2 group-hover:scale-110 transition-transform"
                                                    >{opt.icon}</span
                                                >
                                                <span
                                                    class="font-bold text-sm {condition ===
                                                    opt.value
                                                        ? 'text-blue-700'
                                                        : 'text-slate-700'}"
                                                    >{opt.label}</span
                                                >
                                                <span
                                                    class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter"
                                                    >{opt.desc}</span
                                                >
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-6"
                                >
                                    <div>
                                        <label
                                            for="category"
                                            class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                            >Category</label
                                        >
                                        <div class="relative">
                                            <select
                                                id="category"
                                                bind:value={categoryId}
                                                class="w-full pl-6 pr-12 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 appearance-none bg-white shadow-sm"
                                            >
                                                <option value={undefined}
                                                    >Select category</option
                                                >
                                                {#if categoriesQuery.data}
                                                    {#each categoriesQuery.data as cat}
                                                        <option value={cat.id}
                                                            >{cat.name}</option
                                                        >
                                                    {/each}
                                                {/if}
                                            </select>
                                            <div
                                                class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                                            >
                                                <svg
                                                    class="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    ><path
                                                        d="M19 9l-7 7-7-7"
                                                        stroke-width="2"
                                                    /></svg
                                                >
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            for="course"
                                            class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                            >Course Code</label
                                        >
                                        <input
                                            type="text"
                                            id="course"
                                            bind:value={courseCode}
                                            placeholder="e.g. CS101"
                                            class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        for="desc"
                                        class="block text-sm font-bold text-slate-700 mb-2 ml-1"
                                        >About this copy</label
                                    >
                                    <textarea
                                        id="desc"
                                        bind:value={description}
                                        rows="3"
                                        placeholder="Tell buyers about highlights, missing pages, or extra value..."
                                        class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-900 shadow-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div in:fly={{ x: 20, duration: 400 }} out:fade>
                            <div class="mb-8">
                                <h2
                                    class="text-2xl font-bold text-slate-900 mb-2"
                                >
                                    Final Touches
                                </h2>
                                <p class="text-slate-500">
                                    Set your price and show off your book!
                                </p>
                            </div>

                            <div class="space-y-8">
                                <div>
                                    <label
                                        for="price"
                                        class="block text-sm font-bold text-slate-700 mb-3 ml-1"
                                        >Price <span class="text-rose-500"
                                            >*</span
                                        ></label
                                    >
                                    <div class="relative group max-w-[240px]">
                                        <span
                                            class="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-blue-600 text-lg"
                                            >Rs.</span
                                        >
                                        <input
                                            type="number"
                                            id="price"
                                            bind:value={price}
                                            class="w-full pl-16 pr-6 py-5 rounded-3xl border-2 border-slate-100 focus:border-blue-500 focus:ring-8 focus:ring-blue-50 transition-all outline-none text-2xl font-black text-slate-900 shadow-sm"
                                        />
                                    </div>
                                </div>

                                {#if !isEdit}
                                    <div class="space-y-4">
                                        <p
                                            class="block text-sm font-bold text-slate-700 ml-1"
                                        >
                                            Photos (Up to 5)
                                        </p>
                                        <div
                                            class="grid grid-cols-2 sm:grid-cols-4 gap-4"
                                        >
                                            {#each imagePreviews as preview, i}
                                                <div
                                                    class="relative aspect-square rounded-3xl overflow-hidden border-2 border-slate-100 group shadow-lg"
                                                    in:fade
                                                >
                                                    <img
                                                        src={preview}
                                                        alt=""
                                                        class="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            removeImage(i)}
                                                        class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white"
                                                    >
                                                        <svg
                                                            class="w-4 h-4"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                            ><path
                                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                            /></svg
                                                        >
                                                    </button>
                                                </div>
                                            {/each}

                                            {#if imagePreviews.length < 5}
                                                <label
                                                    class="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onchange={handleImageChange}
                                                        class="hidden"
                                                    />
                                                    <div
                                                        class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"
                                                    >
                                                        <svg
                                                            class="w-6 h-6"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                            ><path
                                                                d="M12 4v16m8-8H4"
                                                                stroke-width="2.5"
                                                                stroke-linecap="round"
                                                            /></svg
                                                        >
                                                    </div>
                                                    <span
                                                        class="text-xs font-bold text-slate-400 group-hover:text-blue-600"
                                                        >Add Photo</span
                                                    >
                                                </label>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Navigation Footer -->
                    <div
                        class="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between gap-4"
                    >
                        <button
                            type="button"
                            onclick={prevStep}
                            disabled={currentStep === 1 || isSubmitting}
                            class="px-8 py-3.5 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                        >
                            Previous
                        </button>

                        <div class="flex-1 flex justify-end">
                            {#if currentStep < totalSteps}
                                <button
                                    type="button"
                                    onclick={nextStep}
                                    class="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-slate-200"
                                >
                                    Continue
                                    <svg
                                        class="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        ><path
                                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        /></svg
                                    >
                                </button>
                            {:else}
                                <button
                                    type="button"
                                    onclick={handleSubmit}
                                    disabled={isSubmitting}
                                    class="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-3xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-2xl shadow-blue-200 flex items-center justify-center gap-3"
                                >
                                    {#if isSubmitting}
                                        <div
                                            class="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"
                                        ></div>
                                        <span>Saving...</span>
                                    {:else}
                                        <svg
                                            class="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                d="M5 13l4 4L19 7"
                                                stroke-width="3"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            /></svg
                                        >
                                        <span
                                            >{isEdit
                                                ? "Publish Changes"
                                                : "Post Listing Now"}</span
                                        >
                                    {/if}
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 text-center">
            <p class="text-sm text-slate-400 font-medium pb-8">
                Your listing will be visible to students in the marketplace
                immediately after posting.
            </p>
        </div>
    </div>
</div>

<style>
    :global(body) {
        background-color: #f8fafc;
    }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
</style>
