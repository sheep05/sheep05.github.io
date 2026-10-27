# Managing your photography website

Use the Studio dashboard for photographs, collections and site text. Use the source code for layout, styling, the 3D room and new features. Everyday photo changes do not require GitHub commits.

## Your website addresses

| Purpose | Address | Who can use it |
| --- | --- | --- |
| Main public website | https://sheep05.github.io/ | Anyone; share this address |
| Direct collection entrance | https://sheep05.github.io/?view=collection | Anyone; opens the collection without the room entrance |
| Private editing dashboard | https://quiet-studio-backend.sheep05.workers.dev/studio | Sign in with your `sheep05` GitHub account |
| Gallery served by the backend | https://quiet-studio-backend.sheep05.workers.dev/ | Anyone; displays the backend's published collection |
| Source code | https://github.com/sheep05/sheep05.github.io | Repository for code, not the visitor entrance |

The private dashboard is a public URL with protected editing. Knowing its address does not let another account manage your site. Visitors do not need GitHub, ChatGPT or Blender.

You can open these links on a computer, phone or tablet. A bookmark or a QR code pointing at the public address is another way to enter the same website. A custom domain can become another entrance later, after you register and connect it.

### How the two websites stay in sync

The GitHub frontend reads published photographs and collections from the same Cloudflare backend used by the Cloudflare gallery. Upload once in the Studio, publish the collection, then reload either website. Draft collections stay private. GitHub stores the website code and compiled frontend; your uploaded photo library stays in Cloudflare.

## Upload your first collection

1. Open the **private editing dashboard** and choose **Sign in with GitHub**. Use `sheep05`. At the first sign-in, review GitHub's authorization screen for Quiet Studio; the app requests public-profile identity, without repository or private-email scopes.
2. Select **Collections** in the sidebar, then **+ New collection**.
3. Enter a **Collection name** and, optionally, **A few words** describing it. Click **Create collection**. It starts as a draft.
4. Select **Photographs**. In **Upload to**, select the collection you just created.
5. Click **Choose photographs**, or drag files into the upload area. You can select several photographs. Wait for the completion notice and check for any errors.
6. Click a photograph to edit its **Title**, **Caption**, and **Image description**. The image description helps visitors using screen readers. Click **Save changes**.
7. Return to **Collections → Edit collection**. Choose a **Cover photograph**. Use **Preview collection** to review the draft while signed in.
8. Check **Publish this collection**, then **Save changes**. Open the public gallery in a separate/private browser window to see what visitors see.

Files may be JPG, PNG, WebP or AVIF, up to 50 MB and 100 megapixels each. Export RAW or HEIC photos as JPEG first. The browser makes a JPEG web copy with a maximum 3200-pixel long edge and an 800-pixel preview. It strips EXIF/GPS metadata. Keep your full-resolution originals separately; this website is not an original-file backup.

You do not manually insert pictures into a database. The dashboard saves image files in Cloudflare photo storage and saves titles, album membership and ordering in the database.

## Change existing photos and collections

| What you want to change | What to do |
| --- | --- |
| Rename a photograph or edit its caption | **Photographs → click the photograph → edit → Save changes** |
| Put one photograph in several albums | In the photo editor, check multiple boxes under **Include in collections** |
| Remove a photograph from one album | Uncheck only that collection in the photo editor and save; the photograph stays in your library |
| Change photo order | Open **Collections → Arrange photographs**; clear any search, then drag photographs or use the left/right arrows |
| Change album order | Use the up/down arrows beside a collection |
| Rename an album or change its cover | **Collections → Edit collection** |
| Hide an album | Uncheck **Publish this collection** and save |
| Replace an image with a new edit | Upload the new image, add it to the same collections, set its order/cover, then remove the old one when satisfied; there is no replace-file button yet |
| Delete an album | Use the collection's **Delete** action; its photographs remain in the library |
| Delete a photo everywhere | Use the photograph's **Delete** action; this removes it from all collections and cannot be undone in the dashboard |

A photo is public when it belongs to at least one published collection. Hiding one collection does not hide a photograph that also appears in another published collection. Unfiled photographs and photographs belonging only to drafts are owner-only.

Uploading straight into an already published collection makes the new photograph public. For work you want to review first, upload into a draft collection or **Unfiled photographs**.

New images may take a minute or more to appear everywhere because photo storage updates propagate between regions. Reload the gallery after saving; an already open visitor page does not update itself live. These photo and album updates appear on both websites without rebuilding or committing code.

## Rename the site and edit its text

