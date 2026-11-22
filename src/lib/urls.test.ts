import { describe, expect, it } from 'vitest';
import { buildRedirectUri, isRegisteredRedirectUri, RedirectUriError } from './urls';

describe('buildRedirectUri', () => {
  it('builds the registered dev URI', () => {
    expect(buildRedirectUri('http://127.0.0.1:5173', '/')).toBe('http://127.0.0.1:5173/');
  });

  it('builds the registered production URI', () => {
    expect(buildRedirectUri('https://tayjoleo.github.io', '/mixtape-mode/')).toBe(
      'https://tayjoleo.github.io/mixtape-mode/',
    );
  });

  it('adds the trailing slash the dashboard expects', () => {
    expect(buildRedirectUri('https://tayjoleo.github.io', '/mixtape-mode')).toBe(
      'https://tayjoleo.github.io/mixtape-mode/',
    );
  });

  it('refuses localhost, which Spotify will not accept', () => {
    expect(() => buildRedirectUri('http://localhost:5173', '/')).toThrow(RedirectUriError);
  });

  it('refuses an origin that is not registered', () => {
    expect(() => buildRedirectUri('https://example.com', '/')).toThrow(RedirectUriError);
  });
});

describe('isRegisteredRedirectUri', () => {
  it('is exact about the trailing slash', () => {
    expect(isRegisteredRedirectUri('http://127.0.0.1:5173/')).toBe(true);
    expect(isRegisteredRedirectUri('http://127.0.0.1:5173')).toBe(false);
  });
});
