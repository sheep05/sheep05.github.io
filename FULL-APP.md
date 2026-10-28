# Technical guide to hosting, authentication, and storage

Quiet Studio combines a static public gallery with a private publishing workspace. Blender creates the room; visitors load a glTF model in their browser and do not need Blender installed.

## Architecture

- **GitHub Pages:** public frontend at `https://sheep05.github.io/`, published from `main /docs`.
- **Cloudflare Worker:** `quiet-studio-backend`, API and `/studio` at `https://quiet-studio-backend.sheep05.workers.dev`.
- **D1 binding `DB`:** albums, photo metadata, settings and short-lived owner sessions.
- **KV binding `PHOTOS`:** optimized JPEGs and thumbnails. No R2 or billing enrollment is required for the selected Free plan.
- **GitHub OAuth:** public-profile identity only, with no repository or private-email scopes. Owner access is tied to immutable GitHub user ID `152187410` (sheep05).

The public feed ignores sessions and draft parameters. Cross-origin media access is enabled only for published photographs. Every media request checks publication in D1; KV is not trusted to decide access. Private and unfiled photographs require the owner's session.

OAuth uses PKCE S256, a matching state cookie, and an atomically consumed ten-minute flow record. Session cookies are Secure, HttpOnly and SameSite=Lax. Only hashes of session tokens are stored in D1; sessions expire after eight hours and are revoked on sign-out. Caller-supplied ChatGPT or Cloudflare identity headers are ignored.

## Production setup

The checked-in `wrangler.jsonc` identifies this deployment's database, KV namespace, public GitHub client ID and backend origin. Resource IDs and OAuth client IDs are not secrets. To deploy to a different account, create replacement free D1/KV resources and update those IDs first.

1. Authorize Wrangler for the selected Cloudflare account.
2. Apply pending migrations: `npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc`.
3. Register a GitHub OAuth app owned by the studio owner. Homepage: `https://sheep05.github.io/`. Redirect URI: `https://quiet-studio-backend.sheep05.workers.dev/auth/callback`. Leave wildcard matching and Device Flow disabled.
4. Set `GITHUB_CLIENT_ID`, `STUDIO_ORIGIN`, and `OWNER_GITHUB_ID` in Wrangler's `vars`.
5. Store `GITHUB_CLIENT_SECRET` as a Cloudflare Worker **secret**, using the dashboard or interactive `npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.jsonc`. Never put it in source, chat, screenshots or a frontend environment variable.
6. Run `npm run build`, then `npx wrangler deploy --config dist/server/wrangler.json`.
7. Verify owner sign-in at `/studio`, upload a photograph, assign it to an album, and publish that album.
8. Build the public frontend with `VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run build:pages`, replace `docs/` with the output, and publish to GitHub.

The first verified owner visit initializes the studio. Other GitHub accounts cannot claim it. Pending OAuth configuration produces a controlled unavailable response; it never enables public editing.

## Run and test locally

Node.js 22.13+ is required.

```sh
npm ci --include=dev --include=optional
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc
node --experimental-strip-types tests/prepare-local-auth.mjs
npx wrangler d1 execute DB --local --config wrangler.jsonc --file work/local-auth.sql
npm run dev
```

The test helper writes an expiring local session, SQL fixture and `.dev.vars`, all ignored by Git. Apply `work/local-auth.sql` **only with `--local`**, never remotely. The development-only cookie is accepted only by the development build on loopback hosts. Changing the D1 database ID changes the local database location; apply migrations again if that ID changes.

In another terminal, run `node tests/integration.mjs`. The integration test refuses non-loopback URLs and cleans up its own fixtures. It checks uploads, persistence, album membership, ordering, cover handling, publication, private media, settings, deletion, and forged identity/CSRF attempts. `npm run test:auth` checks PKCE, OAuth state, owner identity, session expiry and logout. Run `npx tsc --noEmit` and `npm run build` for type/build checks.

## Managing photographs

- **Studio settings:** rename the site, edit the opening line and biography, set a contact email, and hide sample collections.
- **Photographs:** upload JPG/PNG/WebP/AVIF (50 MB source limit). The browser creates a maximum 3200px JPEG plus an 800px preview, preserving aspect ratio and stripping EXIF/GPS. Originals stay on your device.
- **Collections:** create and rename albums, choose covers, reorder albums and photographs, preview drafts, publish or hide. One photograph can belong to multiple albums.
- Deleting an album keeps its photographs. Deleting a photo removes it from every album and storage. Unfiled photographs remain owner-only.

KV is eventually consistent: newly uploaded images can take a minute or more to appear in another region. Metadata publication changes are checked in D1 on each media request. Keep original photographs and maintain backups of database metadata and stored images separately from Git.

## Free-plan limits

The selected plan requires no R2 subscription or Cloudflare Access enrollment. Workers Free and KV have finite daily request/operation allowances. KV's free allowance includes 1 GB storage, 100,000 reads/day and 1,000 writes/day; each upload uses at least two writes (image and thumbnail). Exceeding a free allowance can cause operations to fail. Do not enable a paid plan without the owner's approval.

Check current limits before changing the architecture:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/kv/platform/pricing/
- https://developers.cloudflare.com/kv/platform/limits/
- https://developers.cloudflare.com/kv/concepts/how-kv-works/

## Accessibility and rendering

Keyboard-accessible entry, direct collection navigation, native dialog focus trapping, Escape/arrow controls in the photo viewer, reduced-motion entrance, and a rendered fallback if WebGL is unavailable. Photo descriptions are editable. The 3D scene renders only while visible.

Sample photographs are explicitly labeled and credited in `public/samples/samples.json`. The decorative Japanese night scene is separate from portfolio photography; its provenance is recorded in `scene-source/japan-night.provenance.json`. Blender source and packed textures are included.

## Custom domains and portability

Quiet Studio is an editable name. A custom domain can point to GitHub Pages while the backend remains on Cloudflare. Moving the backend requires updating its OAuth redirect URI, `STUDIO_ORIGIN` and the public frontend's backend URL. Moving to another provider also requires database and photo migration and equivalent secure owner authentication.

The complete React/Three.js source, Blender source and assets are in this repository. Live uploads, database contents, secrets and account credentials are not. Keep ownership of the GitHub and Cloudflare accounts; their operation is independent of the ChatGPT account used to develop the site.
