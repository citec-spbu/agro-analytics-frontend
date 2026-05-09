import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // Browser bundle replacement for Node-style globals used by some deps
  // (Vue runtime, Chart.js, etc.). Без этого Vue throws `process is not defined`
  // во время загрузки analytics-mf.js как Web Component.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",
    global: "globalThis",
  },
  build: {
    target: "esnext",
    emptyOutDir: false,
    lib: {
      entry: "src/mf-element.js",
      formats: ["es"],
      fileName: () => "analytics-mf.js",
    },
  },
});
