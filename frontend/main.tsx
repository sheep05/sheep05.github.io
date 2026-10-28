import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "../app/components/Portfolio";
import { defaults, type Collection } from "../lib/types";
import "../app/globals.css";

const backend = (import.meta.env.VITE_STUDIO_BACKEND_URL || "").replace(/\/$/, "");
const demo: Collection = {
  settings: defaults, albums: [], photos: [], isOwner: false, signedIn: false,
};

function Gallery() {
  const [data, setData] = useState<Collection | null>(backend ? null : demo);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!backend) return;
    const abort = new AbortController();
    fetch(`${backend}/api/public`, { credentials: "omit", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Gallery unavailable");
        const result: Collection = await response.json();
        if (!result.settings || !Array.isArray(result.albums) || !Array.isArray(result.photos)) {
          throw new Error("Invalid gallery response");
        }
        setData({
          ...result,
          isOwner: false,
          signedIn: false,
          photos: result.photos.map((photo) => ({
            ...photo,
            url: new URL(photo.url, `${backend}/`).href,
            thumb: new URL(photo.thumb, `${backend}/`).href,
          })),
        });
      })
      .catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, []);
  if (!data) return <main style={{ padding: "15vh 8vw" }}>
    <h1>Quiet Studio</h1>
    <p role="status">{failed ? "The collection is temporarily unavailable. Please try again." : "Opening the collection…"}</p>
    {failed && <button onClick={() => location.reload()}>Try again</button>}
  </main>;
  return <Portfolio initial={data} assetBase={import.meta.env.BASE_URL}
    managementUrl={backend ? `${backend}/studio` : null} />;
}

createRoot(document.getElementById("root")!).render(<Gallery />);
