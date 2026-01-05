<script lang="ts">
	import {
		Router,
		type RouteConfig,
		type RouterInstance,
		query,
		goto,
		route,
	} from "@mateothegreat/svelte5-router";
	import { authClient } from "./lib/auth-client";
	import LoadingSpinner from "./components/LoadingSpinner.svelte";
	import Home from "./pages/Home.svelte";
	import Register from "./pages/Register.svelte";
	import Dashboard from "./pages/Dashboard.svelte";

	let instance: RouterInstance = $state()!;

	const session = authClient.useSession();

	const error = query("error");
	let showError = $state(error === "unauthorized_domain");

	if (error) goto("/");

	const routes: RouteConfig[] = [
		{
			component: Home,
		},
		{
			path: "register",
			component: Register,
		},
		{
			path: "dashboard",
			component: Dashboard,
		},
		{
			path: "map",
			component: async () => await import("./pages/Map.svelte"),
		},
	];
</script>

<nav
	class="bg-white/80 border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md"
>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<a href="/" class="flex items-center gap-2.5 group">
				<div
					class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105"
				>
					<span class="text-white font-bold text-lg">P</span>
				</div>
				<span
					class="text-xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors"
					>PulchowkX</span
				>
			</a>
			<div class="flex items-center gap-1 sm:gap-2">
				<a
					use:route
					href="/"
					class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
					>Home</a
				>
				{#if $session.isPending}
					<div
						class="h-9 w-24 bg-gray-100 rounded-lg animate-pulse"
					></div>
				{:else if $session.data?.user}
					<a
						use:route
						href="/map"
						class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
						>Map</a
					>
					<a
						use:route
						href="/dashboard"
						class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
						>Dashboard</a
					>
				{:else}
					<a
						href="/register"
						class="ml-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
						>Sign In</a
					>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Error Toast -->
{#if showError}
	<div
		class="fixed top-24 right-4 z-50 animate-in fade-in slide-in-from-right-8 duration-300 max-w-md w-full"
	>
		<div
			class="bg-white border-l-4 border-red-500 rounded-r-lg shadow-xl p-4 flex items-start gap-3"
		>
			<div class="p-1 bg-red-50 rounded-full text-red-500 shrink-0">
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
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
			</div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-gray-900">
					Access Denied
				</h3>
				<p class="text-sm text-gray-600 mt-1">
					Please use your <span class="font-medium text-gray-900"
						>@pcampus.edu.np</span
					> email address to sign in.
				</p>
			</div>
			<button
				aria-label="Close error message"
				onclick={() => (showError = false)}
				class="text-gray-400 hover:text-gray-600 transition-colors"
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
		</div>
	</div>
{/if}

<main class="min-h-[calc(100vh-4rem)] bg-gray-50">
	{#if instance?.navigating}
		<div
			class="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center"
		>
			<LoadingSpinner size="lg" text="Loading..." />
		</div>
	{/if}
	<Router bind:instance {routes} />
</main>

{#if instance?.current?.route?.path !== "/map"}
	<footer class="bg-white border-t border-gray-200 py-8 mt-auto">
		<div
			class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"
		>
			<p class="text-gray-500 text-sm">
				© 2026 PulchowkX. Built for IOE Pulchowk Campus.
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
					class="text-gray-400 hover:text-gray-600 transition-colors"
					>Terms</a
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
