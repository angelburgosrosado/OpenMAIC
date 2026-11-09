/**
 * TV Environment Detection
 *
 * Detects whether the current environment is running on a TV (Smart TV, Android TV,
 * Fire TV, Apple TV, etc.) or has explicitly enabled TV mode via URL search parameter (e.g. `?tv=1` or `?tv=true`).
 */

export function isTVEnvironment(search?: string, userAgent?: string): boolean {
  // 1. Check URL search query parameter (e.g. ?tv=1 or ?tv=true)
  const currentSearch =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';

  if (currentSearch) {
    try {
      const normalizedSearch = currentSearch.startsWith('?')
        ? currentSearch
        : `?${currentSearch}`;
      const params = new URLSearchParams(normalizedSearch);
      const tvParam = params.get('tv');
      if (tvParam === '1' || tvParam === 'true' || tvParam === 'yes') {
        return true;
      }
    } catch {
      if (/[?&]tv=(1|true|yes)(&|$)/i.test(currentSearch)) {
        return true;
      }
    }
  }

  // 2. Check User Agent
  const currentUA =
    userAgent !== undefined
      ? userAgent
      : typeof navigator !== 'undefined'
        ? navigator.userAgent
        : '';

  if (!currentUA) {
    return false;
  }

  const tvPatterns = [
    /bravia/i,
    /aft[a-z0-9]+/i, // Amazon Fire TV (AFTMM, AFTT, AFTS, AFTB, etc.)
    /android.*tv/i,
    /google ?tv/i,
    /smart-?tv/i,
    /tizen/i,
    /web0s|webos/i,
    /apple ?tv/i,
    /roku/i,
    /netcast/i,
    /viera/i,
    /crkey/i, // Chromecast
  ];

  return tvPatterns.some((pattern) => pattern.test(currentUA));
}
