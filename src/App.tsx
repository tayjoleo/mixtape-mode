import { useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import DebugPanel from './components/DebugPanel';
import { useAuth } from './hooks/useAuth';
import { debugEnabled, logDebug } from './lib/debug';
import { redactPageUrl } from './lib/redact';
import { useRoute } from './lib/router';
import { readTapeFromPayload } from './tape/encode';
import ChewedUp from './screens/ChewedUp';
import GoNoGo from './screens/GoNoGo';
import Maker from './screens/Maker';
import NotOnGuestList from './screens/NotOnGuestList';
import NotPremium from './screens/NotPremium';
import Offline from './screens/Offline';
import Player from './screens/Player';
import './styles/ui.css';

/**
 * Milestone 3: the listener's half of the app is real. The shelf and the maker
 * are still the go / no-go harness and arrive in M4 and M5.
 */
export default function App() {
  const auth = useAuth();
  const route = useRoute();
  const showDebug = debugEnabled();
  const online = useOnline();

  useEffect(() => {
    logDebug('app', 'App mounted', {
      href: redactPageUrl(window.location.href),
      base: import.meta.env.BASE_URL,
      mode: import.meta.env.MODE,
    });
  }, []);

  return (
    <>
      {body()}
      {showDebug ? <DebugPanel /> : null}
    </>
  );

  function body() {
    if (!import.meta.env.VITE_SPOTIFY_CLIENT_ID) return <NoClientId />;

    // A tape is visible to anyone, logged in or not, so it is decoded and shown
    // before any of the auth states are considered. Spec section 6.
    if (route.name === 'tape') {
      const result = readTapeFromPayload(route.payload);
      if (!result.ok) return <ChewedUp reason={result.reason} />;

      return (
        <Player
          tape={result.tape}
          me={auth.status === 'logged-in' ? auth.me : null}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    if (!online) return <Offline />;

    // The maker is reachable logged out: the decoration all works without
    // Spotify, and only the song picker needs an account.
    if (route.name === 'make') {
      return (
        <Maker
          me={auth.status === 'logged-in' ? auth.me : null}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    switch (auth.status) {
      case 'loading':
        return (
          <AppShell>
            <h1>One moment</h1>
            <div className="mm-card">
              <p className="mm-lede">Talking to Spotify...</p>
            </div>
          </AppShell>
        );

      case 'not-on-guest-list':
        return <NotOnGuestList onLogout={auth.logout} />;

      case 'not-premium':
        return <NotPremium onLogout={auth.logout} />;

      case 'logged-in':
        return <GoNoGo me={auth.me} onLogout={auth.logout} />;

      case 'logged-out':
        return <LoggedOut error={auth.error} onLogin={auth.login} />;
    }
  }
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => {
      logDebug('app', 'Went offline');
      setOnline(false);
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

function NoClientId() {
  return (
    <AppShell>
      <h1>No Client ID</h1>
      <div className="mm-card">
        <p className="mm-lede">
          This build has no <code>VITE_SPOTIFY_CLIENT_ID</code>, so it cannot talk to Spotify.
        </p>
        <p className="mm-note">
          For dev, copy <code>.env.example</code> to <code>.env.local</code> and paste the Client ID
          from the Spotify dashboard, then restart the dev server. For the Pages build, set a
          repository variable of the same name.
        </p>
      </div>
    </AppShell>
  );
}

function LoggedOut({ error, onLogin }: { error?: string | undefined; onLogin: () => void }) {
  // Worth saying out loud here rather than at the moment of redirect, since it
  // is the single most likely local setup mistake.
  const redirectProblem =
    window.location.hostname === 'localhost'
      ? 'You opened this on localhost. Spotify will not accept localhost as a redirect URI. Use http://127.0.0.1:5173/ instead.'
      : null;

  return (
    <AppShell>
      <h1>Milestone 1: go / no-go</h1>
      <div className="mm-card">
        <p className="mm-lede">
          Log in with Spotify so we can check the login, the account, the player device and one
          track playing.
        </p>
        {error ? <p className="mm-note">{error}</p> : null}
        {redirectProblem ? <p className="mm-note">{redirectProblem}</p> : null}
        <div className="mm-btn-row">
          <button
            type="button"
            className="mm-btn mm-btn--primary mm-btn--big"
            onClick={onLogin}
            disabled={redirectProblem !== null}
          >
            Log in with Spotify
          </button>
        </div>
        <p className="mm-hint">
          You need to be on the app guest list and have full Spotify Premium. Add{' '}
          <code>?debug=1</code> to the URL to keep the debug panel open in a production build.
        </p>
      </div>
    </AppShell>
  );
}
