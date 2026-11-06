"use client";
import { useEffect, useRef, useState } from "react";
import type { Album, Photo } from "@/lib/types";
import { observeScrollReveal } from "@/lib/scroll-reveal";

export default function StreetStrip({ album, photos, onOpen }: {
  album: Album;
  photos: Photo[];
  onOpen: () => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const moved = useRef(false);
  const [edges, setEdges] = useState({ start: true, end: true });
  const cover = photos.find(photo => photo.id === album.coverId);
  const frames = cover ? [cover, ...photos.filter(photo => photo !== cover)] : photos;

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    function update() {
      if (!element) return;
      const start = element.scrollLeft < 2;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    }
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const frame of element.children) observer.observe(frame);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [photos.length]);

  function step(direction: number) {
    const element = rail.current;
    if (!element) return;
    const positions = Array.from(element.children, frame => (frame as HTMLElement).offsetLeft);
    const next = direction > 0
      ? positions.find(x => x > element.scrollLeft + 3)
      : positions.reverse().find(x => x < element.scrollLeft - 3);
    element.scrollTo({
      left: next ?? (direction > 0 ? element.scrollWidth : 0),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return <section className="street-series" ref={observeScrollReveal} aria-label={album.title}>
    <div className="street-series-heading">
      <h2><button onClick={onOpen}>{album.title} <span aria-hidden="true">↗</span></button></h2>
      {frames.length > 1 && <div className="street-controls">
        <span>Drag to explore</span>
        <button disabled={edges.start} aria-label="Previous photograph" onClick={() => step(-1)}>←</button>
        <button disabled={edges.end} aria-label="Next photograph" onClick={() => step(1)}>→</button>
      </div>}
    </div>
    {frames.length ? <div className="street-strip" ref={rail}
      onPointerDown={event => {
        moved.current = false;
        if (event.pointerType === "mouse" && event.button === 0)
          drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft };
      }}
      onPointerMove={event => {
        if (!drag.current || event.buttons !== 1) return;
        const delta = event.clientX - drag.current.x;
        if (!moved.current && Math.abs(delta) < 6) return;
        if (!moved.current) event.currentTarget.setPointerCapture(event.pointerId);
        moved.current = true;
        event.currentTarget.scrollLeft = drag.current.left - delta;
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { if (!moved.current) drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onClickCapture={event => {
        if (moved.current && event.detail > 0) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {frames.map((photo, index) => <a key={photo.id} draggable={false}
        href={'?album=' + encodeURIComponent(album.id) + '&from=street'}
        aria-label={photo.title + ' — open ' + album.title}
        onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onOpen();
        }}>
        <picture>
          <source media="(max-width: 600px) and (max-resolution: 2dppx)" srcSet={photo.thumb} />
          <img src={photo.url}
            alt={photo.alt || photo.title} width={photo.width || 3} height={photo.height || 2}
            loading={index < 2 ? "eager" : "lazy"} draggable={false} />
        </picture>
      </a>)}
    </div> : <p>No photographs yet.</p>}
  </section>;
}
