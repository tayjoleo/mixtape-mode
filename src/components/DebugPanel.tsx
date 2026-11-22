import { useState, useSyncExternalStore } from 'react';
import {
  clearDebug,
  debugSnapshot,
  formatDebugLog,
  subscribeDebug,
  type DebugEntry,
} from '../lib/debug';
import './DebugPanel.css';

const KIND_LABEL: Record<DebugEntry['kind'], string> = {
  app: 'app',
  auth: 'auth',
  api: 'api',
  sdk: 'sdk',
  error: 'err',
};

function clockTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return (
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds()) +
    '.' +
    pad(d.getMilliseconds(), 3)
  );
}

/**
 * Spec section 6: every SDK event, API call status and error with timestamps.
 * This is the thing we paste into a report if Milestone 1 goes no-go, so it has
 * a "Copy log" button and shows the browser string.
 */
export default function DebugPanel() {
  const entries = useSyncExternalStore(subscribeDebug, debugSnapshot);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(formatDebugLog(entries));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const errorCount = entries.filter((entry) => entry.kind === 'error').length;

  return (
    <div className="mm-debug">
      <button
        type="button"
        className="mm-debug__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mm-debug-log"
      >
        Debug · {entries.length}
        {errorCount > 0 ? <span className="mm-debug__errors">{errorCount}</span> : null}
      </button>

      {open ? (
        <section className="mm-debug__sheet" id="mm-debug-log" aria-label="Debug log">
          <div className="mm-debug__bar">
            <span className="mm-debug__ua" title={navigator.userAgent}>
              {navigator.userAgent}
            </span>
            <div className="mm-debug__actions">
              <button type="button" onClick={copyLog}>
                {copied ? 'Copied' : 'Copy log'}
              </button>
              <button type="button" onClick={clearDebug}>
                Clear
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="mm-debug__empty">Nothing logged yet.</p>
          ) : (
            <ol className="mm-debug__list">
              {entries
                .slice()
                .reverse()
                .map((entry, index) => (
                  <li
                    key={entries.length - index + ':' + entry.at}
                    className={'mm-debug__row mm-debug__row--' + entry.kind}
                  >
                    <span className="mm-debug__time">{clockTime(entry.at)}</span>
                    <span className="mm-debug__kind">{KIND_LABEL[entry.kind]}</span>
                    <span className="mm-debug__message">
                      {entry.message}
                      {entry.detail ? (
                        <span className="mm-debug__detail">{entry.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
