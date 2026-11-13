"use client";
import { observeScrollReveal } from "@/lib/scroll-reveal";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { Collection, Album, Photo } from "@/lib/types";
import Room from "./Room";
import type { StudyStage } from "@/lib/scene/study-state";
import ChapterIndex from "./ChapterIndex";
import StreetStrip from "./StreetStrip";
import { atRegion, chapters, inChapter, regions } from "@/lib/catalog";
import Atlas from "./Atlas";
import { galleryRoute } from "@/lib/public-entry";
import { sampleCollection } from "@/lib/samples";
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "↗"}</span>;
}
export default function Portfolio({
  initial,
  assetBase = "/",
  managementUrl = "/studio",
  collectionStatus = null,
  onRetry,
  roomExitUrl,
  coverUrl,
  initialRoute,
}: {
  initial: Collection;
  assetBase?: string;
  managementUrl?: string | null;
  collectionStatus?: "loading" | "error" | null;
  onRetry?: () => void;
  roomExitUrl?: string;
  coverUrl?: string;
  initialRoute?: ReturnType<typeof galleryRoute>;
}) {
  const { settings } = initial;
  const collectionHubUrl = coverUrl ? `${coverUrl}#collections` : null;
  const samples = settings.showSamples
    ? sampleCollection
    : { albums: [], photos: [] };
  const albums = [...initial.albums, ...samples.albums],
    photos = [...initial.photos, ...samples.photos].map((photo) => ({
      ...photo,
      url: photo.url.startsWith("/") ? assetBase + photo.url.slice(1) : photo.url,
      thumb: photo.thumb.startsWith("/") ? assetBase + photo.thumb.slice(1) : photo.thumb,
    }));
  const [view, setView] = useState(initialRoute?.view || "studio"),
    [activeId, setActiveId] = useState<string | null>(initialRoute?.album || null),
    [monitorAwake, setMonitorAwake] = useState(false),
    [lightbox, setLightbox] = useState<{
      photos: Photo[];
      index: number;
    } | null>(null);
  const [studyStage, setStudyStage] = useState<StudyStage>("overview");
  const [region, setRegion] = useState<string | null>(initialRoute?.region || null);
  const [albumContext, setAlbumContext] = useState<{ view: string; region: string | null }>({ view: initialRoute?.from || "collection", region: initialRoute?.region || null });
  const country = view === "all" && region ? regions.find(r => r.id === region)?.name || region : null;
  const listedAlbums = country ? albums.filter(a => inChapter(a, "scenes") && atRegion(a, region!)) : view === "portraits" || view === "street" ? albums.filter(a => inChapter(a, view)) : albums;
  const chapter = chapters.find(c => c.id === view);
  const [info, setInfo] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const gallerySurface = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (view === "studio" && gallerySurface.current) {
      gallerySurface.current.style.visibility = "hidden";
      gallerySurface.current.style.transform = "";
    }
  }, [view]);
  const active: Album | undefined = country ? {
    id: `region-${region}`, title: country,
    description: listedAlbums.length===1 ? listedAlbums[0].description : "",
    photoIds: [...new Set(listedAlbums.flatMap(a=>a.photoIds))],
    position: 0, published: true, coverId: null,
  } : albums.find((a) => a.id === activeId);
  const photoRegion = country ? region : view === "album" && active
    ? (albumContext.region && atRegion(active, albumContext.region)
      ? albumContext.region : regions.find(r => atRegion(active, r.id))?.id) || null
    : null;
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search);
      if (!p.has("album") && coverUrl && ["collection", "about"].includes(p.get("view") || "")) {
        location.replace(p.get("view") === "collection" ? `${coverUrl}#collections` : coverUrl);
        return;
      }
      const route = galleryRoute(location.search);
      setView(route.view);
      setActiveId(route.album);
      setRegion(route.region);
      setAlbumContext({ view: route.from, region: route.region });
      setMonitorAwake(false);
      setStudyStage("overview");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [coverUrl]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (lightbox) dialog.current?.showModal();
    else dialog.current?.close();
    if (view === "studio" || lightbox) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [view, !!lightbox]);
  useEffect(() => {
    if (view !== "studio") main.current?.focus({ preventScroll: true });
  }, [view]);
  function navigate(next: string, id?: string, country: string | null = null) {
    if (!id && coverUrl && (next === "collection" || next === "about")) {
      location.assign(next === "collection" ? `${coverUrl}#collections` : coverUrl);
      return;
    }
    const params = new URLSearchParams();
    if (id) {
      params.set("album", id);
      params.set("from", view);
      setAlbumContext({ view, region });
      if (region) params.set("region", region);
    } else {
      if (next !== "studio" || coverUrl) params.set("view", next);
      if (country) params.set("region", country);
    }
    setRegion(country);
    setView(next);
    setActiveId(id || null);
    setMonitorAwake(false);
    setStudyStage("overview");
    history.pushState({}, "", assetBase + (params.size ? `?${params}` : ""));
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function albumPhotos(a: Album) {
    return a.photoIds
      .map((id) => photos.find((p) => p.id === id))
      .filter(Boolean) as Photo[];
  }
  function cover(a: Album) {
    return photos.find((p) => p.id === a.coverId) || albumPhotos(a)[0];
  }
  const open = (list: Photo[], index: number) => {
    setInfo(false);
    setLightbox({ photos: list, index });
  };
  const shift = (amount: number) =>
    setLightbox((old) =>
      old
        ? {
            ...old,
            index: (old.index + amount + old.photos.length) % old.photos.length,
          }
        : null,
    );
  const contact = settings.email ? `mailto:${settings.email}` : null;
  const showGallery = view !== "studio" || monitorAwake;
  const reveal = showGallery ? observeScrollReveal : undefined;
  const collectionNotice = collectionStatus && (
          <div className="collection-status" role="status">
            <p>{collectionStatus === "loading"
              ? "Loading photographs. You can explore the room while they arrive."
              : "The photo service isn’t responding on this connection. You can still explore the room."}</p>
            {collectionStatus === "error" && <button className="text-link" onClick={onRetry}>Retry photographs ↗</button>}
          </div>
  );
  const galleryFooter = coverUrl ? null : (<footer className="site-footer">
        <button ref={reveal} className="brand" onClick={() => navigate("studio")}>
          {settings.name}
        </button>
        {managementUrl && <a ref={reveal} href={managementUrl}>Studio management ↗</a>}
      </footer>);
  const galleryHeader = collectionHubUrl || photoRegion ? (
    <header className="collection-hub-header">
      <a href={photoRegion ? `${assetBase}?view=scenes&region=${photoRegion}` : collectionHubUrl!}
        aria-label={photoRegion ? "Back to Atlas region selection" : undefined}
        onClick={photoRegion ? event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate("scenes", undefined, photoRegion);
        } : undefined}
      >{photoRegion ? "Atlas" : "Collections"} <span aria-hidden="true" data-collection-magnet /></a>
    </header>
  ) : (
          <header className="site-header">
            <button ref={reveal}
              className="brand"
              onClick={() => navigate("studio")}
              aria-label={`${settings.name}, home`}
            >
              <span className="brand-symbol">▣</span>
              <span>{settings.name}</span>
            </button>
            <nav aria-label="Main navigation">
              <button ref={reveal}
                className={
                  ["studio","collection","all","scenes","portraits","street","album"].includes(view) ? "active" : ""
                }
                onClick={() => navigate("collection")}
              >
                The collection
              </button>
              <button ref={reveal}
                className={view === "about" ? "active" : ""}
                onClick={() => navigate("about")}
              >
                About
              </button>
              <button ref={reveal} className="studio-nav" onClick={() => navigate("studio")}>
                <span className="status-dot" />
                The studio
              </button>
            </nav>
          </header>
  );
  return (
    <div className={`portfolio view-${view}${["scenes", "portraits", "street", "all", "album"].includes(view) ? " photography-pages" : ""}`}>
      {view !== "studio" && view !== "collection" && <><a className="skip-link" href="#main">Skip to content</a>{galleryHeader}</>}
      <main id="main" ref={main} tabIndex={-1}>
        {(view === "studio" || view === "collection") && <div
          ref={gallerySurface}
          className={`gallery-surface view-collection ${showGallery ? "monitor-awake" : "monitor-idle"} ${view === "studio" ? "gallery-in-monitor" : "gallery-live"}`}
          inert={view === "studio"}
          aria-hidden={view === "studio" ? true : undefined}
        >
          {view === "studio" && <div className="monitor-standby" aria-hidden="true" />}
          {galleryHeader}
          <ChapterIndex live={showGallery} albums={albums} photos={photos} assetBase={assetBase} onChapter={id=>navigate(id)} onAll={()=>navigate("all")} />
          {galleryFooter}
        </div>}
        {view === "studio" && (
          <section
            className={`entrance programmer-entrance ${studyStage !== "overview" ? "is-entering" : ""}`}
            aria-label="Enter the photography studio"
          >
            <a className="room-return" href={roomExitUrl || `${assetBase}?view=about`}>Back to About</a>
            <div className="entrance-brand brand">
              <span className="brand-symbol" aria-hidden="true">▣</span>
              <span>{settings.name}</span>
            </div>
            <div className="entrance-copy">
              <h1>
                {settings.tagline === "A space for seeing slowly." ? (
                  <>
                    A space for
                    <br />
                    seeing <em>slowly.</em>
                  </>
                ) : (
                  settings.tagline
                )}
              </h1>
            </div>
            <div className="scene-wrap">
              <Room
                gallerySurface={gallerySurface}
                featured={albums
                  .map((a) => ({
                    url: cover(a)?.thumb || "",
                    title: a.title,
                  }))
                  .filter((p) => p.url)}
                onStage={(stage) => {
                  setStudyStage(stage);
                  if (stage === "overview") setMonitorAwake(false);
                }}
                onWake={() => setMonitorAwake(true)}
              />
            </div>
          </section>
        )}
        {view === "scenes" && <Atlas albums={albums} photos={photos} assetBase={assetBase} selected={region} onSelect={id=>navigate("scenes", undefined, id)} onExplore={id=>navigate("all",undefined,id)} />}
        {!country && ["all", "portraits", "street"].includes(view) && (
          <section className="collection-page">
            {collectionNotice}
            <div ref={observeScrollReveal} className="collection-heading">
              <h1>
                {chapter ? chapter.title : "Collected"}
                {!chapter && <><br /><em>moments.</em></>}
                <sup>{String(listedAlbums.length).padStart(2, "0")}</sup>
              </h1>
            </div>
            {view === "street" ? listedAlbums.map(album => (
              <StreetStrip key={album.id} album={album} photos={albumPhotos(album)} onOpen={() => navigate("album", album.id)} />
            )) : <div className="collection-list">
              {listedAlbums.map((a, i) => (
                <button
                  ref={observeScrollReveal}
                  className="collection-row"
                  key={a.id}
                  onClick={() => navigate("album", a.id)}
                >
                  <div className="row-label">
                    <span className="eyebrow">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(a.photoIds.length).padStart(2, "0")} PHOTOGRAPHS
                    </span>
                    <h2>{a.title}</h2>
                    <p>{a.description}</p>
                    {a.sample && (
                      <span className="sample-label">SAMPLE COLLECTION</span>
                    )}
                    <span className="row-arrow">↗</span>
                  </div>
                  <div className="row-image">
                    {cover(a) ? (
                      <img
                        src={cover(a)!.url}
                        alt={cover(a)!.alt || cover(a)!.title}
                        loading="lazy"
                      />
                    ) : (
                      <span>No photographs yet</span>
                    )}
                  </div>
                </button>
              ))}
            </div>}
            {listedAlbums.length === 0 && !collectionStatus && <Empty owner={initial.isOwner} managementUrl={managementUrl} />}
          </section>
        )}
        {(view === "album" || country) &&
          (active ? (
            <section className="album-page">
              {!photoRegion && <button
                ref={observeScrollReveal} className="text-link back-link"
                onClick={() => navigate(country ? "scenes" : albumContext.view, undefined, country ? region : albumContext.region)}
              >
                ← Back to {country || albumContext.view === "scenes" ? "the atlas" : albumContext.view === "collection" ? "the gallery" : albumContext.view === "all" ? (regions.find(r=>r.id===albumContext.region)?.name || "all collections") : albumContext.view}
              </button>}
              <div ref={observeScrollReveal} className="album-heading">
                <div>
                  {!photoRegion && <p className="eyebrow">
                    {active.sample && "SAMPLE COLLECTION / "}
                    {String(active.photoIds.length).padStart(2, "0")} FRAMES
                  </p>}
                  <h1>{active.title}</h1>
                </div>
                <p>{active.description}</p>
              </div>
              {active.sample && (
                <div className="sample-notice">
                  An illustrative collection of credited photographs. Replace
                  these with your own work in Studio management.
                </div>
              )}
              <div className="photo-sequence">
                {albumPhotos(active).map((p, i) => (
                  <figure
                    ref={observeScrollReveal}
                    className={`photo-frame frame-${i % 4} ${p.height > p.width ? "portrait" : ""}`}
                    key={p.id}
                  >
                    <button
                      onClick={() => open(albumPhotos(active), i)}
                      aria-label={`View ${p.title} full screen`}
                    >
                      <img
                        src={p.url}
                        alt={p.alt || p.title}
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                      <span className="expand-mark">↗</span>
                    </button>
                    <figcaption>
                      <span>
                        {String(i + 1).padStart(2, "0")} — {p.title}
                      </span>
                      <span>{p.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              {active.photoIds.length === 0 && (
                <p className="empty">
                  This collection is waiting for its first photograph.
                </p>
              )}
              <div ref={observeScrollReveal} className="album-end">
                <button onClick={() => navigate("collection")}>
                  Keep looking ↗
                </button>
              </div>
            </section>
          ) : (
            <section className="empty">
              {collectionNotice}
              <h1>{collectionStatus === "loading" ? "Loading this collection…" : "Collection unavailable"}</h1>
              <button
                className="text-link"
                onClick={() => navigate("collection")}
              >
                Return to the collection ↗
              </button>
            </section>
          ))}
        {view === "about" && (
          <section className="about-page">
            <h1 ref={observeScrollReveal}>
              To notice.
              <br />
              To remember.
              <br />
              <em>To look again.</em>
            </h1>
            <div ref={observeScrollReveal} className="about-body">
              <span className="brand-symbol large-symbol">▣</span>
              <div>
                <h2>{settings.name}</h2>
                <p className="bio">{settings.bio}</p>
                {contact && (
                  <a className="text-link" href={contact}>
                    Get in touch <Arrow />
                  </a>
                )}
                <button
                  className="text-link"
                  onClick={() => navigate("collection")}
                >
                  Browse the collection <Arrow />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      {view !== "studio" && view !== "collection" && galleryFooter}
      <dialog
        className="lightbox"
        ref={dialog}
        aria-label="Photograph viewer"
        onCancel={() => setLightbox(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") shift(1);
          if (e.key === "ArrowLeft") shift(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLightbox(null);
        }}
      >
        {lightbox && (
          <>
            <div className="lightbox-top">
              <span>
                {String(lightbox.index + 1).padStart(2, "0")} /{" "}
                {String(lightbox.photos.length).padStart(2, "0")}
              </span>
              <button
                onClick={() => setLightbox(null)}
                aria-label="Close photograph"
              >
                Close ×
              </button>
            </div>
            <div className="lightbox-stage">
              <button
                className="lightbox-prev"
                onClick={() => shift(-1)}
                aria-label="Previous photograph"
              >
                ←
              </button>
              <img
                src={lightbox.photos[lightbox.index].url}
                alt={
                  lightbox.photos[lightbox.index].alt ||
                  lightbox.photos[lightbox.index].title
                }
              />
              <button
                className="lightbox-next"
                onClick={() => shift(1)}
                aria-label="Next photograph"
              >
                →
              </button>
            </div>
            <div className="lightbox-bottom">
              <span>{lightbox.photos[lightbox.index].title}</span>
              <button onClick={() => setInfo(!info)} aria-expanded={info}>
                Details {info ? "−" : "+"}
              </button>
            </div>
            {info && (
              <div className="photo-details">
                <p>
                  {lightbox.photos[lightbox.index].caption ||
                    "No caption for this photograph."}
                </p>
                {lightbox.photos[lightbox.index].source && (
                  <a
                    href={lightbox.photos[lightbox.index].source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sample photograph by{" "}
                    {lightbox.photos[lightbox.index].credit} ↗
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
function Empty({ owner, managementUrl }: {
  owner: boolean;
  managementUrl: string | null;
}) {
  return (
    <div className="empty">
      <h2>A collection is taking shape.</h2>
      {owner && managementUrl && (
        <a className="text-link" href={managementUrl}>
          Add your first photographs ↗
        </a>
      )}
    </div>
  );
}
