import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { Plugin } from "vite";
import type { PhotoRenditions } from "../lib/photo-renditions";

const moduleId = "virtual:published-photo-renditions";
const widths = [480, 800, 1200, 1600];
const quality = 83;
const publicRoot = new URL("../public/", import.meta.url);

export function publishedRenditions(): Plugin {
  let building = false;
  let renditions: PhotoRenditions = {};
  const devAssets = new Map<string, Buffer>();
  return {
    name: "published-photo-renditions",
    configResolved(config) { building = config.command === "build"; },
    async buildStart() {
      const { collection } = JSON.parse(await readFile(new URL("published/collection.json", publicRoot), "utf8"));
      const emitted = new Set<string>();
      renditions = {};
      devAssets.clear();
      for (const photo of collection.photos) {
        const source = photo.url;
        if (!/^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(source)) throw new Error("Invalid public photo source: " + source);
        if (renditions[source]) continue;
        const input = await readFile(new URL(source.slice(1), publicRoot));
        const metadata = await sharp(input).metadata();
        if (!metadata.width) throw new Error("Missing public photo dimensions: " + source);
        const candidates = [...new Set(widths.map(width => Math.min(width, metadata.width!)))];
        renditions[source] = [];
        for (const width of candidates) {
          const {data, info} = await sharp(input).resize({width, withoutEnlargement: true})
            .webp({quality}).toBuffer({resolveWithObject: true});
          const hash = createHash("sha256").update(data).digest("hex").slice(0, 24);
          const fileName = `published/renditions/${hash}-${width}.webp`;
          renditions[source].push({width: info.width, url: "/" + fileName});
          if (!building) devAssets.set("/" + fileName, data);
          else if (!emitted.has(fileName)) {
            emitted.add(fileName);
            this.emitFile({type: "asset", fileName, source: data});
          }
        }
      }
      if (building) this.emitFile({type: "asset", fileName: "published/renditions.json", source: JSON.stringify(renditions)});
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        const base = server.config.base.replace(/\/$/, "");
        const bytes = pathname && (devAssets.get(pathname) ||
          (pathname.startsWith(base + "/") ? devAssets.get(pathname.slice(base.length)) : undefined));
        if (!bytes) return next();
        res.setHeader("Content-Type", "image/webp");
        res.end(bytes);
      });
    },
    resolveId(id) { if (id === moduleId) return "\0" + moduleId; },
    load(id) { if (id === "\0" + moduleId) return "export default " + JSON.stringify(renditions); },
  };
}
