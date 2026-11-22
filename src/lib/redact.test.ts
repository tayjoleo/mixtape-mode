import { describe, expect, it } from 'vitest';
import { redactPageUrl, REDACTED } from './redact';

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
