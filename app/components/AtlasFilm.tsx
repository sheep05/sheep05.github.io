"use client";

import { useEffect, useRef, useState } from "react";

/** The sculpture is delivered as a small film, with no visitor-side 3D rendering. */
export default function AtlasFilm({ assetBase }: { assetBase: string }) {
  const film = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const updatePlayback = useRef(() => {});
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let visible = false;
    let disposed = false;
    const update = () => {
      const allowed = !reduced.matches && !connection?.saveData;
      setMotionAllowed(allowed);
      if (visible && allowed && !document.hidden && !manuallyPaused.current) {
        if (!video.getAttribute('src')) video.src = `${assetBase}atlas/crystal-loop.mp4`;
        video.muted = true;
        void video.play().then(() => { if (disposed) video.pause(); }).catch(() => {});
      } else video.pause();
    };
    updatePlayback.current = update;
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
      updatePlayback.current = () => {};
      video.pause();
    };
  }, [assetBase]);

  return <div className="atlas-film">
    <video ref={film} width="1200" height="800" poster={`${assetBase}atlas/crystal-poster.webp`}
      preload="none" muted loop playsInline aria-hidden="true"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    {motionAllowed && <button className="atlas-film-toggle" aria-label={playing ? 'Pause crystal animation' : 'Play crystal animation'}
      onClick={() => { manuallyPaused.current = playing; updatePlayback.current(); }}>
      {playing ? 'Pause animation' : 'Play animation'}
    </button>}
  </div>;
}
