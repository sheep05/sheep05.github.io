"use client";
import { useState, useEffect, useRef } from "react";
import type { Collection, Album, Photo } from "@/lib/types";
import Room from "./Room";
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
}: {
  initial: Collection;
  assetBase?: string;
  managementUrl?: string | null;
  collectionStatus?: "loading" | "error" | null;
  onRetry?: () => void;
}) {
  const { settings } = initial;
  const samples = settings.showSamples
    ? sampleCollection
    : { albums: [], photos: [] };
  const albums = [...initial.albums, ...samples.albums],
    photos = [...initial.photos, ...samples.photos].map((photo) => ({
      ...photo,
      url: photo.url.startsWith("/") ? assetBase + photo.url.slice(1) : photo.url,
      thumb: photo.thumb.startsWith("/") ? assetBase + photo.thumb.slice(1) : photo.thumb,
    }));
  const [view, setView] = useState("studio"),
    [activeId, setActiveId] = useState<string | null>(null),
    [entering, setEntering] = useState(false),
    [walkRequested, setWalkRequested] = useState(false),
    [sceneState, setSceneState] = useState<"loading" | "ready" | "fallback">("loading"),
    [lightbox, setLightbox] = useState<{
      photos: Photo[];
      index: number;
    } | null>(null);
  const [info, setInfo] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const skipWalk = useRef<HTMLButtonElement>(null);
  const active = albums.find((a) => a.id === activeId);
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search);
      setView(p.has("album") ? "album" : p.get("view") || "studio");
      setActiveId(p.get("album"));
      setEntering(false);
      setWalkRequested(false);
      if (p.has("album") || (p.get("view") && p.get("view") !== "studio")) setSceneState("loading");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
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
    if (walkRequested) skipWalk.current?.focus({ preventScroll: true });
  }, [walkRequested]);
  useEffect(() => {
    if (view !== "studio") main.current?.focus({ preventScroll: true });
  }, [view]);
  function navigate(next: string, id?: string) {
    setView(next);
    setActiveId(id || null);
    setEntering(false);
    setWalkRequested(false);
    if (next !== "studio") setSceneState("loading");
    history.pushState(
      {},
      "",
      id
        ? `${assetBase}?album=${encodeURIComponent(id)}`
        : next === "studio"
          ? assetBase
          : `${assetBase}?view=${next}`,
    );
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
  let entranceLabel = "Click anywhere to begin.";
  if (entering) entranceLabel = "Entering the collection…";
  else if (walkRequested) entranceLabel = "Preparing your walk…";
  else if (sceneState === "fallback") entranceLabel = "Click anywhere to enter.";
  const collectionNotice = collectionStatus && (
          <div className="collection-status" role="status">
            <p>{collectionStatus === "loading"
              ? "Loading photographs. You can explore the room while they arrive."
              : "The photo service isn’t responding on this connection. You can still explore the room."}</p>
            {collectionStatus === "error" && <button className="text-link" onClick={onRetry}>Retry photographs ↗</button>}
          </div>
  );
  return (
    <div className={`portfolio view-${view}`}>
      {view !== "studio" && (
        <>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <button
              className="brand"
              onClick={() => navigate("studio")}
              aria-label={`${settings.name}, home`}
            >
              <span className="brand-symbol">▣</span>
              <span>{settings.name}</span>
            </button>
            <nav aria-label="Main navigation">
              <button
                className={
                  view === "collection" || view === "album" ? "active" : ""
                }
                onClick={() => navigate("collection")}
              >
                The collection
              </button>
              <button
                className={view === "about" ? "active" : ""}
                onClick={() => navigate("about")}
              >
                About
              </button>
              <button className="studio-nav" onClick={() => navigate("studio")}>
                <span className="status-dot" />
                The studio
              </button>
            </nav>
          </header>
        </>
      )}
      <main id="main" ref={main} tabIndex={-1}>
        {view === "studio" && (
          <section
            className={`entrance ${entering ? "is-entering" : ""}`}
            aria-label="Enter the photography studio"
          >
            <div className="entrance-brand brand">
              <span className="brand-symbol" aria-hidden="true">▣</span>
              <span>{settings.name}</span>
            </div>
            <div className="entrance-copy">
              <p className="eyebrow">MAKE YOURSELF AT HOME</p>
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
              <p className="entrance-note">
                Places, passing light,
                <br />
                and the moments in between.
              </p>
            </div>
            <div className="scene-wrap">
              <Room
                assetBase={assetBase}
                featured={albums
                  .map((a) => ({
                    url: cover(a)?.thumb || "",
                    title: a.title,
                  }))
                  .filter((p) => p.url)}
                title={settings.name}
                entering={walkRequested}
                onEnter={() => navigate("collection")}
                onBegin={() => {
                  window.scrollTo({ top: 0, behavior: "instant" });
                  setEntering(true);
                  setWalkRequested(true);
                }}
                onReady={() => setSceneState("ready")}
                onUnavailable={() => setSceneState("fallback")}
              />
            </div>
            {!walkRequested && (
              <button
                className="entrance-start"
                aria-label={sceneState === "fallback" ? "Enter the collection" : "Start the walk to the gallery"}
                aria-describedby="entrance-instruction"
                onClick={() => setWalkRequested(true)}
              />
            )}
            <div className="enter-laptop" aria-hidden="true">
              <span className="enter-ring">↗</span>
              <span>
                {entranceLabel}
                <small>
                  {sceneState === "fallback" ? "STILL-IMAGE ENTRANCE" : "STAND UP · WALK · EXPLORE"}
                </small>
              </span>
            </div>
            <div className="entrance-bottom">
              <span>01 / THE STUDIO</span>
              <span>From my room, into the world.</span>
              <span id="entrance-instruction">CLICK OR TAP ANYWHERE TO BEGIN</span>
            </div>
            {walkRequested && (
              <div className="walk-controls">
                <p role="status">{entering ? "On the way to the collection…" : "Preparing your walk…"}</p>
                <button ref={skipWalk} className="skip-walk" onClick={() => navigate("collection")}>
                  Skip animation <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}
          </section>
        )}
        {view === "collection" && (
          <section className="collection-page">
            {collectionNotice}
            <div className="collection-heading">
              <p className="eyebrow">THE PHOTOGRAPHIC ARCHIVE</p>
              <h1>
                Collected
                <br />
                <em>moments.</em>
                <sup>{String(albums.length).padStart(2, "0")}</sup>
              </h1>
              <p>
                Different places. Different rhythms.
                <br />
                Each collection, a way of looking.
              </p>
            </div>
            <div className="collection-list">
              {albums.map((a, i) => (
                <button
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
            </div>
            {albums.length === 0 && !collectionStatus && <Empty owner={initial.isOwner} managementUrl={managementUrl} />}
          </section>
        )}
        {view === "album" &&
          (active ? (
            <section className="album-page">
              <button
                className="text-link back-link"
                onClick={() => navigate("collection")}
              >
                ← All collections
              </button>
              <div className="album-heading">
                <div>
                  <p className="eyebrow">
                    {active.sample
                      ? "SAMPLE COLLECTION"
                      : "PHOTOGRAPHIC SERIES"}{" "}
                    / {String(active.photoIds.length).padStart(2, "0")} FRAMES
                  </p>
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
              <div className="album-end">
                <p className="eyebrow">END OF COLLECTION</p>
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
            <p className="eyebrow">A NOTE FROM THE STUDIO</p>
            <h1>
              To notice.
              <br />
              To remember.
              <br />
              <em>To look again.</em>
            </h1>
            <div className="about-body">
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
      {view !== "studio" && <footer className="site-footer">
        <button className="brand" onClick={() => navigate("studio")}>
          {settings.name}
        </button>
        <span>PHOTOGRAPHS, WITH ROOM TO BREATHE.</span>
        {managementUrl && <a href={managementUrl}>Studio management ↗</a>}
      </footer>}
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
      <p>New photographs will appear here.</p>
      {owner && managementUrl && (
        <a className="text-link" href={managementUrl}>
          Add your first photographs ↗
        </a>
      )}
    </div>
  );
}
