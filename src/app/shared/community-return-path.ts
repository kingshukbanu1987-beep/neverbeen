const COMMUNITY_RETURN_PATH_KEY = 'neverbeen_community_return_path';

/** Remember the same-origin page to return to after the OAuth round trip / registration. */
export function rememberCommunityReturnPath(path: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const target = new URL(path, globalThis.location?.origin ?? 'https://neverbeen.invalid');
    if (target.origin !== (globalThis.location?.origin ?? target.origin)) return;
    if (!target.pathname.startsWith('/') || target.pathname.startsWith('//')) return;
    sessionStorage.setItem(
      COMMUNITY_RETURN_PATH_KEY,
      `${target.pathname}${target.search}${target.hash}`,
    );
  } catch {
    // Storage can be disabled by a browser's privacy settings; auth still works normally.
  }
}

/** Reads and clears a safe, same-origin post-authentication return path. */
export function takeCommunityReturnPath(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const path = sessionStorage.getItem(COMMUNITY_RETURN_PATH_KEY);
    sessionStorage.removeItem(COMMUNITY_RETURN_PATH_KEY);
    if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
    return path;
  } catch {
    return null;
  }
}
