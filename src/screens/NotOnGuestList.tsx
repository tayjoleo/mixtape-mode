import AppShell from '../components/AppShell';

/**
 * Spec section 4. A 403 from `/me` means this Spotify account has not been
 * added in the dashboard's User Management list. Development Mode allows five
 * accounts in total, the owner included.
 *
 * The spec asks us to include the email from the error context when it is
 * available. It is not: the February 2026 Development Mode changes removed
 * `email` from `GET /me`, and a 403 carries no account details either. So the
 * screen asks the person to supply it instead of guessing.
 */
export default function NotOnGuestList({ onLogout }: { onLogout: () => void }) {
  return (
    <AppShell>
      <h1>You&apos;re not on the guest list yet</h1>
      <div className="mm-card">
        <p className="mm-lede">
          Ask Taylor to add the email on your Spotify account. Spotify caps this app at five people
          while it is in Development Mode, so every listener has to be added by hand.
        </p>
        <p className="mm-note">
          It needs to be the email your Spotify account itself uses, which is not always the one you
          would expect. You can check it at{' '}
          <a href="https://www.spotify.com/account/overview/">spotify.com/account</a>.
        </p>
        <div className="mm-btn-row">
          <button type="button" className="mm-btn mm-btn--sun" onClick={onLogout}>
            Log out and try another account
          </button>
        </div>
      </div>
    </AppShell>
  );
}
