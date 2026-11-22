import { useEffect } from 'react';
import AppShell from './components/AppShell';
import DebugPanel from './components/DebugPanel';
import { useAuth } from './hooks/useAuth';
import { debugEnabled, logDebug } from './lib/debug';
import { redactPageUrl } from './lib/redact';
import GoNoGo from './screens/GoNoGo';
import NotOnGuestList from './screens/NotOnGuestList';
import './styles/ui.css';

/**
 * Milestone 1 only: the go / no-go harness. Routing, the player, the maker and
 * the shelf arrive in later milestones.
 */
export default function App() {
  const auth = useAuth();
  const showDebug = debugEnabled();

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
    if (!import.meta.env.VITE_SPOTIFY_CLIENT_ID) {
      return (
        <AppShell>
          <h1>No Client ID</h1>
          <div className="mm-card">
            <p className="mm-lede">
              This build has no <code>VITE_SPOTIFY_CLIENT_ID</code>, so it cannot talk to Spotify.
            </p>
            <p className="mm-note">
              For dev, copy <code>.env.example</code> to <code>.env.local</code> and paste the
              Client ID from the Spotify dashboard, then restart the dev server. For the Pages
              build, set a repository variable of the same name.
            </p>
          </div>
        </AppShell>
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

      case 'logged-in':
        return <GoNoGo me={auth.me} onLogout={auth.logout} />;

      case 'logged-out':
        return <LoggedOut error={auth.error} onLogin={auth.login} />;
    }
  }
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
