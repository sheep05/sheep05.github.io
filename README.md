# Quiet Studio — Photography

An enclosed, warmly lit bedroom leads visitors from the bed to a laptop and into a photography collection. The 9.5-second walk has subtle camera sway; linen curtains move gently, and the window overlooks dimensional Japanese buildings at night.

## Website

Target address: https://sheep05.github.io/

In repository **Settings → Pages**, choose **Deploy from a branch**, **main**, **/docs**, then **Save**. The `docs/` directory contains the compiled site and `.nojekyll`.

This first release displays explicitly credited sample photographs. It has no connected upload/admin backend yet, and contains no private uploads or draft collections.

## Edit and build

Use Node.js 22.13 or newer.

```sh
npm ci --include=dev --include=optional
npm run dev:pages
npm run build:pages
```

The static build appears in `outputs/github-pages/`. Replace the contents of `docs/` with that build and commit/push to publish an update. Do not open `pages-preview/index.html` directly as a file: it is source for the development server.

- Site name, tagline and biography defaults: `lib/types.ts`.
- Gallery: `app/components/Portfolio.tsx` and `app/globals.css`.
- Camera and curtain animation: `app/components/Room.tsx`.
- Editable Blender room: `scene-source/quiet-studio.blend`.
- Room generator and asset provenance: `scene-source/README.md`.
- Sample photograph credits: `public/samples/samples.json`.

## Uploading and managing your own photos

The full application includes authenticated uploads, renaming, album management, draft/publish controls and photos shared across multiple albums. It needs a separate backend; GitHub Pages serves only the public frontend.

Once a secure, publicly reachable backend is provisioned, build with `VITE_STUDIO_BACKEND_URL=https://YOUR-BACKEND`. The frontend will load published photos from `/api/public` and link to that backend's `/studio` administration page. The backend must provide verified owner authentication, database and image storage. Never deploy the original Sites identity-header trust on an untrusted public endpoint. See `FULL-APP.md` for architecture and migration details.

No backend is provisioned by this repository, and no credentials or live database/image exports are included. A custom domain can be attached later without tying ownership to a ChatGPT account.
