# Portable gallery and backend contract

The public website is a static React/Three.js application hosted on GitHub Pages. It reads the bundled `public/published/collection.json` snapshot and local images; it does not import a Cloudflare SDK or contact the editing backend when visitors browse.

## What is portable now

- `lib/catalog.ts`: chapter definitions, country metadata, geographic coordinates, and assignment validation. No hosting SDK, database, or authentication dependency.
- `Album.chapters`: an array of `scenes`, `portraits`, and/or `street`. Empty means All collections only. Multiple chapters are allowed.
- `Album.regions`: an array of uppercase ISO two-letter country codes, e.g. `JP`, `SG`, `MY`, `CN`. Multiple countries are allowed. Countries affect the atlas only when the album also belongs to Scenes.
- Missing assignment fields are read as empty arrays, so older exports remain valid. No title-based classification is performed. Assignments can be changed or cleared later.
- The country registry in `lib/catalog.ts` supplies marker labels and representative coordinates. Add a country there to give it a globe marker and Studio checkbox. Existing assignments for other country codes are preserved and available in the atlas's country list.
- The export script accepts another HTTPS origin; the same contract was tested against a simulated independent backend origin, including downloaded images and chapter assignments.

## Changing hosting later

1. Implement the API contract below on the new server, and migrate the existing library using stable album/photo IDs, relationships, and image keys. Keep authentication server-side.
2. Update `config/backend.json`: `publicOrigin` is the anonymous API server; `studioUrl` is the owner editor URL. The publisher also accepts the `PUBLISH_ORIGIN` environment override for API downloads; it does not change the editor link.
3. Run the contract/export tests and a full export into a separate directory. Compare album/photo counts and IDs, text, assignments, and both image sizes. Do not switch the public origin until those checks pass.
4. Commit the configuration change. The next GitHub workflow builds a self-contained website using that server's public library.

The existing **editing server is still deployed to Cloudflare**: `lib/store.ts`, `lib/auth.ts`, API routes, D1/KV bindings, and the Worker entry remain Cloudflare-specific adapters. Moving it to Oracle requires deploying a server and replacing those storage/authentication adapters; this revision does not create an Oracle server or migrate credentials/data. The new gallery and metadata do not require that platform, and no Oracle service is assumed.

## Read contract used by the publisher

`GET /api/public` is anonymous and returns:

```json
{
  "settings": {"name":"My studio","tagline":"Hello","bio":"","email":"","showSamples":false},
  "albums": [{"id":"album-id","title":"A journey","description":"","position":0,"published":true,"coverId":"photo-id","photoIds":["photo-id"],"chapters":["scenes","street"],"regions":["JP"]}],
  "photos": [{"id":"photo-id","title":"A photograph","caption":"","alt":"Image description","width":1600,"height":1200,"url":"/api/media/photo-id","thumb":"/api/media/photo-id?size=small","albumIds":["album-id"]}],
  "isOwner": false,
  "signedIn": false
}
```

- Only published albums and their photos are returned, even if a caller supplies a cookie or draft query. Do not return unfiled or draft-only photos.
- `/api/media/:id` and `/api/media/:id?size=small` return JPEG bytes. The server may store them anywhere; these public routes proxy/read that storage. Immutable IDs are required: replacing image bytes must create a new ID.
- URLs may be relative or absolute but must be on the configured HTTPS origin. Cross-origin media, redirects, credentials in URLs, and unexpected query parameters are rejected by the publisher.
- All IDs match `[A-Za-z0-9_-]{1,100}`. References and cover IDs must point to photos in that album. Photo and album arrays must have unique IDs.
- Chapter/country edits are included in the publication fingerprint. Contact email is always omitted from the GitHub snapshot.

## Editing contract for the current Studio UI

Owner-authenticated `GET /api/studio?drafts=1` returns the complete owner's library with the same album fields. `POST /api/studio` accepts `createAlbum` and `album` actions with `chapters` and `regions` arrays alongside the existing title/description/cover/published fields. Empty arrays clear assignments. For older clients, omitted fields on album updates preserve the saved values. The server validates assignments, verifies ownership, and rejects cross-origin writes.

D1 stores these arrays as JSON text through the additive migration `0002_gallery_chapters.sql`. SQLite migration tests verify that existing albums survive and begin unassigned. Other databases can use JSON arrays, JSON text, or join tables as long as the API returns the same fields.

Run with Node 24:

```sh
node --test tests/catalog.test.mjs tests/published-export.test.mjs
npm run build:pages
npm run verify:published
```
