/** What an email link (sign-up confirmation or password reset) brought back to the app. */
export interface AuthCallback {
  /** Our own marker added to the redirect URL: which email the link came from. */
  flow: 'confirm' | 'recovery' | null;
  /** PKCE flow: exchanged for a session. */
  code?: string;
  /** Implicit flow: the session itself, in the URL fragment. */
  accessToken?: string;
  refreshToken?: string;
  /** Set when the link is expired or already used. */
  error?: string;
}

/**
 * Reads auth parameters from both the query string and the fragment of a redirect URL.
 * Returns null for URLs that aren't auth callbacks, so ordinary deep links are left alone.
 */
export function parseAuthCallback(url: string): AuthCallback | null {
  const params = new Map<string, string>();
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = beforeHash.indexOf('?');
  const parts = [queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '', hashIndex >= 0 ? url.slice(hashIndex + 1) : ''];
  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = decode(eq >= 0 ? pair.slice(0, eq) : pair);
      const value = decode(eq >= 0 ? pair.slice(eq + 1) : '');
      if (key) params.set(key, value);
    }
  }

  const code = params.get('code') || undefined;
  const accessToken = params.get('access_token') || undefined;
  const refreshToken = params.get('refresh_token') || undefined;
  const error = params.get('error_code') || params.get('error') || undefined;
  if (!code && !(accessToken && refreshToken) && !error) return null;

  const marker = params.get('flow');
  const type = params.get('type');
  const flow = marker === 'recovery' || type === 'recovery' ? 'recovery' : marker === 'confirm' || type === 'signup' ? 'confirm' : null;
  return { flow, code, accessToken, refreshToken, error };
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}
