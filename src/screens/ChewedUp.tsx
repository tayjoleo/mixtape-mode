import AppShell from '../components/AppShell';
import type { DecodeFailure } from '../tape/encode';

const COPY: Record<DecodeFailure, { heading: string; body: string }> = {
  unreadable: {
    heading: 'This tape got chewed up',
    body: 'The link is damaged, so there is no tape to play. Links sometimes lose their tail when they get pasted into a chat. Ask whoever sent it to send the whole thing again.',
  },
  version: {
    heading: 'This tape is from a later machine',
    body: 'The link was made by a newer version of Mixtape Mode than this one, so we cannot read it properly. Reload the page to pick up the latest version and try again.',
  },
  empty: {
    heading: 'This tape got chewed up',
    body: 'The link opened, but there were no playable songs on Side A. Ask whoever sent it to make the tape again.',
  },
};

/** Spec section 6: a bad link gets a screen in the same visual language. */
export default function ChewedUp({ reason }: { reason: DecodeFailure }) {
  const { heading, body } = COPY[reason];

  return (
    <AppShell>
      <h1>{heading}</h1>
      <div className="mm-card">
        <p className="mm-lede">{body}</p>
        <div className="mm-btn-row">
          <a className="mm-btn mm-btn--sun" href="#/">
            Go to my tapes
          </a>
          <a className="mm-btn" href="#/make">
            Make a tape instead
          </a>
        </div>
      </div>
    </AppShell>
  );
}
