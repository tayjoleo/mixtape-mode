import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Spotify will not accept `localhost` as a redirect URI, only loopback IP
// literals, so dev is pinned to http://127.0.0.1:5173/ and must match the
// redirect URI registered in the Spotify dashboard exactly.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mixtape-mode/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
