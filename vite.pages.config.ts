// Build settings for the GitHub Pages frontend.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

import { publishedRenditions } from "./scripts/published-renditions";

// Preserve desktop workshop warming without requesting any gallery photos.
function preloadResources(): Plugin {
  const publicRoot = new URL('./public/', import.meta.url);
  function filesAt(directory: string): string[] {
    return readdirSync(new URL(directory, publicRoot), { withFileTypes: true }).flatMap(entry => {
      const path = `${directory}${entry.name}`;
      return entry.isDirectory() ? filesAt(`${path}/`) : /\.(jpg|webp|png|hdr)$/.test(path) ? [path] : [];
    }).sort();
  }
  return {
    name: 'public-preload-resources',
    generateBundle() {
      this.emitFile({ type:'asset', fileName:'preload-resources.json', source:JSON.stringify({
        workshop:filesAt('materials/poly-haven/'),
      }) });
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL("./frontend", import.meta.url)),
  base: process.env.PAGES_BASE_PATH || "/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  plugins: [react(), publishedRenditions(), preloadResources()],
  build: {
    outDir: "../outputs/github-pages", emptyOutDir: true,
    manifest: "preload-manifest.json",
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Keep React and its CommonJS helpers together to avoid a cycle
          // between the lazy gallery entry and shared JSX runtime.
          groups: [{ name: "react-vendor", test: /node_modules\/(react|react-dom|scheduler)\/|\0rolldown\/runtime/ }],
        },
      },
    },
  },
  server: { host: "127.0.0.1", port: 5173, watch: { usePolling: true } },
});
