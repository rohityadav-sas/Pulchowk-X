<script lang="ts">
	import {
		Router,
		type RouteConfig,
		route
	} from '@mateothegreat/svelte5-router'
	import Home from './pages/Home.svelte'
	import Register from './pages/Register.svelte'
	import Dashboard from './pages/Dashboard.svelte'
	import { authClient } from './lib/auth-client'

	const session = authClient.useSession()

	const routes: RouteConfig[] = [
		{
			component: Home
		},
		{
			path: 'register',
			component: Register
		},
		{
			path: 'dashboard',
			component: Dashboard
		}
	]
</script>

<nav
	class="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm"
>
	<div class="max-w-7xl mx-auto px-6 py-4">
		<div class="flex items-center justify-between">
			<a href="/" use:route class="flex items-center gap-2 group">
				<div
					class="w-8 h-8 bg-linear-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
				>
					<span class="text-white font-bold text-sm">P</span>
				</div>
				<span
					class="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
					>PulchowkX</span
				>
			</a>
			<div class="flex items-center gap-6">
				<a
					href="/"
					use:route
					class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
					>Home</a
				>
				{#if $session.data?.user}
					<a
						href="/dashboard"
						use:route
						class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
						>Dashboard</a
					>
				{:else}
					<a
						href="/register"
						use:route
						class="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
						>Sign In</a
					>
				{/if}
			</div>
		</div>
	</div>
</nav>

<main class="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
	<Router {routes} />
</main>

<footer class="bg-white border-t border-gray-200 py-8">
	<div class="max-w-7xl mx-auto px-6 text-center">
		<p class="text-gray-600 text-sm">© 2026 PulchowkX. All rights reserved.</p>
	</div>
</footer>
