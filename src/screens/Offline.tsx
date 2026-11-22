import AppShell from '../components/AppShell';

/** Spec section 6. Shown when the browser says there is no connection. */
export default function Offline() {
  return (
    <AppShell>
      <h1>No connection</h1>
      <div className="mm-card">
        <p className="mm-lede">
          Mixtape Mode needs the internet to talk to Spotify. The tape itself is safe: it lives in
          the link, so nothing is lost.
        </p>
        <p className="mm-note">This page will come back on its own once you are online again.</p>
      </div>
    </AppShell>
  );
}
