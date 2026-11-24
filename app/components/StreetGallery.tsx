"use client";

import type { Photo } from "@/lib/types";
import { inlinePhoto } from "@/lib/photo-renditions";

export default function StreetGallery({ photos, onOpen }: {
  photos: Photo[];
  onOpen: (photos: Photo[], index: number) => void;
}) {
  function frame(photo: Photo, index: number) {
    const portrait = photo.height > photo.width;
    const wide = index === 0 || index % 5 === 3;
    const sizes = portrait ? "(max-width: 680px) 80vw, min(38vw, 52vh)"
      : wide ? "(max-width: 680px) 94vw, 76vw" : "(max-width: 680px) 94vw, 55vw";
    return <figure key={photo.id} className={portrait ? "street-vertical" : undefined}>
      <button type="button" onClick={() => onOpen(photos, index)}
        aria-label={`View ${photo.title || photo.alt || "photograph"} full screen`}>
        <img {...inlinePhoto(photo, sizes)} width={photo.width} height={photo.height}
          alt={photo.alt || photo.title} loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : undefined} decoding="async" />
      </button>
      {photo.title && <figcaption>{photo.title}</figcaption>}
    </figure>;
  }
  return <section className="street-editorial" aria-labelledby="street-title">
    <header className="street-opening">
      <h1 id="street-title">Street</h1>
      {photos[0] && frame(photos[0], 0)}
    </header>
    {photos.length ? <div className="street-spreads">
      {photos.slice(1).map((photo, index) => frame(photo, index + 1))}
    </div> : <p>No street photographs yet.</p>}
  </section>;
}
