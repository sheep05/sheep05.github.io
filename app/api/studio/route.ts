import { env } from "cloudflare:workers";
import { collection, identity, validText, existingAlbum } from "@/lib/store";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  return json(
    await collection(new URL(request.url).searchParams.get("drafts") === "1"),
  );
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "This action must come from your studio." }, 403);
  const { isOwner } = await identity();
  if (!isOwner)
    return json(
      { error: "Sign in with the studio owner account to edit." },
      403,
    );
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data"))
      return await upload(request);
    const body = (await request.json()) as any;
    const action = body.action;
    if (action === "settings") {
      const name = validText(body.name, 60);
      if (!name) throw new Error("Give your studio a name.");
      const email = validText(body.email, 200);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid contact email.");
      await env.DB.prepare(
        "UPDATE studio SET name=?,tagline=?,bio=?,email=?,show_samples=? WHERE id=?",
      )
        .bind(
          name,
          validText(body.tagline, 180),
          validText(body.bio, 1800),
          email,
          body.showSamples ? 1 : 0,
          "main",
        )
        .run();
    } else if (action === "createAlbum") {
      const title = validText(body.title, 100);
      if (!title) throw new Error("Give this album a title.");
      await env.DB.prepare(
        "INSERT INTO albums(id,title,description,position,published) VALUES(?,?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM albums),0)",
      )
        .bind(
          crypto.randomUUID(),
          title,
          validText(body.description ?? "", 1000),
        )
        .run();
    } else if (action === "album") {
      const title = validText(body.title, 100);
      if (!title) throw new Error("Give this album a title.");
      if (!(await existingAlbum(body.id)))
        return json({ error: "Album not found." }, 404);
      if (
        body.coverId &&
        !(await env.DB.prepare(
          "SELECT 1 FROM album_photos WHERE album_id=? AND photo_id=?",
        )
          .bind(body.id, body.coverId)
          .first())
      )
        throw new Error("The cover must be a photograph in this album.");
      await env.DB.prepare(
        "UPDATE albums SET title=?,description=?,published=?,cover_id=? WHERE id=?",
      )
        .bind(
          title,
          validText(body.description, 1000),
          body.published ? 1 : 0,
          body.coverId || null,
          body.id,
        )
        .run();
    } else if (action === "deleteAlbum") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM album_photos WHERE album_id=?").bind(
          body.id,
        ),
        env.DB.prepare("DELETE FROM albums WHERE id=?").bind(body.id),
      ]);
    } else if (action === "photo") {
      const ids = Array.isArray(body.albumIds)
        ? ([...new Set(body.albumIds)] as string[])
        : [];
      if (ids.length > 100) throw new Error("Too many albums.");
      for (const id of ids)
        if (!(await existingAlbum(id)))
          throw new Error("An album no longer exists.");
      const ops = [
        env.DB.prepare(
          "UPDATE photos SET title=?,caption=?,alt=? WHERE id=?",
        ).bind(
          validText(body.title, 200),
          validText(body.caption, 1800),
          validText(body.alt, 500),
          body.id,
        ),
        env.DB.prepare(
          "DELETE FROM album_photos WHERE photo_id=? AND album_id NOT IN (SELECT value FROM json_each(?))",
        ).bind(body.id, JSON.stringify(ids)),
        env.DB.prepare(
          "UPDATE albums SET cover_id=NULL WHERE cover_id=? AND id NOT IN (SELECT value FROM json_each(?))",
        ).bind(body.id, JSON.stringify(ids)),
      ];
      for (const id of ids)
        ops.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO album_photos(album_id,photo_id,position) VALUES(?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM album_photos WHERE album_id=?))",
          ).bind(id, body.id, id),
        );
      await env.DB.batch(ops);
    } else if (action === "deletePhoto") {
      const p = await env.DB.prepare(
        "SELECT key,thumb_key FROM photos WHERE id=?",
      )
        .bind(body.id)
        .first<any>();
      if (p) {
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE albums SET cover_id=NULL WHERE cover_id=?",
          ).bind(body.id),
          env.DB.prepare("DELETE FROM album_photos WHERE photo_id=?").bind(
            body.id,
          ),
          env.DB.prepare("DELETE FROM photos WHERE id=?").bind(body.id),
        ]);
        await env.BUCKET.delete([p.key, p.thumb_key]);
      }
    } else if (action === "reorderAlbums" || action === "reorderPhotos") {
      if (
        !Array.isArray(body.ids) ||
        body.ids.length > 2000 ||
        new Set(body.ids).size !== body.ids.length
      )
        throw new Error("Invalid ordering.");
      const current =
        action === "reorderAlbums"
          ? await env.DB.prepare("SELECT id FROM albums").all<{ id: string }>()
          : await env.DB.prepare(
              "SELECT photo_id AS id FROM album_photos WHERE album_id=?",
            )
              .bind(body.albumId)
              .all<{ id: string }>();
      if (
        current.results.length !== body.ids.length ||
        current.results.some((x) => !body.ids.includes(x.id))
      )
        throw new Error("The collection changed. Refresh and try again.");
      const ops = body.ids.map((id: string, i: number) =>
        action === "reorderAlbums"
          ? env.DB.prepare("UPDATE albums SET position=? WHERE id=?").bind(
              i,
              id,
            )
          : env.DB.prepare(
              "UPDATE album_photos SET position=? WHERE album_id=? AND photo_id=?",
            ).bind(i, body.albumId, id),
      );
      if (ops.length) await env.DB.batch(ops);
    } else return json({ error: "Unknown action." }, 400);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json(
      {
        error:
          e instanceof Error && !/D1|SQL|R2/i.test(e.message)
            ? e.message
            : "Could not save your changes. Please try again.",
      },
      400,
    );
  }
}
async function upload(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 16 * 1024 * 1024)
    return json({ error: "Please upload a smaller photograph." }, 413);
  const data = await request.formData();
  const file = data.get("photo"),
    thumb = data.get("thumb");
  if (
    !(file instanceof File) ||
    !(thumb instanceof File) ||
    file.size > 12 * 1024 * 1024 ||
    thumb.size > 1024 * 1024
  )
    throw new Error("Upload JPEG photographs up to 12 MB.");
  for (const f of [file, thumb]) {
    const bytes = new Uint8Array(await f.slice(0, 3).arrayBuffer());
    if (
      f.type !== "image/jpeg" ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[2] !== 255
    )
      throw new Error("Use a valid JPEG photograph.");
  }
  const width = Number(data.get("width")),
    height = Number(data.get("height"));
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 16000 ||
    height > 16000
  )
    throw new Error("Invalid image dimensions.");
  const albumId = String(data.get("albumId") || "");
  if (albumId && !(await existingAlbum(albumId)))
    throw new Error("Choose an existing album.");
  const id = crypto.randomUUID(),
    key = `photos/${id}.jpg`,
    thumbKey = `photos/${id}-small.jpg`;
  try {
    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.BUCKET.put(thumbKey, thumb.stream(), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    const title = validText(String(data.get("title") || "Untitled"), 200);
    const ops = [
      env.DB.prepare(
        "INSERT INTO photos(id,title,caption,alt,width,height,key,thumb_key,created_at) VALUES(?,?,'',?,?,?,?,?,?)",
      ).bind(id, title, title, width, height, key, thumbKey, Date.now()),
    ];
    if (albumId)
      ops.push(
        env.DB.prepare(
          "INSERT INTO album_photos(album_id,photo_id,position) VALUES(?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM album_photos WHERE album_id=?))",
        ).bind(albumId, id, albumId),
      );
    await env.DB.batch(ops);
  } catch (e) {
    await env.BUCKET.delete([key, thumbKey]);
    throw e;
  }
  return json({ ok: true, id });
}
