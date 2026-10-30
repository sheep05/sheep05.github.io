# Your photography website — owner guide

## 1. Open the right page

| Purpose | Link |
| --- | --- |
| Public website and 3D room | [sheep05.github.io](https://sheep05.github.io/) |
| Public collections, skipping the room | [Browse collections](https://sheep05.github.io/?view=collection) |
| Upload photos and edit your website | [Private Studio](https://quiet-studio-backend.sheep05.workers.dev/studio) |
| Preview saved content before GitHub publishes | [Cloudflare gallery](https://quiet-studio-backend.sheep05.workers.dev/) |
| Check or start a publication | [Publish photography website](https://github.com/sheep05/sheep05.github.io/actions/workflows/publish-gallery.yml) |

The contact email saved in Studio is excluded from the GitHub copy by default; it is not written into the public repository.

Only the GitHub account **sheep05** can edit Private Studio. Your Cloudflare account email does not need to match your GitHub email. Visitors do not need to sign in.

## 2. How publishing now works

**Edit in Private Studio → daily GitHub publishing job → complete public website on GitHub Pages.**

Private Studio saves your library in Cloudflare. GitHub checks the anonymous, published library once a day at **04:13 China time (Asia/Shanghai)**, downloads the published photos and thumbnails, builds the website, and deploys it. GitHub can delay scheduled runs; this is a scheduled check, not an exact delivery guarantee. Source-code commits to `main` and manual runs also trigger publication.

The GitHub website serves its text, albums, uploaded photographs, samples, and 3D room from GitHub. Visitors no longer call Cloudflare for gallery data or images. You can close Studio, sign out, and turn off your computer. Cloudflare is needed to edit content and to download the next publication, but not to view the last successfully published GitHub website.

**Saving in Studio is not an immediate GitHub publication.** The Cloudflare preview reflects saved content sooner; GitHub reflects the last successful publishing job. This is expected. No manual GitHub commit is needed for photo or text edits.

To publish sooner:

1. Finish saving your edits in Studio. Publish any collections you want visible.
2. Open [Actions → Publish photography website](https://github.com/sheep05/sheep05.github.io/actions/workflows/publish-gallery.yml).
3. Click **Run workflow**, choose **main**, and click **Run workflow** again.
4. Wait for the run to finish with a green check, then reload [the public website](https://sheep05.github.io/).

A scheduled run with no changes skips building and deployment. If a download fails, validation fails, or the library changes during export, the job stops and the previous public site remains available. If a deployment succeeds but saving its repository copy fails, the site is updated; rerun the job to repair the repository copy. Scheduled workflows in public repositories may be disabled after 60 days of inactivity: check Actions and re-enable the workflow if GitHub reports this.

This is **backend-independent hosting**, not offline browsing. Visitors still need internet access to GitHub; disconnected devices cannot receive new edits.

## 3. Upload and publish your photographs

1. Open [Private Studio](https://quiet-studio-backend.sheep05.workers.dev/studio) and sign in with **sheep05**.
2. Select **Collections → + New collection**. Give it a title and description. New collections begin as drafts.
3. Select **Photographs** and choose the collection under **Upload to**.
4. Click **Choose photographs** or drag photographs into the upload area. Wait for upload completion and check for errors.
5. Edit photograph titles, captions, and image descriptions as needed.
6. In **Collections**, arrange the photographs, select a cover, and edit the collection description.
7. Check **Publish this collection → Save changes** when ready.
8. Wait for the daily publication or use **Run workflow** above.

A photograph is public if it belongs to any published collection. Draft-only and unfiled photographs are not exported. Publishing an album also publishes its photos. Uploading directly into an already published collection makes the image eligible for the next publication.

Supported uploads: JPG, PNG, WebP, and AVIF, up to 50 MB and 100 megapixels per original file. Export RAW/HEIC images as JPEG first. Studio creates a JPEG web copy up to 3200 pixels on the longest edge and an 800-pixel thumbnail, removing EXIF/GPS metadata. Keep original files separately.

## 4. Change text, collections, or images

| Change | Where to edit |
| --- | --- |
| Website name, opening line, biography, contact email | **Studio settings → Save changes** |
| Hide demonstration collections | **Studio settings → Show the sample collections**, switch off and save |
| Album title, description, cover, publication state | **Collections → Edit collection → Save changes** |
| Photo title, caption, image description | **Photographs → open the photo editor → Save changes** |
| Photo order | Arrange photographs within the collection |
| Replace the image itself | Upload the revised photo, assign its collection/cover/order, then remove the old photo when satisfied |
| Browser-tab title on GitHub Pages | Edit `frontend/index.html`, commit to `main`; the workflow builds it |

Turning an album back into a draft removes it from the next successful GitHub publication. A photo remains public if another published collection uses it. Removed photos can remain in Git history and browser caches; committing a public image to GitHub is not suitable for content that must later be made confidential.

## 5. Understand the repository

| Folder | Function |
| --- | --- |
| `app/` | Shared gallery, 3D room, Private Studio, and backend routes. Edit the public design or Studio behavior here. |
| `frontend/` | GitHub Pages entry. It reads the saved public snapshot at build time, rather than asking Cloudflare in visitors' browsers. |
| `public/published/` | Automatically generated public text, albums, and optimized photo files. Edit in Studio; the next publication replaces these files. |
| `public/scene/` and `public/samples/` | The exported room and demonstration photos. These are source assets copied into each build. |
| `docs/` | Generated copy of the last published website. GitHub Actions deploys the build and maintains this copy; avoid editing generated bundles. |
| `scripts/` | The public-library exporter and checks that the built website has local photo files and no visitor API dependency. |
| `.github/workflows/` | The daily/manual/code-change publishing job. `publish-gallery.yml` controls the schedule and deployment. |
| `lib/` | Shared data types, database queries, samples, and sign-in helpers. |
| `db/` | Database schema and migrations; not the uploaded image files. |
| `scene-source/` | Blender model and room-generation tools. Export changes to `public/scene/` before publishing. |
| `tests/` | Checks for authentication, publication privacy, complete downloads, and failure recovery. |
| `worker/` | Cloudflare application entry. Cloudflare settings are in `wrangler.jsonc`. |

The live editing database and originals' web copies remain in Cloudflare D1/KV. GitHub contains only exported public copies, not your full private library. Back up Cloudflare separately before migrating or deleting it.

## 6. Edit the code

| Change | File / folder | Publication |
| --- | --- | --- |
| Gallery layout | `app/components/Portfolio.tsx` | Commit to `main` for GitHub; deploy Cloudflare separately for its preview |
| Fonts, colors, spacing | `app/globals.css` | Same as above |
| Walk/camera/curtain motion | `app/components/Room.tsx` | Same as above |
| Furniture or scene geometry | `scene-source/`, exported to `public/scene/` | Commit assets to `main`; see scene guide |
| Studio upload/editing behavior | `app/studio/Studio.tsx`, `app/api/studio/route.ts` | Build and deploy Cloudflare |
| Export policy or daily schedule | `scripts/`, `.github/workflows/publish-gallery.yml` | Commit to `main` |
| This guide | `WEBSITE-GUIDE.md` | Commit the Markdown change |

**GitHub source changes now build automatically on `main`.** Pages settings must remain **Source: GitHub Actions**. Do not switch back to “Deploy from a branch”: commits made by the workflow's built-in token do not trigger that older Pages build mechanism.

For a local public preview, use Node.js 24:

```sh
npm ci --include=dev --include=optional
npm run sync:published
npm run dev:pages
```

To check a production build locally:

```sh
npm run test:publish
npm run build:pages
npm run verify:published
```

To update the Cloudflare application itself:

```sh
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Deploy matching server and static assets together. Do not deploy a newly rebuilt server while retaining unrelated old assets: that can break styling and scripts. The current Cloudflare service uses an emergency asset fallback documented in the local `work/studio-ui-repair-handoff.md`; if normal asset upload still fails, preserve the working deployment and investigate before replacing it.

## 7. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Studio shows an edit but GitHub does not | Check the last successful publication; wait for the daily job or run it manually |
| An uploaded photo is missing | Make sure it belongs to a saved, published collection; review the Actions log for download errors |
| Red publishing run | Open the failed step, correct the reported issue, then **Re-run failed jobs**; previous public site remains available |
| No daily runs | Check whether GitHub disabled the workflow for inactivity and re-enable it; schedules may also be delayed |
| Old styling after deployment | In Safari choose **View → Reload Page From Origin** |
| GitHub works but Studio does not | Studio still requires Cloudflare and owner sign-in; the public site is independent |
| Owner sign-in rejected | Use GitHub **sheep05**, not another GitHub account; Cloudflare email does not matter |
| Room skipped | Use `/` for the entrance; `?view=collection` deliberately skips it. Reduced-motion or unsupported 3D uses a still-image entrance |

GitHub Pages' published-site limit is 1 GB. The exporter stops before photo copies alone reach 900 MB to leave space for the room and code. Source photos are also preserved in repository history. Store only optimized public copies here, not RAW originals. The existing Cloudflare free storage allowance is 1 GB.

Official references: [Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
