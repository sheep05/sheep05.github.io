import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./pages-preview", import.meta.url)),
  base: process.env.PAGES_BASE_PATH || "/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  plugins: [react()],
  build: { outDir: "../outputs/github-pages", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 5173, watch: { usePolling: true } },
});
