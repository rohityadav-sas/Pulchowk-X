<script lang="ts">
	import { route } from '@mateothegreat/svelte5-router'
	import { authClient } from '../lib/auth-client'

	const session = authClient.useSession()
</script>

<section
	class="flex flex-col items-center justify-center min-h-[80vh] text-center px-4"
>
	<div class="max-w-3xl w-full space-y-8">
		<div class="space-y-4">
			<h1
				class="text-5xl md:text-6xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
			>
				Welcome to PulchowkX
			</h1>
			<p class="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
				A modern Svelte app starter with authentication and routing.
			</p>
		</div>

		{#if $session.isPending}
			<div class="flex items-center justify-center gap-3 py-8">
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
		{:else if $session.data?.user}
			<div
				class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6"
			>
				<div class="flex items-center justify-center gap-4">
					<div
						class="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold"
					>
						{$session.data.user.name?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="text-left">
						<h2 class="text-2xl font-semibold text-gray-900">
							{$session.data.user.name}
						</h2>
						<p class="text-gray-500">{$session.data.user.email}</p>
					</div>
				</div>
				<a
					href="/dashboard"
					use:route
					class="inline-block bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
				>
					Go to Dashboard
				</a>
			</div>
		{:else if $session.error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-6">
				<p class="text-red-600 font-medium">Error: {$session.error.message}</p>
			</div>
		{:else}
			<div class="space-y-4">
				<a
					href="/register"
					use:route
					class="inline-block bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
				>
					Get Started
				</a>
				<p class="text-sm text-gray-500">
					Join us and explore amazing features
				</p>
			</div>
		{/if}
	</div>
</section>
