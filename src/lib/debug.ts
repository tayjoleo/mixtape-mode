/**
 * The debug log behind the panel described in spec section 6. Every SDK event,
 * API call and error lands here with a timestamp. This is the tool we use to
 * diagnose Milestone 1, so it records what happened rather than what we hoped
 * would happen.
 */
import { redactObject } from './redact';

export type DebugKind = 'app' | 'auth' | 'api' | 'sdk' | 'error';

export type DebugEntry = {
  readonly at: number;
  readonly kind: DebugKind;
  readonly message: string;
  readonly detail?: string;
};

const MAX_ENTRIES = 500;
const DEBUG_FLAG_KEY = 'mm.debug';

let entries: readonly DebugEntry[] = [];
const listeners = new Set<() => void>();

/**
 * Details are flattened to a string here rather than at render time: the panel
 * must never be the thing that throws while we are trying to read an error.
 */
function describe(detail: unknown): string | undefined {
  if (detail === undefined) return undefined;
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`;
  try {
    // Redact centrally, so no individual call site can forget. GET /me returns
    // the listener's email address, and this log exists to be pasted into a
    // bug report.
    return JSON.stringify(redactObject(detail));
  } catch {
    return String(detail);
  }
}

export function logDebug(kind: DebugKind, message: string, detail?: unknown): void {
  const described = describe(detail);
  const entry: DebugEntry =
    described === undefined
      ? { at: Date.now(), kind, message }
      : { at: Date.now(), kind, message, detail: described };

  entries = [...entries, entry].slice(-MAX_ENTRIES);
  for (const listener of listeners) listener();

  if (import.meta.env.DEV) {
    console.info(`[mm:${kind}] ${message}`, detail ?? '');
  }
}

export function debugSnapshot(): readonly DebugEntry[] {
  return entries;
}

export function subscribeDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDebug(): void {
  entries = [];
  for (const listener of listeners) listener();
}

/**
 * The panel shows when `?debug=1` is in the URL, or always in dev. The flag is
 * mirrored into sessionStorage because the OAuth round trip strips the query
 * string, and losing the panel mid-login is exactly when we need it most.
 */
export function debugEnabled(search: string = window.location.search): boolean {
  if (import.meta.env.DEV) return true;

  if (new URLSearchParams(search).get('debug') === '1') {
    try {
      sessionStorage.setItem(DEBUG_FLAG_KEY, '1');
    } catch {
      // Private mode. The panel still works for this page view.
    }
    return true;
  }

  try {
    return sessionStorage.getItem(DEBUG_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Plain text of the whole log, for pasting into a report. */
export function formatDebugLog(log: readonly DebugEntry[] = entries): string {
  const header = [
    `Mixtape Mode debug log`,
    `url: ${window.location.href}`,
    `userAgent: ${navigator.userAgent}`,
    `entries: ${log.length}`,
    '',
  ].join('\n');

  const body = log
    .map((entry) => {
      const stamp = new Date(entry.at).toISOString();
      const detail = entry.detail === undefined ? '' : ` | ${entry.detail}`;
      return `${stamp} [${entry.kind}] ${entry.message}${detail}`;
    })
    .join('\n');

  return `${header}${body}\n`;
}
