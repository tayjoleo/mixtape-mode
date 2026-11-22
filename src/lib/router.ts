/**
 * Hash routing, so the app works on GitHub Pages with no server rewrites.
 *
 *   #/            the shelf
 *   #/make        the maker
 *   #/make/<payload> the maker, prefilled from an existing tape
 *   #/t/<payload> a tape
 */
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'shelf' }
  /** `payload` is set when editing an existing tape. */
  | { name: 'make'; payload?: string }
  | { name: 'tape'; payload: string }
  /** The Milestone 1 harness, kept for diagnosing the SDK and the API. */
  | { name: 'check' }
  | { name: 'unknown'; hash: string };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#/, '');

  if (clean === '' || clean === '/') return { name: 'shelf' };
  if (clean === '/make') return { name: 'make' };
  if (clean === '/check') return { name: 'check' };

  const edit = /^\/make\/(.+)$/.exec(clean);
  if (edit?.[1]) return { name: 'make', payload: edit[1] };

  const tape = /^\/t\/(.+)$/.exec(clean);
  if (tape?.[1]) return { name: 'tape', payload: tape[1] };

  return { name: 'unknown', hash: clean };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function go(hash: string): void {
  window.location.hash = hash;
}
