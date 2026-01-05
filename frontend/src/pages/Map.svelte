<script lang="ts">
	import {
		MapLibre,
		GeolocateControl,
		FullScreenControl,
		GeoJSONSource,
		FillLayer,
		SymbolLayer,
	} from "svelte-maplibre-gl";
	import type { FeatureCollection } from "geojson";
	import pulchowk from "./pulchowk.json";
	import { fade, fly } from "svelte/transition";
	import LoadingSpinner from "../components/LoadingSpinner.svelte";

	const pulchowkData = pulchowk as FeatureCollection;

	const labels = pulchowkData.features.slice(1);

	let search = $state("");
	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);
	let mapCenter = $state<[number, number]>([
		85.32121137093469, 27.68222689200303,
	]);
	let map: any = $state();

	let isLoaded = $state(false);

	const filteredSuggestions = $derived(
		search.trim()
			? labels
					.filter((label) =>
						label.properties?.description
							?.toLowerCase()
							.includes(search.toLowerCase()),
					)
					.slice(0, 8)
			: [],
	);

	function selectSuggestion(description: string) {
		search = description;
		showSuggestions = false;
		selectedIndex = -1;

		const selectedLocation = labels.find(
			(label) => label.properties?.description === description,
		);

		if (selectedLocation?.geometry?.type === "Polygon") {
			const coordinates = selectedLocation.geometry.coordinates[0];
			const centroid = coordinates.reduce(
				(acc, coord) => {
					acc[0] += coord[0];
					acc[1] += coord[1];
					return acc;
				},
				[0, 0],
			);
			centroid[0] /= coordinates.length;
			centroid[1] /= coordinates.length;
			if (map) {
				map.flyTo({
					center: [centroid[0], centroid[1]],
					zoom: 20,
					speed: 1.2,
					curve: 1.42,
					essential: true,
				});
			}
		} else if (selectedLocation?.geometry?.type === "Point") {
			const coords = selectedLocation.geometry.coordinates;
			if (map) {
				map.flyTo({
					center: [coords[0], coords[1]],
					zoom: 20,
					speed: 1.2,
					curve: 1.42,
					essential: true,
				});
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!filteredSuggestions.length) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(
				selectedIndex + 1,
				filteredSuggestions.length - 1,
			);
			scrollToSelected();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
			scrollToSelected();
		} else if (e.key === "Enter" && selectedIndex >= 0) {
			e.preventDefault();
			const selectedProperties =
				filteredSuggestions[selectedIndex].properties;
			if (selectedProperties?.description)
				selectSuggestion(selectedProperties.description);
		} else if (e.key === "Escape") {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	function scrollToSelected() {
		setTimeout(() => {
			const selectedElement = document.querySelector(
				`[data-suggestion-index="${selectedIndex}"]`,
			);
			if (selectedElement) {
				selectedElement.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
				});
			}
		}, 0);
	}
</script>

<div class="relative w-full h-[calc(100vh-4rem)] bg-gray-50">
	<!-- Search Container -->
	<div
		class="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
	>
		<div class="relative group">
			<!-- Search Icon -->
			<div
				class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600 z-10"
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
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					></path>
				</svg>
			</div>

			<input
				bind:value={search}
				type="text"
				placeholder="Search classrooms, departments..."
				class="w-full pl-12 pr-12 py-4 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 backdrop-blur-xl text-gray-800 placeholder-gray-400 transition-all text-base font-medium"
				onfocus={() => (showSuggestions = true)}
				oninput={() => (showSuggestions = true)}
				onblur={() => setTimeout(() => (showSuggestions = false), 200)}
				onkeydown={handleKeydown}
			/>

			{#if search}
				<button
					aria-label="Clear search"
					onclick={() => {
						search = "";
						showSuggestions = false;
						selectedIndex = -1;
					}}
					class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
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
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			{/if}

			<!-- Autocomplete Suggestions Dropdown -->
			{#if showSuggestions && filteredSuggestions.length > 0}
				<div
					class="absolute top-full mt-3 w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
					transition:fly={{ y: 10, duration: 200 }}
				>
					<ul class="max-h-[60vh] overflow-y-auto py-2">
						{#each filteredSuggestions as suggestion, index}
							<li>
								<button
									data-suggestion-index={index}
									onclick={() =>
										suggestion.properties?.description &&
										selectSuggestion(
											suggestion.properties.description,
										)}
									class="w-full px-5 py-3.5 text-left hover:bg-blue-50/80 transition-colors flex items-center gap-4 {index ===
									selectedIndex
										? 'bg-blue-50 text-blue-700'
										: 'text-gray-700'}"
								>
									<div
										class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 {index ===
										selectedIndex
											? 'bg-blue-200 text-blue-700'
											: 'text-blue-500'}"
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
									<div class="flex-1 min-w-0">
										<p class="font-medium truncate">
											{suggestion.properties?.description}
										</p>
										<p
											class="text-xs text-gray-500 truncate mt-0.5"
										>
											Pulchowk Campus
										</p>
									</div>
									{#if index === selectedIndex}
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
												d="M9 5l7 7-7 7"
											></path>
										</svg>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- No Results Message -->
			{#if showSuggestions && search.trim() && filteredSuggestions.length === 0}
				<div
					class="absolute top-full mt-3 w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 p-6 text-center"
					transition:fly={{ y: 10, duration: 200 }}
				>
					<div
						class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400"
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
								d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
					</div>
					<p class="text-gray-900 font-medium">No locations found</p>
					<p class="text-sm text-gray-500 mt-1">
						Try searching for a different building or department
					</p>
				</div>
			{/if}
		</div>
	</div>

	{#if !isLoaded}
		<div
			class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm"
			out:fade={{ duration: 300 }}
		>
			<LoadingSpinner size="lg" text="Loading Campus Map..." />
		</div>
	{/if}

	<MapLibre
		bind:map
		zoom={16}
		center={mapCenter}
		class="w-full h-full"
		style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
		onclick={(e) => {
			const latitude = e.lngLat.lat;
			const longitude = e.lngLat.lng;
			navigator.clipboard.writeText(`[${longitude}, ${latitude}]`);
		}}
		onload={() => (isLoaded = true)}
		maxBounds={[
			[85.31217093201366, 27.678215308346253],
			[85.329947502668, 27.686583278518555],
		]}
	>
		<GeoJSONSource data={pulchowkData} maxzoom={22}>
			<FillLayer
				paint={{
					"fill-color": "#fff",
					"fill-opacity": 1,
					"fill-outline-color": "#333",
				}}
			/>
			<SymbolLayer
				layout={{
					"text-field": "{description}",
					"text-size": 10,
					"text-anchor": "top",
					"text-justify": "center",
					"text-max-width": 5,
				}}
				paint={{
					"text-color": "green",
				}}
			/>
		</GeoJSONSource>

		<GeolocateControl
			position="top-right"
			positionOptions={{ enableHighAccuracy: true }}
			trackUserLocation={true}
			showAccuracyCircle={true}
			fitBoundsOptions={{ zoom: 18 }}
		/>

		<FullScreenControl position="top-right" />
	</MapLibre>
</div>
