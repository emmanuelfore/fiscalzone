/**
 * Module-level online state shared across all data hooks.
 *
 * In Electron, `navigator.onLine` is unreliable (often returns `true` even
 * when there is no internet). This module maintains a probed online state
 * that is updated by `useIsOnline` and can be read synchronously by query
 * functions without needing a React hook.
 *
 * In Electron we start as `false` (assume offline) so data hooks immediately
 * read from IndexedDB cache on first render. The probe in `useIsOnline` will
 * set this to `true` within ~1.5s if the server is reachable, triggering a
 * React Query refetch that loads fresh data.
 *
 * In the browser we start with `navigator.onLine` as usual.
 */

// Start with navigator.onLine — simple and reliable.
let _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

/** Read the current probed online state synchronously. */
export function getIsOnline(): boolean {
    return _isOnline;
}

/** Called by useIsOnline whenever the probed state changes. */
export function setOnlineState(online: boolean): void {
    _isOnline = online;
}
