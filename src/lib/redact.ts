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

/**
 * Keys whose values never belong in a log that gets pasted into a bug report.
 *
 * `GET /me` is the reason this exists: it returns the listener's email address
 * and internal account id, and the whole point of the debug panel is that it
 * gets copied and sent to someone else.
 */
const SENSITIVE_KEYS = new Set([
  'email',
  'account_id',
  'access_token',
  'refresh_token',
  'code_verifier',
]);

const MAX_DEPTH = 8;

/**
 * Deep-copies a value for logging, replacing sensitive values with
 * `[redacted]`. Everything else is left readable, because a log nobody can
 * read is not worth keeping.
 *
 * `seen` is path-based: an object is removed again on the way out, so an
 * object referenced twice side by side is not mistaken for a cycle.
 */
export function redactObject(value: unknown, depth = 0, seen = new Set<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[too deep]';
  if (seen.has(value)) return '[circular]';

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => redactObject(item, depth + 1, seen));
    }

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED
        : redactObject(item, depth + 1, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}
