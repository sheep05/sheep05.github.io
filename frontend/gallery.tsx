import backend from "../config/backend.json";
import { createRoot } from "react-dom/client";
import SiteCursor from "../app/components/SiteCursor";
import Portfolio from "../app/components/Portfolio";
import renditions from "virtual:published-photo-renditions";
import type { Collection } from "../lib/types";
import snapshot from "../public/published/collection.json";
import "../app/globals.css";
import { galleryRoute } from "../lib/public-entry";

const published = snapshot.collection as Collection;
const collection: Collection = { ...published, photos: published.photos.map(photo => ({
  ...photo, renditions: renditions[photo.url],
})) };

// Bundle the public text and local photo paths. Visitors never query Cloudflare.
createRoot(document.getElementById("root")!).render(
  <><SiteCursor/><Portfolio initial={collection}
    initialRoute={galleryRoute(location.search)}
    assetBase={import.meta.env.BASE_URL}
    roomExitUrl={import.meta.env.BASE_URL}
    coverUrl={import.meta.env.BASE_URL}
    managementUrl={backend.studioUrl} /></>,
);
