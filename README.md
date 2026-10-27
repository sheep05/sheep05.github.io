# Quiet Studio — Photography

An enclosed, warmly lit bedroom leads visitors from the bed to a laptop and into a photography collection. The 9.5-second walk has subtle camera sway; linen curtains move gently, and the window overlooks dimensional Japanese buildings at night.

## Addresses

- Public website: https://sheep05.github.io/
- Upload and album workspace: https://quiet-studio-backend.sheep05.workers.dev/studio
- Public photo feed: https://quiet-studio-backend.sheep05.workers.dev/api/public

GitHub Pages serves the public website from **main /docs**. A separate Cloudflare Worker serves the owner workspace and API. D1 stores album metadata; Workers KV stores optimized photos and thumbnails. Only the configured GitHub owner can edit. OAuth configuration must be complete before owner sign-in works.

## Build the public website

Use Node.js 22.13 or newer.

```sh
npm ci --include=dev --include=optional
npm run dev:pages
VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run build:pages
```

The static build appears in `outputs/github-pages/`. Replace the contents of `docs/` with that build, including `.nojekyll`, then commit/push. Without `VITE_STUDIO_BACKEND_URL`, the build shows credited sample collections only. Do not open `pages-preview/index.html` directly as a file; use its development server.

## Make it yours

Read [the website management guide](WEBSITE-GUIDE.md) for the visitor and editing addresses, step-by-step uploads, album publishing, renaming, and code-update instructions.

The private studio supports photo uploads, site and photo renaming, album creation, covers, ordering, and draft/publish controls. A photo can belong to multiple albums. Uploads are resized in your browser and lose EXIF/GPS metadata; keep your original files separately.

- Gallery design: `app/components/Portfolio.tsx` and `app/globals.css`.
- Camera and curtain animation: `app/components/Room.tsx`.
- Editable Blender room: `scene-source/quiet-studio.blend`.
- Scene generation and provenance: `scene-source/README.md`.
- Sample photography credits: `public/samples/samples.json`.

## Hosting and ownership

The selected setup uses Cloudflare's free services without R2, Access, or billing enrollment. KV has a 1 GB free storage allowance and daily operation limits; exceeded free limits can interrupt uploads or browsing. New images can take a minute or more to reach every region. See `FULL-APP.md` for setup, authentication, testing and portability.

The website and backend belong to your GitHub and Cloudflare accounts. A custom domain can be attached later. Changing ChatGPT accounts does not transfer or delete those resources. This source repository does not contain credentials, uploaded photos, or a production database backup.
