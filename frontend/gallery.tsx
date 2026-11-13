import backend from "../config/backend.json";
import { createRoot } from "react-dom/client";
import SiteCursor from "../app/components/SiteCursor";
import Portfolio from "../app/components/Portfolio";
import type { Collection } from "../lib/types";
import snapshot from "../public/published/collection.json";
import "../app/globals.css";
import { galleryRoute } from "../lib/public-entry";

// Browse local previews; Cloudflare full-size media is requested only in the viewer.
createRoot(document.getElementById("root")!).render(
  <><SiteCursor/><Portfolio initial={snapshot.collection as Collection}
    initialRoute={galleryRoute(location.search)}
    assetBase={import.meta.env.BASE_URL}
    roomExitUrl={import.meta.env.BASE_URL}
    coverUrl={import.meta.env.BASE_URL}
    managementUrl={backend.studioUrl} /></>,
);
