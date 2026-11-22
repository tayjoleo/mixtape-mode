import { useCallback, useEffect, useState } from 'react';
import {
  AuthError,
  beginLogin,
  completeLogin,
  hasAuthCallback,
  isLoggedIn,
  logout as clearSession,
} from '../lib/auth';
import { logDebug } from '../lib/debug';
import { getMe, NotOnGuestListError, type Me } from '../lib/spotify';

export type AuthState =
  /** Still handling an OAuth callback or the first `/me` call. */
  | { status: 'loading' }
  | { status: 'logged-out'; error?: string }
  | { status: 'not-on-guest-list' }
  | { status: 'logged-in'; me: Me };

/**
 * One place that owns: the OAuth callback, the `/me` call, and logout.
 *
 * `/me` is the guest-list check. Development Mode returns 403 for an account
 * that has not been added in the dashboard. It is no longer the Premium check:
 * the February 2026 changes removed `product` from the `/me` response, so a
 * non-Premium account only reveals itself through the SDK's `account_error`.
 * See docs/DECISIONS.md.
 */
export function useAuth(): AuthState & {
  login: () => void;
  logout: () => void;
} {
  const [state, setState] = useState<AuthState>(() =>
    hasAuthCallback() || isLoggedIn() ? { status: 'loading' } : { status: 'logged-out' },
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (hasAuthCallback()) {
        try {
          await completeLogin();
        } catch (error) {
          logDebug('error', 'Login did not complete', error);
          if (!cancelled) {
            setState({
              status: 'logged-out',
              error:
                error instanceof AuthError
                  ? error.message
                  : 'Something went wrong logging in. Try again.',
            });
          }
          return;
        }
      }

      // StrictMode's first run is already torn down by now. Bailing here keeps
      // the second run from firing a duplicate GET /me and doubling the log.
      if (cancelled) return;

      if (!isLoggedIn()) {
        if (!cancelled) setState({ status: 'logged-out' });
        return;
      }

      try {
        const me = await getMe();
        if (!cancelled) setState({ status: 'logged-in', me });
      } catch (error) {
        if (error instanceof NotOnGuestListError) {
          if (!cancelled) setState({ status: 'not-on-guest-list' });
          return;
        }
        logDebug('error', 'GET /me failed', error);
        if (!cancelled) {
          setState({
            status: 'logged-out',
            error: 'We could not reach your Spotify account. Try logging in again.',
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    setState({ status: 'loading' });
    beginLogin().catch((error: unknown) => {
      logDebug('error', 'Could not start the login', error);
      setState({
        status: 'logged-out',
        error: error instanceof AuthError ? error.message : 'We could not start the Spotify login.',
      });
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState({ status: 'logged-out' });
  }, []);

  return { ...state, login, logout };
}
