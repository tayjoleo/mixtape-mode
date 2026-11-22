import './App.css';
import { currentRedirectUri, RedirectUriError } from './lib/urls';

function redirectUriStatus(): { uri: string; ok: boolean; note: string } {
  try {
    const uri = currentRedirectUri();
    return { uri, ok: true, note: 'Registered in the Spotify dashboard.' };
  } catch (error) {
    if (error instanceof RedirectUriError) {
      return {
        uri: window.location.origin + import.meta.env.BASE_URL,
        ok: false,
        note: error.message,
      };
    }
    throw error;
  }
}

export default function App() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirect = redirectUriStatus();

  return (
    <>
      <header className="mm-header">
        <div className="mm-wordmark">
          <span className="mm-wordmark__name">MIXTAPE MODE</span>
          <span className="mm-wordmark__beta">beta</span>
        </div>
        <nav className="mm-nav" aria-label="Main">
          <a href="#/" aria-current="page">
            My tapes
          </a>
          <a href="#/make">Make a tape</a>
        </nav>
      </header>

      <main className="mm-main">
        <h1>Milestone 0</h1>
        <p className="mm-lede">
          The scaffold is up: Vite, React, TypeScript, ESLint, Prettier, Vitest and the GitHub Pages
          deploy. Nothing talks to Spotify yet. Check the numbers below against the Spotify
          developer dashboard before we start Milestone 1.
        </p>

        <section className="mm-card" aria-labelledby="mm-setup">
          <h2 id="mm-setup">What this build thinks it is</h2>
          <dl className="mm-facts">
            <dt>Origin</dt>
            <dd>
              <code>{window.location.origin}</code>
            </dd>

            <dt>Vite base</dt>
            <dd>
              <code>{import.meta.env.BASE_URL}</code>
            </dd>

            <dt>Redirect URI</dt>
            <dd>
              <code>{redirect.uri}</code>{' '}
              <span className={redirect.ok ? 'mm-flag mm-flag--ok' : 'mm-flag mm-flag--bad'}>
                {redirect.ok ? 'registered' : 'not registered'}
              </span>
              <br />
              {redirect.note}
            </dd>

            <dt>Client ID</dt>
            <dd>
              {clientId ? (
                <>
                  <code>{clientId}</code> <span className="mm-flag mm-flag--ok">loaded</span>
                </>
              ) : (
                <>
                  <span className="mm-flag mm-flag--missing">not set</span> Add{' '}
                  <code>VITE_SPOTIFY_CLIENT_ID</code> to <code>.env.local</code> for dev, and to the
                  repository variables for the Pages build.
                </>
              )}
            </dd>

            <dt>Mode</dt>
            <dd>
              <code>{import.meta.env.MODE}</code>
            </dd>
          </dl>
        </section>

        <section className="mm-card" aria-labelledby="mm-next">
          <h2 id="mm-next">Next up</h2>
          <ol className="mm-milestones">
            <li>
              <strong>M1 go / no-go.</strong> PKCE login, the <code>/me</code> check, a Web Playback
              SDK device reaching <code>ready</code>, and one hardcoded track playing on both URLs.
            </li>
            <li>
              <strong>M2</strong> tape format, <strong>M3</strong> player, <strong>M4</strong>{' '}
              maker, <strong>M5</strong> shelf and polish, <strong>M6</strong> friends test.
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
