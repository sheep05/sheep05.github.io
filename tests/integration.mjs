import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const origin = process.env.STUDIO_TEST_URL || "http://localhost:5173";
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin))
  throw new Error(
    "This test creates and removes fixtures and must run against a local preview.",
  );
const token = (await readFile(new URL("../work/local-access-token", import.meta.url), "utf8")).trim();
const cookie = `quiet-dev-session=${token}`;
const auth = { Cookie: cookie };
const get = async (owner = false) => {
  const r = await fetch(`${origin}/api/studio?drafts=1`, {
    headers: owner ? auth : {},
  });
  assert.equal(r.status, 200);
  return r.json();
};
const post = async (body, headers = auth) =>
  fetch(`${origin}/api/studio`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ok = async (body) => {
  const r = await post(body);
  assert.equal(r.status, 200, await r.text());
};
let albums = [],
  photos = [];
const saved = (await get(true)).settings;
try {
  assert.equal((await get(true)).isOwner, true, "Owner account bound");
  assert.equal(
    (await post({ action: "createAlbum", title: "Unauthorized" }, {})).status,
    403,
    "Anonymous writes forbidden",
  );
  assert.equal(
    (
      await post(
        { action: "createAlbum", title: "Cross-site" },
        { ...auth, Origin: "https://untrusted.example" },
      )
    ).status,
    403,
    "Cross-origin writes forbidden",
  );
  assert.equal(
    (
      await post(
        { action: "createAlbum", title: "Spoofed" },
        {
          "oai-authenticated-user-id": "local_seedy",
          "oai-authenticated-user-email": "seedy@sites.test",
        },
      )
    ).status,
    403,
    "Spoofed identity headers rejected",
  );
  for (const name of ["Integration A", "Integration B"]) {
    await ok({
      action: "createAlbum",
      title: name,
      description: "Temporary validation fixture",
    });
    const found = (await get(true)).albums.find((a) => a.title === name);
    assert.ok(found);
    albums.push(found.id);
  }
  assert.ok(
    !(await get()).albums.some((a) => albums.includes(a.id)),
    "Draft albums hidden",
  );
  const publicDraft = await fetch(`${origin}/api/public?drafts=1`, { headers: auth });
  assert.equal(publicDraft.headers.get("access-control-allow-origin"), "*");
  const publicDraftData = await publicDraft.json();
  assert.equal(publicDraftData.isOwner, false, "Public feed ignores owner session");
  assert.equal(publicDraftData.signedIn, false);
  assert.ok(!publicDraftData.albums.some((a) => albums.includes(a.id)), "Public feed never exposes drafts");
  const bytes = await readFile(
    new URL("../public/samples/coastal-02.jpg", import.meta.url),
  );
  for (let i = 0; i < 2; i++) {
    const form = new FormData();
    form.append("photo", new Blob([bytes], { type: "image/jpeg" }), "test.jpg");
    form.append(
      "thumb",
      new Blob([bytes], { type: "image/jpeg" }),
      "thumb.jpg",
    );
    form.append("width", "1200");
    form.append("height", "800");
    form.append("title", `Integration photo ${i}`);
    form.append("albumId", albums[0]);
    const response = await fetch(`${origin}/api/studio`, {
      method: "POST",
      headers: auth,
      body: form,
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    photos.push(body.id);
  }
  assert.equal(
    (await fetch(`${origin}/api/media/${photos[0]}`)).status,
    404,
    "Draft image inaccessible anonymously",
  );
  assert.equal(
    (await fetch(`${origin}/api/media/${photos[0]}`, { headers: auth })).status,
    200,
    "Owner can preview draft image",
  );
  await ok({
    action: "photo",
    id: photos[0],
    title: "Renamed photograph",
    caption: "A saved caption",
    alt: "Two people on a misty beach",
    albumIds: albums,
  });
  let state = await get(true);
  assert.equal(
    state.photos.find((p) => p.id === photos[0]).albumIds.length,
    2,
    "Photo belongs to multiple albums",
  );
  await ok({
    action: "reorderPhotos",
    albumId: albums[0],
    ids: [photos[1], photos[0]],
  });
  state = await get(true);
  assert.deepEqual(
    state.albums.find((a) => a.id === albums[0]).photoIds,
    [photos[1], photos[0]],
    "Photo order survives new request",
  );
  const allIds = state.albums.map((a) => a.id).reverse();
  await ok({ action: "reorderAlbums", ids: allIds });
  assert.deepEqual(
    (await get(true)).albums.map((a) => a.id),
    allIds,
    "Album order persists",
  );
  assert.equal(
    (
      await post({
        action: "reorderPhotos",
        albumId: albums[0],
        ids: ["foreign"],
      })
    ).status,
    400,
    "Invalid order rejected",
  );
  await ok({
    action: "album",
    id: albums[0],
    title: "Published integration",
    description: "Published fixture",
    published: true,
    coverId: photos[0],
  });
  const publicFeed = await (await fetch(`${origin}/api/public`)).json();
  assert.ok(publicFeed.albums.some((a) => a.id === albums[0]), "Public feed includes published collection");
  const publicImage = await fetch(`${origin}/api/media/${photos[0]}`);
  assert.equal(publicImage.headers.get("access-control-allow-origin"), "*", "Published image can be used in cross-origin WebGL");
  state = await get();
  assert.equal(
    state.albums.find((a) => a.id === albums[0]).coverId,
    photos[0],
    "Cover saved",
  );
  assert.ok(
    !state.albums.some((a) => a.id === albums[1]),
    "Other draft stays private",
  );
  assert.deepEqual(
    state.photos.find((p) => p.id === photos[0]).albumIds,
    [albums[0]],
    "Draft membership not leaked",
  );
  assert.equal(
    (await fetch(`${origin}/api/media/${photos[0]}`)).status,
    200,
    "Published image visible",
  );
  await ok({
    action: "album",
    id: albums[0],
    title: "Hidden integration",
    description: "Hidden fixture",
    published: false,
    coverId: photos[0],
  });
  assert.equal(
    (await fetch(`${origin}/api/media/${photos[0]}`)).status,
    404,
    "Unpublishing revokes image access",
  );
  await ok({
    action: "settings",
    ...saved,
    name: "Renamed Studio",
    showSamples: false,
  });
  state = await get();
  assert.equal(state.settings.name, "Renamed Studio");
  assert.equal(
    state.settings.showSamples,
    false,
    "Rename and sample visibility persist",
  );
  await ok({ action: "deleteAlbum", id: albums[1] });
  assert.ok(
    (await get(true)).photos.some((p) => p.id === photos[0]),
    "Removing album preserves photographs",
  );
  await ok({ action: "deletePhoto", id: photos[0] });
  assert.equal(
    (await fetch(`${origin}/api/media/${photos[0]}`, { headers: auth })).status,
    404,
    "Deleted photograph inaccessible",
  );
  console.log(
    "PASS: owner authentication, spoofing/CSRF protection, upload, persistence, multi-album membership, cover, ordering, publishing, private media, rename, sample visibility, deletion.",
  );
} finally {
  for (const id of photos) await post({ action: "deletePhoto", id });
  for (const id of albums) await post({ action: "deleteAlbum", id });
  await post({ action: "settings", ...saved });
}