Open **Studio settings**. Edit **Studio / website name**, **Opening line**, **About you**, or **Contact email**, then click **Save changes**. A contact email you enter is shown publicly.

When your own photographs are ready, uncheck **Show the sample collections** and save. This hides the demonstration content without deleting your uploads.

These are separate names and addresses:

- **Website name:** the visible brand, editable in Studio settings.
- **GitHub OAuth application name:** the name on the sign-in screen, editable in [GitHub application settings](https://github.com/settings/applications/3968032).
- **Public address:** `sheep05.github.io`. Editing either name above does not change this address.
- **Browser-tab title and search description:** currently defined in the code, in `pages-preview/index.html` for GitHub Pages and `app/layout.tsx` for the backend site.

## Update the design or code

**Editing a source file on GitHub and clicking Commit is not enough for the current setup.** GitHub Pages publishes the compiled files in `docs/`; it does not automatically rebuild React/TypeScript source. There is no custom automatic build workflow configured in this repository yet.

For a frontend change, use this sequence from your local project folder:

1. Edit the source and preview it locally.
2. Build the public site with the backend URL configured.
3. Replace the generated `docs/` contents with the new build.
4. Review the changes, commit the source and built files, and push to `main`.
5. Wait for GitHub Pages deployment to finish, then reload the live site.

Example commands, with Node.js 22.13 or newer installed:

```sh
cd quiet-studio-github

# Once after cloning, or when dependencies change:
npm ci --include=dev --include=optional

# Local frontend preview; stop it with Ctrl+C when finished:
VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run dev:pages

# Build the public frontend:
VITE_STUDIO_BACKEND_URL=https://quiet-studio-backend.sheep05.workers.dev npm run build:pages

# Replace generated website files only. Keep this destination as docs/.
rsync -a --delete outputs/github-pages/ docs/

git status
git diff --stat
```

Then use a Git client to select the intended source changes and generated `docs/` files, commit, and push. Avoid committing unrelated local work.

Do not edit the minified files inside `docs/assets/` directly. A future build overwrites them. The `--delete` copy command also removes files from `docs/` that are absent from the build output; if you later configure a custom domain using a `CNAME` file, keep its source in `public/CNAME` so builds retain it.

### Where to make changes

| Change | Source |
| --- | --- |
| Public layout and gallery behavior | `app/components/Portfolio.tsx` |
| Colors, typography, spacing and styling | `app/globals.css` |
| Walking pace, camera and curtain motion | `app/components/Room.tsx` |
| Room geometry and furnishings | `scene-source/quiet-studio.blend`; export/update the web model using the scene-source instructions |
| Photo-management interface | `app/studio/Studio.tsx` |
| Upload and album API behavior | `app/api/studio/route.ts` |
| Database schema | `db/schema.ts` and migrations in `drizzle/` |

### Backend changes require a separate deployment

Changing the Studio dashboard, authentication, upload API or database behavior requires a Cloudflare deployment. A GitHub commit alone does not deploy the backend. With Wrangler authenticated to your Cloudflare account:

```sh
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Apply pending database migrations before deployment when a schema change requires them; see `FULL-APP.md`. Shared component/style changes may need both the GitHub frontend build and the Cloudflare deployment. Keep `GITHUB_CLIENT_SECRET` in Cloudflare's secret storage, never in GitHub code or frontend variables.

You can also ask me to make a change, preview it, and deploy it—for example, “Make the walking motion slower” or “Add a year filter to my collections.” Photo uploads can be managed by you directly in the dashboard.

## Troubleshooting and backups

- **Sign-in fails:** confirm you are using `sheep05`. If you see “Owner sign-in is not configured yet,” the backend's GitHub credentials need checking. Signing into ChatGPT is not the same as signing into the Studio.
- **A photograph does not appear publicly:** check its collection membership and publication checkbox, allow time for storage propagation, then reload.
- **You still see example photographs:** turn off **Show the sample collections** in Studio settings.
- **Code changes do not appear:** confirm you rebuilt `docs/`, pushed the build to `main`, and the GitHub Pages deployment finished. For backend changes, confirm the Cloudflare deployment finished too.
- **Uploads fail:** check file type/size, connection and the displayed error. The selected free setup has a 1 GB photo-storage allowance and daily operation limits; it is not unlimited storage.
- **Backups:** keep original photos outside the website. GitHub backs up code, not your live uploaded photo library or album database. Export those separately before migrating or removing Cloudflare resources.

Your GitHub and Cloudflare accounts own the site and its data. Changing your ChatGPT account does not delete the website; another development session needs access to the repository and the appropriate hosting account to continue the work.
