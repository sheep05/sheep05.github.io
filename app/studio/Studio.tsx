"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Collection, Album, Photo } from "@/lib/types";
type Modal =
  | { kind: "album"; album?: Album }
  | { kind: "photo"; photo: Photo }
  | { kind: "delete"; type: "Album" | "Photo"; id: string; title: string }
  | null;
export default function Studio({ initial }: { initial: Collection }) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("photos"),
    [albumId, setAlbumId] = useState("all"),
    [modal, setModal] = useState<Modal>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [uploadTarget, setUploadTarget] = useState(""),
    [progress, setProgress] = useState<{
      done: number;
      total: number;
      percent: number;
      title: string;
    } | null>(null),
    [dragging, setDragging] = useState(false),
    [photoDrag, setPhotoDrag] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const selected = data.albums.find((a) => a.id === albumId);
  const ordered = selected
    ? (selected.photoIds
        .map((id) => data.photos.find((p) => p.id === id))
        .filter(Boolean) as Photo[])
    : data.photos;
  const visible = ordered.filter(
    (p) =>
      (albumId !== "unfiled" || p.albumIds.length === 0) &&
      `${p.title} ${p.caption}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function refresh() {
    const r = await fetch("/api/studio?drafts=1", { cache: "no-store" });
    if (!r.ok) throw new Error("Could not refresh the studio.");
    setData(await r.json());
  }
  async function action(body: any, message = "Changes saved") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || "Could not save changes.");
      await refresh();
      setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveModal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (modal?.kind === "album") {
      const ok = await action(
        {
          action: modal.album ? "album" : "createAlbum",
          id: modal.album?.id,
          title: f.get("title"),
          description: f.get("description"),
          published: f.get("published") === "on",
          coverId: f.get("coverId") || null,
        },
        modal.album
          ? "Collection updated"
          : "New collection created as a draft",
      );
      if (ok) setModal(null);
    } else if (modal?.kind === "photo") {
      const ok = await action(
        {
          action: "photo",
          id: modal.photo.id,
          title: f.get("title"),
          caption: f.get("caption"),
          alt: f.get("alt"),
          albumIds: f.getAll("albumIds"),
        },
        "Photograph updated",
      );
      if (ok) setModal(null);
    }
  }
  async function upload(files: FileList | File[]) {
    if (busy || !files.length) return;
    setBusy(true);
    setError("");
    let completed = 0;
    const failures: string[] = [];
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setProgress({
        done: i,
        total: list.length,
        percent: 0,
        title: `Preparing ${file.name}`,
      });
      try {
        if (
          !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
            file.type,
          )
        )
          throw new Error("Use JPG, PNG, WebP or AVIF");
        if (file.size > 50 * 1024 * 1024) throw new Error("File exceeds 50 MB");
        const image = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
        if (image.width * image.height > 100000000) {
          image.close();
          throw new Error("Image exceeds 100 megapixels");
        }
        const convert = async (max: number, quality: number) => {
          const ratio = Math.min(1, max / Math.max(image.width, image.height)),
            c = document.createElement("canvas");
          c.width = Math.round(image.width * ratio);
          c.height = Math.round(image.height * ratio);
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(image, 0, 0, c.width, c.height);
          const blob = await new Promise<Blob>((resolve, reject) =>
            c.toBlob(
              (b) =>
                b ? resolve(b) : reject(new Error("Cannot process this image")),
              "image/jpeg",
              quality,
            ),
          );
          return { blob, width: c.width, height: c.height };
        };
        const full = await convert(3200, 0.91),
          small = await convert(800, 0.82);
        image.close();
        const form = new FormData();
        form.append("photo", full.blob, "photo.jpg");
        form.append("thumb", small.blob, "thumb.jpg");
        form.append("width", String(full.width));
        form.append("height", String(full.height));
        form.append("title", file.name.replace(/\.[^.]+$/, "").slice(0, 200));
        form.append("albumId", uploadTarget);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/studio");
          xhr.timeout = 120000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress({
                done: i,
                total: list.length,
                percent: Math.round((e.loaded / e.total) * 100),
                title: file.name,
              });
          };
          xhr.onload = () => {
            let result: any;
            try {
              result = JSON.parse(xhr.responseText);
            } catch {
              reject(new Error("Unexpected upload response"));
              return;
            }
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(result.error || "Upload failed"));
          };
          xhr.onerror = () => reject(new Error("Connection lost"));
          xhr.ontimeout = () => reject(new Error("Upload timed out"));
          xhr.send(form);
        });
        completed++;
      } catch (e) {
        failures.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    try {
      await refresh();
    } catch (e) {
      failures.push((e as Error).message);
    }
    setProgress(null);
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
    setNotice(`${completed} photograph${completed === 1 ? "" : "s"} uploaded`);
    if (failures.length) setError(failures.join(" · "));
  }
  async function reorder(
    ids: string[],
    id: string,
    to: number,
    type: "photos" | "albums",
  ) {
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length) return;
    const copy = [...ids];
    copy.splice(from, 1);
    copy.splice(to, 0, id);
    await action(
      type === "albums"
        ? { action: "reorderAlbums", ids: copy }
        : { action: "reorderPhotos", albumId, ids: copy },
      "Sequence saved",
    );
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          ▣ <span>{data.settings.name}</span>
        </a>
        <p className="eyebrow admin-label">YOUR WORKSPACE</p>
        <nav aria-label="Studio management">
          <button
            className={tab === "photos" ? "selected" : ""}
            onClick={() => setTab("photos")}
          >
            <span>▧</span> Photographs <small>{data.photos.length}</small>
          </button>
          <button
            className={tab === "albums" ? "selected" : ""}
            onClick={() => setTab("albums")}
          >
            <span>▤</span> Collections <small>{data.albums.length}</small>
          </button>
          <button
            className={tab === "settings" ? "selected" : ""}
            onClick={() => setTab("settings")}
          >
            <span>⚙</span> Studio settings
          </button>
        </nav>
        <div className="sidebar-bottom">
          <a className="text-link" href="/" target="_blank">
            View website ↗
          </a>
          <form action="/auth/logout" method="post"><button className="text-link" type="submit">Sign out</button></form>
          <span className="eyebrow">
            <span className="status-dot" /> PRIVATE WORKSPACE
          </span>
        </div>
      </aside>
      <main className="admin-main">
        <p className="admin-storage-note">Free photo storage: 1 GB. Newly uploaded images may take a minute to appear everywhere.</p>
        <header className="admin-heading">
          <div>
            <p className="eyebrow">STUDIO MANAGEMENT</p>
            <h1>
              {tab === "photos"
                ? "Your photographs."
                : tab === "albums"
                  ? "Your collections."
                  : "Make it yours."}
            </h1>
            <p>
              {tab === "photos"
                ? "Upload, arrange, and give your photographs a home."
                : tab === "albums"
                  ? "Bring individual frames into a larger story."
                  : "The details that make this space feel like you."}
            </p>
          </div>
          {tab === "albums" && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => setModal({ kind: "album" })}
            >
              + New collection
            </button>
          )}
        </header>
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
        {tab === "photos" && (
          <>
            <section
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                upload(e.dataTransfer.files);
              }}
              aria-label="Upload photographs"
            >
              <div className="upload-icon">↑</div>
              <div>
                <h2>
                  {progress
                    ? `Uploading ${progress.done + 1} of ${progress.total}`
                    : "Add something worth looking at."}
                </h2>
                <p>
                  {progress
                    ? progress.title
                    : "Drop photographs here, or choose files to upload."}
                </p>
                <small>
                  JPG, PNG, WebP, AVIF · up to 50 MB each · web copies created
                  automatically
                </small>
                {progress && (
                  <progress
                    aria-label="Upload progress"
                    value={progress.done * 100 + progress.percent}
                    max={progress.total * 100}
                  />
                )}
              </div>
              <div className="upload-actions">
                <label htmlFor="upload-album">Upload to</label>
                <select
                  id="upload-album"
                  disabled={busy}
                  value={uploadTarget}
                  onChange={(e) => setUploadTarget(e.target.value)}
                >
                  <option value="">Unfiled photographs</option>
                  {data.albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                      {!a.published ? " · Draft" : ""}
                    </option>
                  ))}
                </select>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  ↑ Choose photographs
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) upload(e.target.files);
                  }}
                />
              </div>
            </section>
            <div className="admin-toolbar">
              <div className="filter-group">
                <label htmlFor="collection-filter">Collection</label>
                <select
                  id="collection-filter"
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                >
                  <option value="all">
                    All photographs ({data.photos.length})
                  </option>
                  <option value="unfiled">Unfiled photographs</option>
                  {data.albums.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="search"
                aria-label="Search photographs"
                placeholder="Search photographs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {selected && (
              <div className="sequence-note">
                <span>
                  Drag photographs to sequence this collection, or use the arrow
                  buttons.
                </span>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => setModal({ kind: "album", album: selected })}
                >
                  Edit collection ↗
                </button>
              </div>
            )}
            {visible.length ? (
              <div className="admin-photo-grid">
                {visible.map((p, i) => (
                  <article
                    className="admin-photo"
                    key={p.id}
                    draggable={!!selected && !busy && !query}
                    onDragStart={(e) => {
                      setPhotoDrag(p.id);
                      e.dataTransfer.setData("text/plain", p.id);
                    }}
                    onDragOver={(e) => {
                      if (selected && photoDrag) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!selected || !photoDrag || query) return;
                      e.preventDefault();
                      reorder(
                        selected.photoIds,
                        photoDrag,
                        selected.photoIds.indexOf(p.id),
                        "photos",
                      );
                      setPhotoDrag(null);
                    }}
                    onDragEnd={() => setPhotoDrag(null)}
                  >
                    <button
                      className="admin-photo-open"
                      onClick={() => setModal({ kind: "photo", photo: p })}
                    >
                      <img
                        src={p.thumb}
                        alt={p.alt || p.title}
                        loading="lazy"
                      />
                      <span>Edit photograph ↗</span>
                    </button>
                    <div className="admin-photo-meta">
                      <button
                        onClick={() => setModal({ kind: "photo", photo: p })}
                      >
                        {p.title}
                      </button>
                      <small>
                        {p.albumIds.length
                          ? `${p.albumIds.length} collection${p.albumIds.length === 1 ? "" : "s"}`
                          : "Unfiled"}{" "}
                        · {p.width} × {p.height}
                      </small>
                      <div className="photo-tools">
                        {selected && (
                          <>
                            <button
                              aria-label={`Move ${p.title} earlier`}
                              disabled={busy || i === 0 || !!query}
                              onClick={() =>
                                reorder(
                                  selected.photoIds,
                                  p.id,
                                  i - 1,
                                  "photos",
                                )
                              }
                            >
                              ←
                            </button>
                            <button
                              aria-label={`Move ${p.title} later`}
                              disabled={
                                busy || i === visible.length - 1 || !!query
                              }
                              onClick={() =>
                                reorder(
                                  selected.photoIds,
                                  p.id,
                                  i + 1,
                                  "photos",
                                )
                              }
                            >
                              →
                            </button>
                          </>
                        )}
                        <button
                          className="delete-link"
                          disabled={busy}
                          onClick={() =>
                            setModal({
                              kind: "delete",
                              type: "Photo",
                              id: p.id,
                              title: p.title,
                            })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <span>▧</span>
                <h2>
                  {query
                    ? "No matching photographs."
                    : "Your next chapter starts here."}
                </h2>
                <p>
                  {query
                    ? "Try another title or caption."
                    : "Upload your first photographs, then arrange them into collections."}
                </p>
                {!query && (
                  <button
                    className="text-link"
                    onClick={() => setTab("albums")}
                  >
                    Create a collection ↗
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {tab === "albums" && (
          <>
            {data.albums.length ? (
              <div className="admin-album-list">
                {data.albums.map((a, i) => {
                  const cover = data.photos.find(
                    (p) => p.id === (a.coverId || a.photoIds[0]),
                  );
                  return (
                    <article className="admin-album" key={a.id}>
                      <div className="admin-album-cover">
                        {cover ? (
                          <img
                            src={cover.thumb}
                            alt={cover.alt || cover.title}
                          />
                        ) : (
                          <span>▤</span>
                        )}
                      </div>
                      <div className="admin-album-copy">
                        <span
                          className={`badge ${a.published ? "published" : ""}`}
                        >
                          {a.published ? "Published" : "Draft"}
                        </span>
                        <h2>{a.title}</h2>
                        <p>
                          {a.description ||
                            "Add a few words about this collection."}
                        </p>
                        <small>{a.photoIds.length} photographs</small>
                      </div>
                      <div className="admin-album-actions">
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => setModal({ kind: "album", album: a })}
                        >
                          Edit collection
                        </button>
                        <button
                          className="text-link"
                          onClick={() => {
                            setTab("photos");
                            setAlbumId(a.id);
                            setUploadTarget(a.id);
                          }}
                        >
                          Arrange photographs ↗
                        </button>
                        <div className="photo-tools">
                          <button
                            disabled={busy || i === 0}
                            aria-label={`Move ${a.title} up`}
                            onClick={() =>
                              reorder(
                                data.albums.map((x) => x.id),
                                a.id,
                                i - 1,
                                "albums",
                              )
                            }
                          >
                            ↑
                          </button>
                          <button
                            disabled={busy || i === data.albums.length - 1}
                            aria-label={`Move ${a.title} down`}
                            onClick={() =>
                              reorder(
                                data.albums.map((x) => x.id),
                                a.id,
                                i + 1,
                                "albums",
                              )
                            }
                          >
                            ↓
                          </button>
                          <button
                            className="delete-link"
                            disabled={busy}
                            onClick={() =>
                              setModal({
                                kind: "delete",
                                type: "Album",
                                id: a.id,
                                title: a.title,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="admin-empty">
                <span>▤</span>
                <h2>Every collection tells a story.</h2>
                <p>
                  Start with a place, a feeling, or a subject that keeps drawing
                  you back.
                </p>
                <button
                  className="button primary"
                  onClick={() => setModal({ kind: "album" })}
                >
                  + Create your first collection
                </button>
              </div>
            )}
            <div className="admin-tip">
              <span>GOOD TO KNOW</span>
              <p>
                New collections start as drafts. Open “Edit collection” when you
                are ready to publish. A photograph can belong to more than one
                collection.
              </p>
            </div>
          </>
        )}
        {tab === "settings" && (
          <form
            className="settings-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await action(
                {
                  action: "settings",
                  name: f.get("name"),
                  tagline: f.get("tagline"),
                  bio: f.get("bio"),
                  email: f.get("email"),
                  showSamples: f.get("showSamples") === "on",
                },
                "Your studio has been updated",
              );
            }}
          >
            <section>
              <div className="form-section-label">
                <span>01</span>
                <h2>Your identity</h2>
              </div>
              <div className="form-fields">
                <label>
                  Studio / website name
                  <input
                    name="name"
                    maxLength={60}
                    required
                    defaultValue={data.settings.name}
                  />
                </label>
                <label>
                  Opening line
                  <input
                    name="tagline"
                    maxLength={180}
                    required
                    defaultValue={data.settings.tagline}
                  />
                  <small>
                    The first words visitors see when they enter your studio.
                  </small>
                </label>
                <label>
                  About you
                  <textarea
                    name="bio"
                    rows={5}
                    maxLength={1800}
                    defaultValue={data.settings.bio}
                  />
                </label>
                <label>
                  Contact email
                  <input
                    name="email"
                    type="email"
                    maxLength={200}
                    defaultValue={data.settings.email}
                    placeholder="Optional"
                  />
                  <small>Shown publicly only when you add an address.</small>
                </label>
              </div>
            </section>
            <section>
              <div className="form-section-label">
                <span>02</span>
                <h2>Sample content</h2>
              </div>
              <div className="form-fields">
                <label className="check-label">
                  <input
                    type="checkbox"
                    name="showSamples"
                    defaultChecked={data.settings.showSamples}
                  />
                  <span>
                    Show the sample collections
                    <small>
                      Credited demonstration photographs help you preview the
                      design. Turn this off when your own work is ready; your
                      uploads are unaffected.
                    </small>
                  </span>
                </label>
              </div>
            </section>
            <div className="settings-submit">
              <span>Changes apply to your website when saved.</span>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes ↗"}
              </button>
            </div>
          </form>
        )}
      </main>
      <dialog
        ref={dialog}
        className="admin-modal"
        onCancel={() => {
          if (!busy) setModal(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) setModal(null);
        }}
      >
        {modal && (
          <>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <button
              className="modal-close"
              aria-label="Close editor"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              ×
            </button>
            {modal.kind === "delete" ? (
              <div className="delete-confirm">
                <p className="eyebrow">REMOVE {modal.type.toUpperCase()}</p>
                <h2>Delete “{modal.title}”?</h2>
                <p>
                  {modal.type === "Album"
                    ? "The collection will be removed. Its photographs stay in your library."
                    : "This photograph will be removed from your library and every collection. This cannot be undone."}
                </p>
                <div className="modal-actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setModal(null)}
                  >
                    Keep it
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await action(
                        {
                          action:
                            modal.type === "Album"
                              ? "deleteAlbum"
                              : "deletePhoto",
                          id: modal.id,
                        },
                        `${modal.type === "Album" ? "Collection" : "Photograph"} deleted`,
                      );
                      if (ok) {
                        if (modal.id === albumId) setAlbumId("all");
                        if (modal.id === uploadTarget) setUploadTarget("");
                        setModal(null);
                      }
                    }}
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <form
                key={
                  modal.kind === "album"
                    ? modal.album?.id || "new"
                    : modal.photo.id
                }
                onSubmit={saveModal}
              >
                <p className="eyebrow">
                  {modal.kind === "album"
                    ? "CURATE YOUR COLLECTION"
                    : "PHOTOGRAPH DETAILS"}
                </p>
                <h2>
                  {modal.kind === "album"
                    ? modal.album
                      ? "Edit collection"
                      : "A new collection"
                    : "A closer look."}
                </h2>
                {modal.kind === "album" ? (
                  <>
                    <label>
                      Collection name
                      <input
                        name="title"
                        maxLength={100}
                        required
                        defaultValue={modal.album?.title}
                        autoFocus
                        placeholder="e.g. Somewhere by the sea"
                      />
                    </label>
                    <label>
                      A few words
                      <textarea
                        name="description"
                        rows={3}
                        maxLength={1000}
                        defaultValue={modal.album?.description}
                        placeholder="What brings these photographs together?"
                      />
                    </label>
                    {modal.album && (
                      <>
                        <label>
                          Cover photograph
                          <select
                            name="coverId"
                            defaultValue={modal.album.coverId || ""}
                          >
                            <option value="">
                              First photograph in the collection
                            </option>
                            {modal.album.photoIds.map((id) => {
                              const p = data.photos.find((p) => p.id === id);
                              return (
                                <option key={id} value={id}>
                                  {p?.title}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            name="published"
                            defaultChecked={modal.album.published}
                          />
                          <span>
                            Publish this collection
                            <small>
                              Visible in your website’s collection when enabled.
                            </small>
                          </span>
                        </label>
                        <a
                          className="text-link"
                          href={`/?album=${modal.album.id}&preview=1`}
                          target="_blank"
                        >
                          Preview collection ↗
                        </a>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      className="edit-photo-preview"
                      src={modal.photo.thumb}
                      alt={modal.photo.alt || modal.photo.title}
                    />
                    <label>
                      Title
                      <input
                        name="title"
                        maxLength={200}
                        required
                        defaultValue={modal.photo.title}
                      />
                    </label>
                    <label>
                      Caption
                      <textarea
                        name="caption"
                        rows={2}
                        maxLength={1800}
                        defaultValue={modal.photo.caption}
                      />
                    </label>
                    <label>
                      Image description
                      <input
                        name="alt"
                        maxLength={500}
                        defaultValue={modal.photo.alt}
                      />
                      <small>
                        Describe the photograph for people using screen readers.
                      </small>
                    </label>
                    <fieldset>
                      <legend>Include in collections</legend>
                      {data.albums.length ? (
                        data.albums.map((a) => (
                          <label className="check-label" key={a.id}>
                            <input
                              type="checkbox"
                              name="albumIds"
                              value={a.id}
                              defaultChecked={modal.photo.albumIds.includes(
                                a.id,
                              )}
                            />
                            <span>
                              {a.title}
                              {!a.published && <small>Draft</small>}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p>Create a collection to organize this photograph.</p>
                      )}
                    </fieldset>
                  </>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button className="button primary" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : modal.kind === "album" && !modal.album
                        ? "Create collection"
                        : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
