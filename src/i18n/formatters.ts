/** Keep frequently rendered live-operation values from allocating a new Intl object every tick. */
export const FORMATTER_CACHE_LIMIT = 32;

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function optionsKey(locale: string, options: object) {
  return JSON.stringify([locale, Object.entries(options).sort(([a], [b]) => a.localeCompare(b))]);
}

function cachedFormatter<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const existing = cache.get(key);
  if (existing) {
    // Refresh the entry so a long-lived money/date formatter survives infrequent custom options.
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const formatter = create();
  cache.set(key, formatter);
  if (cache.size > FORMATTER_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return formatter;
}

export function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions = {}) {
  return cachedFormatter(
    numberFormatters,
    optionsKey(locale, options),
    () => new Intl.NumberFormat(locale, options),
  );
}

export function getDateFormatter(locale: string, options: Intl.DateTimeFormatOptions = {}) {
  return cachedFormatter(
    dateFormatters,
    optionsKey(locale, options),
    () => new Intl.DateTimeFormat(locale, options),
  );
}
