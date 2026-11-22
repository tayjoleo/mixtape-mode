/**
 * Wraps an async function so it runs at most once per page load, however many
 * times it is called. Later callers get the first call's promise.
 *
 * This exists because React StrictMode mounts effects twice in development.
 * Anything that consumes a single-use value - an OAuth authorization code, the
 * PKCE verifier, a `sessionStorage` key that is read and then cleared - has to
 * be immune to that second run, or the second run finds the cupboard bare and
 * reports a failure that never really happened.
 *
 * A rejection is memoised too. A consumed authorization code does not become
 * valid on a retry, so repeating the call would only produce a second, more
 * confusing error. Recovery is a fresh login, which is a fresh page load.
 */
export function once<T>(fn: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;

  return () => {
    promise ??= (async () => fn())();
    return promise;
  };
}
