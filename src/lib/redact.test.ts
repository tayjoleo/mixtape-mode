import { describe, expect, it } from 'vitest';
import { redactObject, redactPageUrl, REDACTED } from './redact';

describe('redactPageUrl', () => {
  it('redacts code and state on an OAuth callback', () => {
    expect(redactPageUrl('http://127.0.0.1:5173/?code=AQD_secret_value&state=abc123xyz')).toBe(
      `http://127.0.0.1:5173/?code=${REDACTED}&state=${REDACTED}`,
    );
  });

  it('keeps the hash, which is the tape we have to return to', () => {
    expect(redactPageUrl('http://127.0.0.1:5173/?code=AQD_secret&state=abc#/make')).toBe(
      `http://127.0.0.1:5173/?code=${REDACTED}&state=${REDACTED}#/make`,
    );
  });

  it('redacts state on the denial callback, which has error but no code', () => {
    expect(redactPageUrl('http://127.0.0.1:5173/?error=access_denied&state=abc')).toBe(
      `http://127.0.0.1:5173/?error=access_denied&state=${REDACTED}`,
    );
  });

  it('leaves an API path with its own state parameter alone', () => {
    const path = '/me/player/shuffle?state=false&device_id=abc';
    expect(redactPageUrl(path)).toBe(path);
  });

  it('leaves the repeat endpoint alone', () => {
    expect(redactPageUrl('/me/player/repeat?state=off')).toBe('/me/player/repeat?state=off');
  });

  it('leaves a clean URL untouched', () => {
    const url = 'https://tayjoleo.github.io/mixtape-mode/?debug=1#/t/abc';
    expect(redactPageUrl(url)).toBe(url);
  });

  it('keeps other parameters readable', () => {
    expect(redactPageUrl('http://127.0.0.1:5173/?debug=1&code=AQD_secret&state=abc')).toBe(
      `http://127.0.0.1:5173/?debug=1&code=${REDACTED}&state=${REDACTED}`,
    );
  });

  it('handles a relative URL with a hash', () => {
    expect(redactPageUrl('/mixtape-mode/?code=AQD_secret#/make')).toBe(
      `/mixtape-mode/?code=${REDACTED}#/make`,
    );
  });

  it('returns unparseable input unchanged', () => {
    expect(redactPageUrl('not a url at all')).toBe('not a url at all');
    expect(redactPageUrl('')).toBe('');
  });

  it('never leaves the original secret in the output', () => {
    const out = redactPageUrl('http://127.0.0.1:5173/?code=SUPER_SECRET&state=ALSO_SECRET#/make');
    expect(out).not.toContain('SUPER_SECRET');
    expect(out).not.toContain('ALSO_SECRET');
  });
});

describe('redactObject', () => {
  it('redacts the email and account id out of a GET /me body', () => {
    const me = {
      account_id: 'm5UY8KX0Ju',
      country: 'CA',
      display_name: 'jorgegarbajosa',
      email: 'someone@example.com',
      id: 'jorgegarbajosa',
      product: 'premium',
    };

    expect(redactObject(me)).toEqual({
      account_id: REDACTED,
      country: 'CA',
      display_name: 'jorgegarbajosa',
      email: REDACTED,
      id: 'jorgegarbajosa',
      product: 'premium',
    });
  });

  it('never leaves the email in the serialised log line', () => {
    const line = JSON.stringify(redactObject({ email: 'taylor@example.com' }));
    expect(line).not.toContain('taylor@example.com');
    expect(line).toContain(REDACTED);
  });

  it('redacts tokens wherever they are nested', () => {
    expect(
      redactObject({ outer: { inner: { access_token: 'AQ1', refresh_token: 'AQ2' } } }),
    ).toEqual({ outer: { inner: { access_token: REDACTED, refresh_token: REDACTED } } });
  });

  it('redacts inside arrays', () => {
    expect(redactObject([{ email: 'a@b.c' }, { email: 'd@e.f' }])).toEqual([
      { email: REDACTED },
      { email: REDACTED },
    ]);
  });

  it('keeps everything a log is actually for', () => {
    const detail = { paused: false, position: 1024, device_id: 'abc123', expiresIn: 3600 };
    expect(redactObject(detail)).toEqual(detail);
  });

  it('matches the key whatever its case', () => {
    expect(redactObject({ Email: 'a@b.c', ACCESS_TOKEN: 'x' })).toEqual({
      Email: REDACTED,
      ACCESS_TOKEN: REDACTED,
    });
  });

  it('passes primitives straight through', () => {
    expect(redactObject('plain')).toBe('plain');
    expect(redactObject(42)).toBe(42);
    expect(redactObject(null)).toBeNull();
    expect(redactObject(undefined)).toBeUndefined();
  });

  it('survives a cycle instead of hanging', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;
    expect(redactObject(cyclic)).toEqual({ name: 'loop', self: '[circular]' });
  });

  it('does not mistake a repeated sibling for a cycle', () => {
    const shared = { value: 1 };
    expect(redactObject({ a: shared, b: shared })).toEqual({ a: { value: 1 }, b: { value: 1 } });
  });
});
