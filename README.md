# Quiet Studio photography website

A photography portfolio with a warm 3D room entrance and a private workspace for uploading photographs and publishing collections. GitHub Pages and Cloudflare display the same published photo library.

## Open the website

### [→ Open the photography website](https://sheep05.github.io/)

**[Upload photos and manage albums](https://quiet-studio-backend.sheep05.workers.dev/studio)** · **[Browse the collection directly](https://sheep05.github.io/?view=collection)**

You are currently viewing the source-code repository. Use the links above to enter the live website or sign in to your private Studio.

**[Read the owner guide](WEBSITE-GUIDE.md)** for step-by-step uploads, the current folder map, and publishing instructions. [Technical setup](FULL-APP.md) covers hosting, authentication, and storage.

## What each folder does

| Folder | Purpose |
| --- | --- |
| [`app/`](app/) | The website interface and backend routes: gallery, 3D room, private Studio, sign-in, and photo API. Start here to change how the website looks or behaves. |
| [`frontend/`](frontend/) | The small entry page that runs the shared gallery on GitHub Pages and loads published photos from Cloudflare. It was previously called `pages-preview`. |
| [`lib/`](lib/) | Shared photo/album types, database queries, sample collections, and owner-session logic. Both the gallery and Studio use these helpers. |
| [`db/`](db/) | The database schema and its migration history in `db/migrations/`. This defines album/photo metadata and sign-in records; it does not contain your uploaded image files. |
| [`public/`](public/) | Source assets copied into website builds: the exported 3D model, fallback room image, sample photographs, and favicon. Edit or replace an asset here before rebuilding. |
| [`docs/`](docs/) | The compiled public website served by GitHub Pages, including generated JavaScript, CSS, and copied assets. Rebuild it from the source; do not edit its generated bundles by hand. |
| [`scene-source/`](scene-source/) | The editable Blender room, its textures, generation scripts, and visual verification files. Use this for changes to the bed, furniture, lighting, or Japanese exterior. |
| [`tests/`](tests/) | Authentication checks and local upload/album integration tests, plus a local-only sign-in fixture helper. These help verify that editing works and drafts remain private. |
| [`worker/`](worker/) | The Cloudflare Worker entry point that passes requests to the backend application. Hosting settings are in the root `wrangler.jsonc` file. |

GitHub's file-list rows currently use short, purpose-specific documentation commits. Later edits replace those labels with their newer commit messages; the folder descriptions above remain the reference.

## Where to make a change

| Change | Where to go |
| --- | --- |
| Upload photos, create albums, rename the site, or edit your biography | [Private Studio](https://quiet-studio-backend.sheep05.workers.dev/studio); no code commit needed |
| Gallery layout | [`app/components/Portfolio.tsx`](app/components/Portfolio.tsx) |
| Colors, fonts, and spacing | [`app/globals.css`](app/globals.css) |
| Camera movement and curtain animation | [`app/components/Room.tsx`](app/components/Room.tsx) |
| Room furniture and geometry | [`scene-source/README.md`](scene-source/README.md) |
| Upload and editing interface | [`app/studio/Studio.tsx`](app/studio/Studio.tsx) |
| Browser-tab title on GitHub Pages | [`frontend/index.html`](frontend/index.html) |

## Important root files

| File | Purpose |
| --- | --- |
| `WEBSITE-GUIDE.md` | Step-by-step instructions for daily photo management and website edits. |
| `FULL-APP.md` | Developer instructions for authentication, storage, testing, deployment, and moving hosts. |
| `package.json` and `package-lock.json` | Commands and the exact dependency versions used to install and build the project. |
| `wrangler.jsonc` | Cloudflare Worker settings and database/photo-storage bindings. The private GitHub client secret is stored in Cloudflare, not in this file. |
| `vite.config.ts` and `vite.pages.config.ts` | Build settings for the Cloudflare application and GitHub Pages frontend, respectively. |
| `drizzle.config.ts` | Tells the database tooling where the schema and migration history live. |
| `tsconfig.json`, `eslint.config.mjs`, and `postcss.config.mjs` | Type checking, code checks, and CSS build settings. |
| `next.config.ts` and the root `.d.ts` files | Framework configuration and TypeScript declarations for browser and Cloudflare APIs. |
| `.gitignore` and `.npmrc` | Keep generated/private local files out of Git and set npm's installation preferences. |

## Run and build

Use Node.js 22.13 or newer. Install dependencies with `npm run install:ci`.

```sh
# Preview the public gallery using the shared photo library:
VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run dev:pages

# Build GitHub Pages into outputs/github-pages/:
VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run build:pages

# Build the Cloudflare application into dist/:
npm run build
```

Copy the public build into `docs/`, then commit and push to publish through GitHub Pages. Backend changes require a separate Cloudflare deployment; see [the editing guide](WEBSITE-GUIDE.md#6-build-and-publish-a-code-change).

## Folders visible only on your computer

These are ignored by Git and do not clutter the GitHub repository.

| Folder | Purpose |
| --- | --- |
| `node_modules/` | Installed software dependencies; recreated by `npm run install:ci`. |
| `dist/` | Generated Cloudflare application build. |
| `outputs/` | Generated GitHub Pages build before it is copied into `docs/`. |
| `.next/` and `.vinext/` | Framework-generated types, caches, and temporary build state. |
| `.wrangler/` | Local Cloudflare database/storage state and deployment-tool state; this checkout also keeps its Wrangler sign-in here. |
| `work/` | Local test fixtures, logs, and deployment notes. |
| `.git/` | Repository history and Git's internal bookkeeping. |

Your live uploaded photographs are stored in Cloudflare KV; their titles and album memberships are in Cloudflare D1. They are not files in this repository. Keep original photographs and database/image backups separately.
