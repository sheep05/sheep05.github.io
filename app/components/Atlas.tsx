"use client";

import { observeScrollReveal } from "@/lib/scroll-reveal";
import AtlasFilm from "./AtlasFilm";

export default function Atlas({ assetBase }: { assetBase: string }) {
  return <section className="atlas-page atlas-page--film">
    <div className="atlas-intro"><h1 ref={observeScrollReveal}>ATLAS</h1></div>
    <AtlasFilm assetBase={assetBase} />
  </section>;
}
