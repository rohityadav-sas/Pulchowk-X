export const getEventStatusLabel = (status?: string | null): string => {
  const normalized = status?.toLowerCase().trim();
  if (!normalized) return "unknown";
  if (normalized === "published") return "upcoming";
  return normalized;
};
