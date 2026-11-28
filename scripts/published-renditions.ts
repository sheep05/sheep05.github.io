import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp, { type Sharp } from "sharp";
import type { Plugin } from "vite";
import favorites from "../config/cover-favorites.json";
import type { CoverSlide } from "../lib/cover-assets";
import type { Photo } from "../lib/types";
import type { PhotoRenditions } from "../lib/photo-renditions";

const moduleId = "virtual:published-photo-renditions";
const coverModuleId = "virtual:cover-slides";
const widths = [480, 800, 1200, 1600];
const quality = 83;
const publicRoot = new URL("../public/", import.meta.url);

export function publishedRenditions(): Plugin {
  let building = false;
  let renditions: PhotoRenditions = {};
  let slides: CoverSlide[] = [];
  const devAssets = new Map<string, Buffer>();
  return {
    name: "published-photo-renditions",
    configResolved(config) { building = config.command === "build"; },
    async buildStart() {
      const { collection } = JSON.parse(await readFile(new URL("published/collection.json", publicRoot), "utf8"));
      const emitted = new Set<string>();
      renditions = {};
      devAssets.clear();
      const covers = new Map<string, CoverSlide>();
      const emitWebp = async (pipeline: Sharp) => {
        const {data, info} = await pipeline.webp({quality}).toBuffer({resolveWithObject: true});
        const hash = createHash("sha256").update(data).digest("hex").slice(0, 24);
        const fileName = `published/renditions/${hash}-${info.width}.webp`;
        if (!building) devAssets.set("/" + fileName, data);
        else if (!emitted.has(fileName)) {
          emitted.add(fileName);
          this.emitFile({type: "asset", fileName, source: data});
        }
        return {width: info.width, url: "/" + fileName};
      };
      for (const photo of collection.photos as Photo[]) {
        const source = photo.url;
        if (!/^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(source)) throw new Error("Invalid public photo source: " + source);
        const favorite = favorites.find(entry => entry.id === photo.id);
        if (renditions[source] && !favorite) continue;
        const input = await readFile(new URL(source.slice(1), publicRoot));
        const {width, height} = await sharp(input).metadata();
        if (!width || !height) throw new Error("Missing public photo dimensions: " + source);
        if (!renditions[source]) {
          const candidates = [...new Set(widths.map(w => Math.min(w, width)))];
          renditions[source] = [];
          for (const w of candidates) renditions[source].push(await emitWebp(sharp(input).resize(w)));
        }
        if (!favorite) continue;
        const wide = [...renditions[source]];
        if (width > wide[wide.length - 1].width) {
          wide.push(await emitWebp(sharp(input).resize(Math.min(width, 2560))));
        }
        // Cut the phone frame from the original so a tall screen downloads only visible pixels.
        const cropWidth = Math.min(width, Math.round(height * 9 / 16));
        const cropHeight = Math.min(height, Math.round(width * 16 / 9));
        const crop = {width:cropWidth, height:cropHeight, left:Math.round((width-cropWidth)*favorite.focusX/100), top:Math.round((height-cropHeight)/2)};
        const tall = [];
        for (const w of new Set([Math.min(540,cropWidth), Math.min(960,cropWidth)])) {
          tall.push(await emitWebp(sharp(input).extract(crop).resize(w)));
        }
        covers.set(photo.id, {title:photo.title, alt:photo.alt || favorite.alt, wide, tall});
      }
      slides = favorites.flatMap(({id}) => covers.get(id) ?? []);
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
    resolveId(id) { if (id === moduleId || id === coverModuleId) return "\0" + id; },
    load(id) {
      if (id === "\0" + coverModuleId) return "export default " + JSON.stringify(slides);
      if (id === "\0" + moduleId) return "export default " + JSON.stringify(renditions); },
  };
}
