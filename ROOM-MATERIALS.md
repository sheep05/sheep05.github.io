# Study room materials and lighting

The entrance uses the approved Poly Haven material treatment. Its room geometry, monitor-to-gallery transition, camera inspection, lamp switch and day/night interaction are preserved.

- `lib/scene/study-materials.ts`: scanned PBR materials, physical UV scale and HDR environment setup.
- `lib/scene/study-room.ts`: furniture, room geometry, lamps and interaction targets.
- `lib/scene/animate-curtains.ts`: curtain sway, with clamped edge weights to avoid invalid geometry.
- `app/components/Room.tsx`: rendering, light transitions and camera interaction.
- `public/materials/poly-haven/`: locally hosted CC0 maps and the Lythwood Room HDRI.
- `material-sources/poly-haven-provenance.json`: original URLs, authors, dimensions and checksums.

Poly Haven assets are CC0: https://polyhaven.com/license . No paid add-on or visitor installation is needed. The browser uses Three.js; Blender is not required at runtime. These files work with GitHub Pages and the Cloudflare build. First visits still download assets; this change does not add offline caching.

The cream curtains retain their original color while using linen normal and roughness maps. Plaster uses the scan's normal and roughness maps with a clean base color. Room controls still update direct light; environment illumination does not provide full room occlusion.

Validate with `node --test tests/study.test.mjs tests/curtains.test.mjs`, `npx tsc --noEmit`, `npm run build:pages`, and `npm run verify:published`. GitHub builds source changes pushed to `main`; deploy the Cloudflare build separately to update its preview.

## Light, curtains, and the window view

`lib/scene/study-lighting.ts` controls the smoothly blended day/night light levels. Day uses stronger sunlight and window-frame shadows; night uses very weak moonlight, softer lamp shadows, and warm reflected fill. Click the window to switch modes and the lamp to switch it on or off.

`lib/scene/animate-curtains.ts` adds a slow billow and a small travelling ripple while keeping the top attached to its rod. Reduced-motion preferences disable the breeze.

`lib/scene/window-view.ts` builds an original Kyoto-inspired exterior with tiled roofs, lattice windows, lanterns, distant hills, and a pagoda. It uses local geometry and Poly Haven textures, including CC0 `cobblestone_floor_08` for the lane (source and checksums in `material-sources/window-stone-provenance.json`); visitors do not contact an external scenery service. Visual reference: [JNTO’s Gion and Higashiyama guide](https://www.japan.travel/en/destinations/kansai/kyoto/gion-and-higashiyama/). No reference photographs are copied into the website.

The two persistent entrance buttons are hidden. Click the monitor or camera directly; equivalent controls remain available when navigating with the Tab key. Camera return, skip-zoom, and the gallery fallback remain available.
