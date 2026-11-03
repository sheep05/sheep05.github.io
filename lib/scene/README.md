# Interactive study

`study-room.ts` builds the enclosed room, desk, keyboard, lighting, window neighbourhood, and photo frames. `fujifilm-xt5.ts` builds the original camera prop; its references are in `public/scene/CAMERA-CREDITS.md`.

`study-state.ts` contains portable input rules and camera/timing constants. `batch-static.ts` combines fixed geometry to reduce draw calls while retaining interactive objects; `app/components/Room.tsx` handles rendering, movement, monitor text, keyboard input, and accessible controls.

The study runs entirely in the visitor's browser and does not depend on a backend. The “sheep” prompt is an introduction, not authentication, and is never submitted to a server.
