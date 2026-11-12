import backend from "../config/backend.json";
import { createRoot } from "react-dom/client";
import Portfolio from "../app/components/Portfolio";
import type { Collection } from "../lib/types";
import snapshot from "../public/published/collection.json";
import "../app/globals.css";

// Bundle the public text and local photo paths. Visitors never query Cloudflare.
createRoot(document.getElementById("root")!).render(
  <Portfolio initial={snapshot.collection as Collection}
    assetBase={import.meta.env.BASE_URL}
    roomExitUrl={import.meta.env.BASE_URL}
    coverUrl={import.meta.env.BASE_URL}
    managementUrl={backend.studioUrl} />,
);
