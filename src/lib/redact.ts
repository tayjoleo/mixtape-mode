/**
 * Keeps OAuth values out of the debug log.
 *
 * The log is meant to be copied and pasted into a bug report, so an
 * authorization code or a state value sitting in a logged URL would travel
 * further than it should. Both are short-lived, but neither belongs in a
 * pasted log.
 */
export const REDACTED = '[redacted]';

/**
 * Redacts the OAuth parameters in a page URL.
 *
 * `code` always goes. `state` goes only when the URL also carries `code` or
 * `error`, which is what an OAuth callback looks like. That exception matters:
 * `/me/player/shuffle?state=false` is an ordinary API call whose `state` is
 * worth reading in the log, and must come through untouched.
 *
 * Anything unparseable is returned as-is rather than mangled.
 */
export function redactPageUrl(input: string): string {
  let url: URL;
  let relative = false;

  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(input, 'http://redact.invalid');
      relative = true;
    } catch {
      return input;
    }
  }

  const params = url.searchParams;
  const looksLikeCallback = params.has('code') || params.has('error');
  let changed = false;

  if (params.has('code')) {
    params.set('code', REDACTED);
    changed = true;
  }
  if (looksLikeCallback && params.has('state')) {
    params.set('state', REDACTED);
    changed = true;
  }

  if (!changed) return input;

  const out = relative ? url.pathname + url.search + url.hash : url.toString();
  // URLSearchParams percent-encodes the brackets; keep the log readable.
  return out.replace(/%5Bredacted%5D/gi, REDACTED);
}
