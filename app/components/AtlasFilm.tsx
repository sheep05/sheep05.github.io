"use client";

import { useEffect, useRef } from "react";

/** The sculpture is delivered as a small film, with no visitor-side 3D rendering. */
export default function AtlasFilm({ assetBase }: { assetBase: string }) {
  const film = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let visible = false;
    let disposed = false;
    const update = () => {
      const allowed = !reduced.matches && !connection?.saveData;
      if (visible && allowed && !document.hidden) {
        if (!video.getAttribute('src')) video.src = `${assetBase}atlas/crystal-loop.mp4`;
        video.muted = true;
        void video.play().then(() => { if (disposed) video.pause(); }).catch(() => {});
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: .1 });
    observer.observe(video);
    reduced.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      disposed = true;
      observer.disconnect();
      reduced.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.pause();
    };
  }, [assetBase]);

  return <div className="atlas-film">
    <video ref={film} width="1920" height="1280" poster={`${assetBase}atlas/crystal-poster.webp`}
      preload="none" autoPlay muted loop playsInline controls={false}
      disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-hidden="true" />
  </div>;
}
