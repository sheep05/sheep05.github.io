# GitHub Pages entry

This frontend bundles `public/published/collection.json` and serves local photographs. Shared gallery components live in `app/components/`; `config/backend.json` supplies the editor link and publishing API origin so the gallery can use another compatible backend later.

The public homepage is the About cover in `cover.html`, `cover.js`, and `cover.css`.
`main.tsx` selects the cover or the dynamically loaded `gallery.tsx` entry, so the
homepage does not load React, Three.js, the photo catalog, or room textures.
The approved portrait and locally hosted Work Sans font live in `public/cover/`;
the font license is included there. The contact email is explicitly published as
part of the cover, independently of the private Studio settings export.

`#collections` opens the shared black menu. Existing `?view=collection` and
`?view=about` URLs resolve to this cover; album and region URLs are preserved.
`?view=studio` opens the optional workshop. Its monitor zoom is reversible and
never activates the collection links projected on the screen.

Build with `npm run build:pages`. Run `node --test tests/public-entry.test.mjs`
for entry routing. The Pages workflow publishes the generated output and updates
`docs/`; authored changes do not need a separately committed local build.
