import AppShell from '../components/AppShell';

/**
 * Spec section 4. Reached when the SDK emits `account_error`, which is the only
 * signal left now that `GET /me` no longer returns `product` in Development
 * Mode. No raw error JSON: that lives in the debug panel.
 */
export default function NotPremium({ onLogout }: { onLogout: () => void }) {
  return (
    <AppShell>
      <h1>This one needs full Premium</h1>
      <div className="mm-card">
        <p className="mm-lede">
          Spotify only lets outside apps stream audio for accounts on full Premium. The mobile-only
          plans, Mini and Lite, cannot do it, and neither can the free tier. That is Spotify&apos;s
          rule, not ours.
        </p>
        <p className="mm-note">
          If you have another Spotify account with full Premium, log out and use that one. Otherwise
          you can still see the tape and its J-card; you just cannot press play here.
        </p>
        <div className="mm-btn-row">
          <button type="button" className="mm-btn mm-btn--sun" onClick={onLogout}>
            Log out
          </button>
          <a className="mm-btn" href="https://www.spotify.com/premium/">
            Look at Premium plans
          </a>
        </div>
      </div>
    </AppShell>
  );
}
