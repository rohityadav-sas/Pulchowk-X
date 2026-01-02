<script lang="ts">
	import Google from '../icons/google.svelte'
	import { authClient } from '../lib/auth-client'
	let signingIn = $state(false)
	let error = $state<string | null>(null)

	const handleGoogleSignIn = async () => {
		signingIn = true
		try {
			await authClient.signIn.social({
				provider: 'google',
				callbackURL: import.meta.env.DEV
					? 'http://localhost:5173/dashboard'
					: '/'
			})
		} catch (err: any) {
			error = err.message
			signingIn = false
		}
	}
</script>

<main class="min-h-[80vh] flex items-center justify-center relative p-8">
	<div
		class="w-full max-w-md bg-white rounded-2xl px-10 py-12 shadow-xl border border-gray-100"
	>
		<div class="space-y-6">
			<div class="text-center space-y-2 mb-8">
				<h2 class="text-3xl font-bold text-gray-900">Welcome</h2>
				<p class="text-gray-600">Sign in to continue to PulchowkX</p>
			</div>

			<button
				class="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-semibold text-base cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={handleGoogleSignIn}
				disabled={signingIn}
			>
				<Google />
				<span>
					{signingIn ? 'Signing in...' : 'Continue with Google'}
				</span>
			</button>

			{#if error}
				<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-red-600 text-sm text-center">{error}</p>
				</div>
			{/if}
		</div>

		<div class="mt-8 pt-6 border-t border-gray-200">
			<p class="text-xs text-gray-500 text-center leading-relaxed">
				By signing in, you agree to our
				<a href="#terms" class="text-blue-600 hover:text-blue-700 underline"
					>Terms of Service</a
				>
				and
				<a href="#privacy" class="text-blue-600 hover:text-blue-700 underline"
					>Privacy Policy</a
				>
			</p>
		</div>
	</div>
</main>
