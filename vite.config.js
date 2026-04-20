import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const poll = process.env.VITE_POLL === '1';
const port = 9001;

/** Отдельное SPA-приложение (микрофронт): встраивается в хост через iframe + postMessage. */
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [vue()],
    /* В dev «/» — иначе base «./» ломает загрузку @vite/client и HMR во iframe. В prod оставляем «./» для nginx. */
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
