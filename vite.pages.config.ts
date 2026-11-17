// Build settings for the GitHub Pages frontend.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

// Generate from the current public export so newly published photos warm too.
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
      const { collection } = JSON.parse(readFileSync(new URL('published/collection.json', publicRoot), 'utf8'));
      const photos = new Set<string>();
      for (const key of ['url', 'thumb']) for (const photo of collection.photos) {
        const path = photo[key];
        if (typeof path === 'string' && /^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(path)) photos.add(path.slice(1));
      }
      if (collection.settings.showSamples) {
        for (const sample of JSON.parse(readFileSync(new URL('samples/samples.json', publicRoot), 'utf8'))) {
          if (/^\/samples\/[\w-]+\.jpg$/.test(sample.file)) photos.add(sample.file.slice(1));
        }
      }
      this.emitFile({ type:'asset', fileName:'preload-resources.json', source:JSON.stringify({
        photos:[...photos], workshop:filesAt('materials/poly-haven/'),
      }) });
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL("./frontend", import.meta.url)),
  base: process.env.PAGES_BASE_PATH || "/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  plugins: [react(), preloadResources()],
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
