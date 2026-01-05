<script lang="ts">
	import { route } from "@mateothegreat/svelte5-router";
	import { authClient } from "../lib/auth-client";

	const session = authClient.useSession();
</script>

<div class="flex flex-col min-h-[calc(100vh-4rem)]">
	<!-- Hero Section -->
	<section class="relative py-20 lg:py-32 overflow-hidden">
		<div class="absolute inset-0 -z-10">
			<div class="absolute inset-0 bg-gray-50"></div>
			<div
				class="absolute top-0 right-0 -translate-y-12 translate-x-12 blur-3xl opacity-30"
			>
				<div class="aspect-square w-96 rounded-full bg-blue-400"></div>
			</div>
			<div
				class="absolute bottom-0 left-0 translate-y-12 -translate-x-12 blur-3xl opacity-30"
			>
				<div
					class="aspect-square w-96 rounded-full bg-purple-400"
				></div>
			</div>
		</div>

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
			<div class="max-w-3xl mx-auto space-y-8">
				<h1
					class="text-5xl md:text-7xl font-bold tracking-tight text-gray-900"
				>
					Navigate Pulchowk Campus like a <span class="text-blue-600"
						>Pro</span
					>
				</h1>
				<p class="text-xl text-gray-600 leading-relaxed">
					The ultimate digital guide for IOE Pulchowk Campus. Find
					classrooms, departments, and amenities with our interactive
					map system.
				</p>

				<div
					class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
				>
					{#if $session.isPending}
						<div
							class="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"
						></div>
					{:else if $session.data?.user}
						<a
							use:route
							href="/map"
							class="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
						>
							Launch Map
						</a>
						<a
							use:route
							href="/dashboard"
							class="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-xl font-semibold transition-all hover:-translate-y-1"
						>
							Go to Dashboard
						</a>
					{:else}
						<a
							href="/register"
							class="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
						>
							Get Started
						</a>
						<a
							href="#features"
							class="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-xl font-semibold transition-all hover:-translate-y-1"
						>
							Learn More
						</a>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Features Grid -->
	<section id="features" class="py-24 bg-white">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid md:grid-cols-3 gap-12">
				<!-- Feature 1 -->
				<div class="space-y-4">
					<div
						class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"
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
					<h3 class="text-xl font-bold text-gray-900">
						Interactive Map
					</h3>
					<p class="text-gray-600">
						Detailed map of the entire campus with search
						functionality to find any building or department
						instantly.
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="space-y-4">
					<div
						class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600"
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
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							></path>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							></path>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-gray-900">
						Location Search
					</h3>
					<p class="text-gray-600">
						Smart autocomplete search to help you find classrooms,
						labs, and administrative offices by name.
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="space-y-4">
					<div
						class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600"
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
								d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
							></path>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-gray-900">
						Mobile Friendly
					</h3>
					<p class="text-gray-600">
						Optimized for all devices so you can navigate the campus
						easily from your smartphone.
					</p>
				</div>
			</div>
		</div>
	</section>
</div>
