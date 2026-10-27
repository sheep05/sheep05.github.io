# Quiet Studio

An interactive photography studio and a private publishing workspace. The opening view is inside a spacious, enclosed bedroom with dim amber lamps, faint dusk light, and gently animated linen curtains: sit on the bed, rise, walk to the desk over 9.5 seconds with subtle camera sway, and enter the laptop screen. Blender creates the room; visitors load a lightweight glTF model in their browser. No Blender installation is required for visitors.

## Run locally

Node.js 22.13+ is required. Install dependencies with `npm ci --include=dev --include=optional`.

1. Set `OWNER_EMAIL=seedy@sites.test` in ignored `.dev.vars` for the starter's loopback-only mock sign-in.
2. Run `npm run build` to emit the local Wrangler configuration.
3. Apply each pending SQL migration in `drizzle/`, in order, with `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gigantic_maestro.sql`. Do not replay applied migrations.
4. Run `npm run dev` and open its localhost URL. `/studio` is the owner workspace; local sign-in uses a development-only account.
5. `node tests/integration.mjs` runs meaningful local API/persistence/access checks and removes its own fixtures.


## Publishing and ownership

`.openai/hosting.json` binds the Site to D1 (`DB`) and R2 (`BUCKET`). Publish through the Sites workflow; the platform applies committed migrations. Production `OWNER_EMAIL` is a server-side secret set to the Site owner's authenticated email. The first verified matching sign-in binds the stable Site user ID in D1; later writes require that ID. Authentication headers are supplied by Sites dispatch. Never expose the Worker behind a proxy that accepts user-supplied identity headers.

The initial publication is owner-private. Public visitor access and a purchased custom domain can be configured separately when the owner chooses to launch. Domain registration is not included.

## Managing photographs

- **Studio settings**: rename the site, edit the opening line and biography, set contact email, hide sample collections.
- **Photographs**: upload JPG/PNG/WebP/AVIF (50 MB source limit); the browser creates a maximum 3200px JPEG and an 800px preview, preserving aspect ratio and stripping EXIF/GPS. Originals remain on the user's device and are not stored by the site.
- **Collections**: create and rename albums, choose covers, reorder albums and photographs, preview drafts, publish/hide. A photograph can belong to multiple collections.
- Draft photographs and unfiled uploads are available only to the owner. Deleting a collection keeps the photographs; deleting a photograph removes it from every collection and from storage.

Demo photography is explicitly labeled and credited. Provenance is in `public/samples/samples.json`. The Blender room source and installation provenance are in `scene-source/README.md`; `.blend` contains packed textures.

## Accessibility and rendering

Keyboard-accessible entry, a direct collection route, native dialog focus trapping, Escape/arrow controls in the photo viewer, a static reduced-motion entrance, and a rendered fallback if WebGL is unavailable. Uploaded photo descriptions can be edited in the studio. The 3D scene only renders while visible.

## Your domain and portability

Quiet Studio is an editable site name. The current deployment uses ChatGPT Sites, and its preview is owner-private. Sites supports connecting an owned custom domain where that feature is available; domain registration and DNS are separate. A custom domain alone does not change the audience or remove sign-in.

The complete React/Three.js source, Blender source, packed `.blend`, glTF model, and assets live in this repository. Transferring hosting is possible but requires an actual migration: deploy the app to a compatible runtime, migrate the D1 album/metadata database and R2 uploaded images, replace Sites-provided identity with secure owner authentication, and update deployment configuration/DNS. The existing sign-in header trust must not be copied to an untrusted public proxy. A source archive alone does not include live uploaded photos or production database contents.

The Japanese night backdrop is a generated decorative scene, separate from portfolio photographs. Its prompt and provenance are recorded in `scene-source/japan-night.provenance.json`.

## GitHub Pages build

`npm run build:pages` creates `outputs/github-pages/`. This separate static entry uses the same portfolio and room components as the full application, with only the credited demo albums. It does not include live uploads, draft albums, an API, or an admin dashboard. The original Sites app remains intact.

For a user site named `USERNAME.github.io`, keep the default base `/`. For a project site, set `PAGES_BASE_PATH=/REPOSITORY/` when building so navigation, sample photos and scene assets all use the repository prefix. Do not upload the entire workspace or local environment files to publish the site.

One simple manual publication route: create the chosen public repository with a README, put the built folder's contents at its root (including an empty `.nojekyll`), then select Settings → Pages → Deploy from a branch → main → /(root). This publishes the static demo only. A connected backend or a separately implemented export workflow is needed before claiming that the existing upload/admin workflow publishes photos to GitHub Pages.

GitHub Pages is static hosting. Keeping uploads and album management requires a separate backend with authenticated writes and publicly accessible published images/data. The current owner-private Sites origin cannot simply be used as that backend without access, identity and cross-origin changes. The selected GitHub account is sheep05. A deployable backend origin is still required.

The chosen target is `sheep05.github.io`, with a separate upload/admin backend. Set `VITE_STUDIO_BACKEND_URL` to the verified public backend origin when building the GitHub frontend. It requests the read-only `/api/public` feed without credentials, converts uploaded image paths to backend URLs, and links Studio management to the backend. Without that variable the build is an explicitly sample-only demo. The public feed ignores owner sessions and draft query parameters; cross-origin image access is enabled only for published photos. Admin writes remain same-origin and authenticated. No backend origin has been provisioned or made public yet.
