import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { defaults, type Collection, type Photo, type Album } from "./types";
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) return { user: null, isOwner: false };
  let row = await env.DB.prepare("SELECT owner_id FROM studio WHERE id=?")
    .bind("main")
    .first<{ owner_id: string | null }>();
  if (
    !row?.owner_id &&
    env.OWNER_EMAIL &&
    user.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase()
  ) {
    await env.DB.prepare(
      "INSERT INTO studio (id,owner_id,name,tagline,bio,email,show_samples) VALUES (?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id WHERE studio.owner_id IS NULL",
    )
      .bind(
        "main",
        user.userId,
        defaults.name,
        defaults.tagline,
        defaults.bio,
        "",
      )
      .run();
    row = await env.DB.prepare("SELECT owner_id FROM studio WHERE id=?")
      .bind("main")
      .first<{ owner_id: string | null }>();
  }
  return { user, isOwner: row?.owner_id === user.userId };
}
export async function collection(includeDrafts = false, publicOnly = false): Promise<Collection> {
  const { user, isOwner } = publicOnly
    ? { user: null, isOwner: false }
    : await identity();
  const row = await env.DB.prepare("SELECT * FROM studio WHERE id=?")
    .bind("main")
    .first<any>();
  const settings = row
    ? {
        name: row.name,
        tagline: row.tagline,
        bio: row.bio,
        email: row.email,
        showSamples: !!row.show_samples,
      }
    : defaults;
  const drafts = includeDrafts && isOwner;
  const a = await env.DB.prepare(
    `SELECT * FROM albums ${drafts ? "" : "WHERE published=1"} ORDER BY position,id`,
  ).all<any>();
  const rel = await env.DB.prepare(
    `SELECT ap.* FROM album_photos ap JOIN albums a ON a.id=ap.album_id ${drafts ? "" : "WHERE a.published=1"} ORDER BY ap.position,ap.photo_id`,
  ).all<any>();
  const p = await env.DB.prepare(
    drafts
      ? "SELECT * FROM photos ORDER BY created_at DESC"
      : "SELECT DISTINCT p.* FROM photos p JOIN album_photos ap ON p.id=ap.photo_id JOIN albums a ON a.id=ap.album_id WHERE a.published=1 ORDER BY p.created_at DESC",
  ).all<any>();
  const albums: Album[] = a.results.map((x) => ({
    id: x.id,
    title: x.title,
    description: x.description,
    position: x.position,
    published: !!x.published,
    coverId: x.cover_id,
    photoIds: rel.results
      .filter((r) => r.album_id === x.id)
      .map((r) => r.photo_id),
  }));
  const photos: Photo[] = p.results.map((x) => ({
    id: x.id,
    title: x.title,
    caption: x.caption,
    alt: x.alt,
    width: x.width,
    height: x.height,
    url: `/api/media/${x.id}`,
    thumb: `/api/media/${x.id}?size=small`,
    albumIds: rel.results
      .filter((r) => r.photo_id === x.id)
      .map((r) => r.album_id),
  }));
  return { settings, albums, photos, isOwner, signedIn: !!user };
}
export function validText(value: unknown, max = 200) {
  if (typeof value !== "string" || value.length > max)
    throw new Error("Please shorten the text and try again.");
  return value.trim();
}
export async function existingAlbum(id: string) {
  return env.DB.prepare("SELECT id FROM albums WHERE id=?").bind(id).first();
}
