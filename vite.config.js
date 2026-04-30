import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const poll = process.env.VITE_POLL === '1';
const port = 9001;

/** Standalone SPA micro-frontend embedded into host via iframe + postMessage. */
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [vue()],
    /* In dev use "/" to keep @vite/client and HMR working inside iframe; use "./" in prod for nginx static hosting. */
    base: isBuild ? './' : '/',
    build: {
      target: 'esnext',
    },
    server: {
      port,
      strictPort: true,
      host: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      watch: poll ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: {
      port,
      cors: true,
    },
  };
});
