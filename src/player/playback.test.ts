import { describe, expect, it } from 'vitest';
import {
  forwardAction,
  formatTime,
  idFromUri,
  indexOfPlaying,
  isEndOfSide,
  openingSide,
  OTHER_SIDE,
  progressPercent,
  rewindAction,
  sideLabel,
  type PlaybackSnapshot,
} from './playback';

const ID = (seed: string) => seed.repeat(22).slice(0, 22);
const SIDE = [ID('a'), ID('b'), ID('c')];
const uri = (id: string) => `spotify:track:${id}`;

function snapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return { paused: false, position: 1000, duration: 200_000, currentUri: null, ...overrides };
}

describe('idFromUri', () => {
  it('reads a track URI', () => {
    expect(idFromUri(uri(ID('a')))).toBe(ID('a'));
  });

  it('refuses anything else', () => {
    expect(idFromUri('spotify:episode:' + ID('a'))).toBeNull();
    expect(idFromUri('spotify:track:short')).toBeNull();
    expect(idFromUri(ID('a'))).toBeNull();
    expect(idFromUri(null)).toBeNull();
    expect(idFromUri(undefined)).toBeNull();
  });
});

describe('indexOfPlaying', () => {
  it('finds the track on the side', () => {
    expect(indexOfPlaying(uri(SIDE[0] as string), SIDE)).toBe(0);
    expect(indexOfPlaying(uri(SIDE[2] as string), SIDE)).toBe(2);
  });

  it('returns null when something else took the device over', () => {
    expect(indexOfPlaying(uri(ID('z')), SIDE)).toBeNull();
  });

  it('returns null for an empty side', () => {
    expect(indexOfPlaying(uri(SIDE[0] as string), [])).toBeNull();
  });
});

describe('isEndOfSide', () => {
  const last = uri(SIDE[2] as string);

  it('fires on the last track paused at zero', () => {
    expect(isEndOfSide(snapshot({ paused: true, position: 0, currentUri: last }), SIDE, true)).toBe(
      true,
    );
  });

  it('does not fire before playback has ever started', () => {
    // A fresh player also sits paused at position 0, and that is not an ending.
    expect(
      isEndOfSide(snapshot({ paused: true, position: 0, currentUri: last }), SIDE, false),
    ).toBe(false);
  });

  it('does not fire on an ordinary pause part way through', () => {
    expect(
      isEndOfSide(snapshot({ paused: true, position: 45_000, currentUri: last }), SIDE, true),
    ).toBe(false);
  });

  it('does not fire while still playing', () => {
    expect(
      isEndOfSide(snapshot({ paused: false, position: 0, currentUri: last }), SIDE, true),
    ).toBe(false);
  });

  it('does not fire on an earlier track finishing', () => {
    const middle = uri(SIDE[1] as string);
    expect(
      isEndOfSide(snapshot({ paused: true, position: 0, currentUri: middle }), SIDE, true),
    ).toBe(false);
  });

  it('does not fire for a track that is not on this side', () => {
    expect(
      isEndOfSide(snapshot({ paused: true, position: 0, currentUri: uri(ID('z')) }), SIDE, true),
    ).toBe(false);
  });

  it('does not fire for an empty side', () => {
    expect(isEndOfSide(snapshot({ paused: true, position: 0, currentUri: last }), [], true)).toBe(
      false,
    );
  });

  it('fires on a one track side', () => {
    const only = [ID('a')];
    expect(
      isEndOfSide(snapshot({ paused: true, position: 0, currentUri: uri(ID('a')) }), only, true),
    ).toBe(true);
  });
});

describe('rewindAction', () => {
  it('restarts the track when more than three seconds in', () => {
    expect(rewindAction(3001, 2)).toBe('restart');
    expect(rewindAction(60_000, 0)).toBe('restart');
  });

  it('steps back when near the start of a later track', () => {
    expect(rewindAction(0, 2)).toBe('previous');
    expect(rewindAction(3000, 1)).toBe('previous');
  });

  it('does nothing at the very start of the side', () => {
    expect(rewindAction(0, 0)).toBe('nothing');
    expect(rewindAction(2999, 0)).toBe('nothing');
  });

  it('treats exactly three seconds as not yet a restart', () => {
    expect(rewindAction(3000, 2)).toBe('previous');
  });
});

describe('forwardAction', () => {
  it('moves on when there is more side left', () => {
    expect(forwardAction(0, 3)).toBe('next');
    expect(forwardAction(1, 3)).toBe('next');
  });

  it('ends the side on the last track', () => {
    expect(forwardAction(2, 3)).toBe('end-of-side');
    expect(forwardAction(0, 1)).toBe('end-of-side');
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [1000, '0:01'],
    [84_000, '1:24'],
    [221_000, '3:41'],
    [600_000, '10:00'],
    [59_999, '0:59'],
  ])('formats %i as %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });

  it('does not produce nonsense for bad input', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('progressPercent', () => {
  it('reports the fraction played', () => {
    expect(progressPercent(50, 200)).toBe(25);
  });

  it('stays between 0 and 100', () => {
    expect(progressPercent(500, 200)).toBe(100);
    expect(progressPercent(-10, 200)).toBe(0);
  });

  it('returns zero rather than dividing by zero', () => {
    expect(progressPercent(10, 0)).toBe(0);
    expect(progressPercent(10, NaN)).toBe(0);
  });
});

describe('sides', () => {
  it('flips', () => {
    expect(OTHER_SIDE.a).toBe('b');
    expect(OTHER_SIDE.b).toBe('a');
  });

  it('labels', () => {
    expect(sideLabel('a')).toBe('A');
    expect(sideLabel('b')).toBe('B');
  });

  it('opens on A, or on B if A is somehow empty', () => {
    expect(openingSide({ a: [ID('a')], b: [] })).toBe('a');
    expect(openingSide({ a: [], b: [ID('b')] })).toBe('b');
  });
});
