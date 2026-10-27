import { env } from "cloudflare:workers";
import { identity } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await env.DB.prepare(
    "SELECT key,thumb_key FROM photos WHERE id=?",
  )
    .bind(id)
    .first<any>();
  if (!photo) return new Response("Not found", { status: 404 });
  const published = await env.DB.prepare(
    "SELECT 1 FROM album_photos ap JOIN albums a ON a.id=ap.album_id WHERE ap.photo_id=? AND a.published=1 LIMIT 1",
  )
    .bind(id)
    .first();
  if (!published && !(await identity()).isOwner)
    return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(
    new URL(request.url).searchParams.get("size") === "small"
      ? photo.thumb_key
      : photo.key,
  );
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(published ? { "Access-Control-Allow-Origin": "*" } : {}),
    },
  });
}
