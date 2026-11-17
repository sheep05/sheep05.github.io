"use client";

import { observeScrollReveal } from "@/lib/scroll-reveal";
import { mixedAtlasPhotos } from "@/lib/atlas-photos";
import type { Album, Photo } from "@/lib/types";
import AtlasFilm from "./AtlasFilm";

export default function Atlas({ assetBase, albums, photos, onOpen }: {
  assetBase: string; albums: Album[]; photos: Photo[];
  onOpen: (photos: Photo[], index: number) => void;
}) {
  const sequence = mixedAtlasPhotos(albums, photos);
  return <section className="atlas-page atlas-page--film">
    <div className="atlas-intro"><h1 ref={observeScrollReveal}>ATLAS</h1></div>
    <AtlasFilm assetBase={assetBase} />
    <div className="atlas-editorial" aria-label="Atlas photographs">
      {Array.from({ length: Math.ceil(sequence.length / 2) }, (_, row) =>
        <div className={`atlas-editorial-row arrangement-${row % 3}`} key={row}>
          {sequence.slice(row * 2, row * 2 + 2).map((photo, column) =>
            <figure key={photo.id}>
              <button onClick={() => onOpen(sequence, row * 2 + column)} aria-label={`View ${photo.alt || photo.title} full screen`}>
                <img src={photo.url} width={photo.width} height={photo.height}
                  alt={photo.alt || photo.title} loading="lazy" decoding="async" />
              </button>
            </figure>)}
        </div>)}
    </div>
  </section>;
}
