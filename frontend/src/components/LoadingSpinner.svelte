<script lang="ts">
  interface Props {
    size?: "sm" | "md" | "lg" | "xl";
    color?: "blue" | "white" | "gray";
    text?: string;
  }

  let { size = "md", color = "blue", text = "" }: Props = $props();

  const sizes: Record<"sm" | "md" | "lg" | "xl", string> = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
    xl: "w-24 h-24 border-6",
  };

  const colors: Record<"blue" | "white" | "gray", string> = {
    blue: "border-blue-200 border-t-blue-600",
    white: "border-white/30 border-t-white",
    gray: "border-gray-200 border-t-gray-600",
  };
</script>

<div class="flex flex-col items-center justify-center gap-4 p-8">
  <div class="{sizes[size]} {colors[color]} rounded-full animate-spin"></div>
  {#if text}
    <p class="text-gray-600 font-medium animate-pulse">{text}</p>
  {/if}
</div>
