"use client";

import { useEffect, useRef, useState } from "react";
import { compactCrystal, crystalFile, warmedCrystal } from "@/lib/crystal-media";

export default function AtlasFilm({ assetBase }: { assetBase: string }) {
  const film = useRef<HTMLVideoElement>(null);
  const [recovery, setRecovery] = useState(false);
  const [posterOnly, setPosterOnly] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const file = crystalFile(compactCrystal() || !!connection?.saveData);
    let visible = true, disposed = false, recovering = false;
    let source: string | undefined, objectUrl: string | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const allowed = () => attempt > 0 || (!reduced.matches && !connection?.saveData);
    const active = () => !disposed && visible && !document.hidden && allowed();
    const stopWatch = () => { clearInterval(timer); timer = undefined; };
    const recover = () => {
      if (!active() || recovering) return;
      recovering = true;
      stopWatch();
      video.pause();
      setRecovery(true);
    };
    const update = () => {
      setPosterOnly(!allowed());
      if (!active()) {
        stopWatch();
        video.pause();
        if (!allowed()) { recovering = false; setRecovery(false); }
        return;
      }
      if (recovering || !source || timer !== undefined) return;
      if (!video.hasAttribute('src')) video.src = source;
      video.muted = true;
      // Some engines resolve play() even when the displayed frame never advances.
      const progress = () => {
        const quality = video.getVideoPlaybackQuality?.();
        return quality && quality.totalVideoFrames > 0
          ? quality.totalVideoFrames - (quality.droppedVideoFrames || 0)
          : video.currentTime;
      };
      let last = progress();
      let lastMovement = performance.now();
      timer = setInterval(() => {
        const now = progress();
        if (now !== last) lastMovement = performance.now();
        else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || performance.now() - lastMovement >= 15000) recover();
        last = now;
      }, 5000);
      if (video.error) { recover(); return; }
      void video.play().catch(error => { if (error.name !== 'AbortError') recover(); });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(video);
    video.addEventListener('error', recover);
    reduced.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    void warmedCrystal(assetBase, file).then(blob => {
      if (disposed) return;
      if (blob) objectUrl = URL.createObjectURL(blob);
      source = objectUrl || assetBase + file;
      update();
    });
    return () => {
      disposed = true;
      stopWatch();
      observer.disconnect();
      reduced.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.removeEventListener('error', recover);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetBase, attempt]);

  return <div className="atlas-film">
    <video ref={film} width="1920" height="1280" poster={assetBase + 'atlas/crystal-poster.webp'}
      preload="none" autoPlay muted loop playsInline controls={false}
      disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-hidden="true" />
    {recovery && !failed && <img className="crystal-recovery" alt="" src={assetBase + 'atlas/crystal-recovery.webp'}
      onError={() => setFailed(true)} />}
    {(failed || posterOnly) && <button className="crystal-retry" onClick={() => {
      setFailed(false); setRecovery(false); setAttempt(value => value + 1);
    }}>Play animation</button>}
  </div>;
}
