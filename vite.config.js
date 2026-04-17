import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** Отдельное SPA-приложение (микрофронт): встраивается в хост через iframe + postMessage. */
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    target: 'esnext',
  },
  server: {
    port: 9001,
    strictPort: true,
    host: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 9001,
    cors: true,
  },
});
