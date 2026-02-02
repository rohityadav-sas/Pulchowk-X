const stripTimeZone = (value: string): string => {
  return value.replace(/([+-]\d{2}:?\d{2}|Z)$/i, "");
};

export const parseEventDateTime = (value?: string | null): Date => {
  if (!value) return new Date(NaN);
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);

  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/,
  );
  if (match) {
    const localIso = `${match[1]}T${match[2]}`;
    return new Date(stripTimeZone(localIso));
  }

  return new Date(stripTimeZone(trimmed));
};

export const formatEventDate = (
  value: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  const date = parseEventDateTime(value);
  return date.toLocaleDateString("en-US", options);
};

export const formatEventTime = (
  value: string,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const date = parseEventDateTime(value);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
};

export const getEventTimeMs = (value: string): number =>
  parseEventDateTime(value).getTime();
