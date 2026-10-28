import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "../app/components/Portfolio";
import { defaults, type Collection } from "../lib/types";
import { loadCollection } from "./load-collection";
import "../app/globals.css";

const backend = (import.meta.env.VITE_STUDIO_BACKEND_URL || "").replace(/\/$/, "");
const demo: Collection = {
  settings: defaults, albums: [], photos: [], isOwner: false, signedIn: false,
};

function Gallery() {
  const [data, setData] = useState<Collection>(backend
    ? { ...demo, settings: { ...defaults, showSamples: false } } : demo);
  const [status, setStatus] = useState<"loading" | "error" | null>(backend ? "loading" : null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!backend) return;
    const abort = new AbortController();
    loadCollection(backend, abort.signal)
      .then((result) => {
        if (abort.signal.aborted) return;
        setData(result);
        setStatus(null);
      })
      .catch(() => { if (!abort.signal.aborted) setStatus("error"); });
    return () => abort.abort();
  }, [attempt]);
  return <Portfolio initial={data} assetBase={import.meta.env.BASE_URL}
    collectionStatus={status} onRetry={() => {
      setStatus("loading");
      setAttempt((value) => value + 1);
    }}
    managementUrl={backend ? `${backend}/studio` : null} />;
}

createRoot(document.getElementById("root")!).render(<Gallery />);
