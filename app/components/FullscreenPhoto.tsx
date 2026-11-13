"use client";
import { useEffect, useState } from 'react';
import type { Photo } from '@/lib/types';

// Avoid repeating a slow backend timeout for every photo on this visit.
let useLocalCopies = false;

export default function FullscreenPhoto({photo}: {photo: Photo}) {
  const [src, setSrc] = useState(() => useLocalCopies ? photo.url : photo.fullUrl || photo.url);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  function fallback() {
    if (src !== photo.url) { useLocalCopies = true; setSrc(photo.url); setStatus('loading'); }
    else setStatus('error');
  }
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      if (src !== photo.url) { useLocalCopies = true; setSrc(photo.url); }
      else setStatus('error');
    }, src !== photo.url ? 6000 : 20000);
    return () => clearTimeout(timer);
  }, [src, status, photo.url]);
  return <div className="fullscreen-photo" aria-busy={status === 'loading'}>
    {status !== 'ready' && <div className="fullscreen-photo-status" role="status">
      {status === 'loading' ? 'Loading photograph…' : <>This photograph couldn’t load. <button onClick={() => {setSrc(photo.url);setStatus('loading');}}>Retry</button></>}
    </div>}
    {status !== 'error' && <img key={src} src={src} alt={photo.alt || photo.title}
      referrerPolicy="no-referrer" decoding="async"
      style={{visibility:status === 'ready' ? 'visible' : 'hidden'}}
      onError={fallback}
      onLoad={async event => {
        const image = event.currentTarget;
        try {
          await image.decode();
          if (image.isConnected) setStatus('ready');
        } catch { if (image.isConnected) fallback(); }
      }} />}
  </div>;
}
