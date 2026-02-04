<script lang="ts">
    interface Props {
        error?: Error | null;
        reset?: () => void;
    }

    let { error = null, reset }: Props = $props();
</script>

{#if error}
    <div class="min-h-[50vh] flex items-center justify-center p-4">
        <div class="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md w-full text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            </div>
            
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            
            <p class="text-gray-600 mb-6">
                {error.message || "An unexpected error occurred. Please try again."}
            </p>
            
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                {#if reset}
                    <button
                        onclick={reset}
                        class="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Try Again
                    </button>
                {/if}
                
                <button
                    onclick={() => window.location.reload()}
                    class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                    Reload Page
                </button>
            </div>
            
            {#if import.meta.env.DEV}
                <details class="mt-6 text-left">
                    <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                        Error Details (Dev Only)
                    </summary>
                    <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40 text-gray-600">
{error.stack || error.message}
                    </pre>
                </details>
            {/if}
        </div>
    </div>
{/if}
