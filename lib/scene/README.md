# Interactive study

`study-room.ts` builds the enclosed room, desk, keyboard, lighting, window neighbourhood, and photo frames. `fujifilm-xt5.ts` builds the original camera prop; its references are in `public/scene/CAMERA-CREDITS.md`.

`study-state.ts` contains camera/timing constants. `batch-static.ts` combines fixed geometry to reduce draw calls while retaining interactive objects; `app/components/Room.tsx` handles rendering, movement and lighting controls.

The study runs entirely in the visitor's browser and does not depend on a backend. `gallery-projection.ts` projects the actual, continuously mounted gallery onto the monitor and aligns it exactly with the viewport at the end of the walk. There is no typing prompt or canvas imitation of the gallery.
