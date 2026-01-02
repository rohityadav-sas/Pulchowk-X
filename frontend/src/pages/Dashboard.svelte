<script lang="ts">
	import { goto, route } from '@mateothegreat/svelte5-router'
	import { authClient } from '../lib/auth-client'

	let loading = $state(false)
	let error = $state<string | null>(null)
	const session = authClient.useSession()

	const handleSignOut = async () => {
		loading = true
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						window.location.href = '/'
					}
				}
			})
		} catch (err: any) {
			error = err.message
		} finally {
			loading = false
		}
	}
</script>

<div class="min-h-[80vh] px-4 py-12">
	<div class="max-w-6xl mx-auto">
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
			<!-- Header Section -->
			<div
				class="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl"
			>
				<div class="flex items-center justify-between flex-wrap gap-4">
					<div class="flex items-center gap-4">
						<div
							class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30"
						>
							{$session.data.user.name?.charAt(0).toUpperCase() || 'U'}
						</div>
						<div>
							<h1 class="text-3xl font-bold">
								Welcome back, {$session.data.user.name?.split(' ')[0] ||
									'User'}!
							</h1>
							<p class="text-white/80 mt-1">{$session.data.user.email}</p>
						</div>
					</div>
					<button
						onclick={handleSignOut}
						disabled={loading}
						class="bg-white/20 cursor-pointer hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold transition-all duration-200 border border-white/30"
					>
						{loading ? 'Signing Out...' : 'Sign Out'}
					</button>
				</div>
				{#if error}
					<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-red-600 text-sm text-center">{error}</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="text-center py-20">
				<p class="text-gray-600 text-lg mb-4">
					Please sign in to view your dashboard
				</p>
				<a
					href="/register"
					use:route
					class="inline-block bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg"
				>
					Sign In
				</a>
			</div>
		{/if}
	</div>
</div>
