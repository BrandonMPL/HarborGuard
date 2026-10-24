import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Read the same .env the Express server uses so the proxy target and the
  // server's bound port can never drift apart. Falls back to 8787 (the server's
  // own default) when PORT is unset.
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.PORT || process.env.PORT || '8787';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Forward /api requests to the Express server during development.
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
