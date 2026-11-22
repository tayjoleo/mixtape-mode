import { describe, expect, it, vi } from 'vitest';
import { once } from './once';

describe('once', () => {
  it('runs the underlying function a single time for sequential calls', async () => {
    const inner = vi.fn(async () => 'value');
    const wrapped = once(inner);

    await expect(wrapped()).resolves.toBe('value');
    await expect(wrapped()).resolves.toBe('value');
    await expect(wrapped()).resolves.toBe('value');

    expect(inner).toHaveBeenCalledTimes(1);
  });

  /** This is the StrictMode case: two calls before the first await settles. */
  it('runs the underlying function a single time for overlapping calls', async () => {
    let release: (value: string) => void = () => {};
    const inner = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const wrapped = once(inner);

    const first = wrapped();
    const second = wrapped();
    release('value');

    await expect(Promise.all([first, second])).resolves.toEqual(['value', 'value']);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('hands back the same promise every time', () => {
    const wrapped = once(async () => 'value');
    expect(wrapped()).toBe(wrapped());
  });

  it('only reads single-use state once', async () => {
    // Stands in for sessionStorage: reading clears the value.
    let stored: string | null = 'the-state';
    const wrapped = once(async () => {
      const value = stored;
      stored = null;
      if (value === null) throw new Error('wrong state value');
      return value;
    });

    await expect(wrapped()).resolves.toBe('the-state');
    await expect(wrapped()).resolves.toBe('the-state');
  });

  it('memoises a rejection rather than retrying a consumed value', async () => {
    const inner = vi.fn(async () => {
      throw new Error('no');
    });
    const wrapped = once(inner);

    await expect(wrapped()).rejects.toThrow('no');
    await expect(wrapped()).rejects.toThrow('no');

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('turns a synchronous throw into a memoised rejection', async () => {
    const inner = vi.fn(() => {
      throw new Error('sync');
    }) as unknown as () => Promise<never>;
    const wrapped = once(inner);

    await expect(wrapped()).rejects.toThrow('sync');
    await expect(wrapped()).rejects.toThrow('sync');

    expect(inner).toHaveBeenCalledTimes(1);
  });
});
