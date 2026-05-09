import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const poll = process.env.VITE_POLL === '1';
const port = 9001;

/** Standalone SPA; host can also load src/mf-element.js as Web Component entry. */
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [vue()],
    /* In dev use "/" to keep @vite/client and HMR working inside iframe; use "./" in prod for nginx static hosting. */
    base: isBuild ? './' : '/',
    /* Browser bundle replacement for Node-style globals used by some deps
       (Chart.js, vuelidate, etc.). Without this they throw `process is not defined`
       at runtime when imported as a Web Component. */
    define: {
      'process.env.NODE_ENV': JSON.stringify(isBuild ? 'production' : 'development'),
      'process.env': '{}',
      'global': 'globalThis',
    },
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
