# Blender source for the 3D room

Editable Blender source, room-generation scripts, textures, and visual checks for the 3D entrance, created with Blender 4.5.15 LTS. The exported browser assets live in `../public/scene/`; visitors do not need Blender installed.

## Files
- `quiet-studio.blend`: editable scene with packed textures.
- `create_studio.py`: deterministic scene generator.
- `../public/scene/quiet-studio.glb`: browser asset, embedded textures, Y-up coordinates.
- `../public/scene/studio-preview.jpg`: rendered loading/fallback image.
- `../public/scene/scene-metadata.json`: camera and laptop target coordinates.

Regenerate using `/Applications/Blender.app/Contents/MacOS/Blender --background --python create_studio.py`.

## Installation validation
Blender installed at `/Applications/Blender.app` from the official Blender 4.5 release server. SHA-256 of the Apple Silicon DMG matched the official manifest: `bfbc0bda099d1ab7aef0992a584f872f58bed9bb491210ad45f9ca071aa2e688`. `codesign --verify --deep --strict` succeeded. Signing identity: Stichting Blender Foundation, team 68UA947AUU. `Blender --version` reported 4.5.15 LTS. Downloaded installer and partial transfers were removed after installation.

## Viewing
The studio is a fully enclosed bedroom, approximately 8 × 7.5 metres, with a muted taupe/walnut palette at dusk. The viewer starts sitting on the bed at the front-right, stands into the central aisle and walks to the desk. The desk and laptop coordinates remain unchanged. Cool faint window light balances warm reading lamps; the laptop remains legible.

All coordinates use Three.js / glTF Y-up metres:
- Seated camera `[2.35,1.28,3.48]`, gaze `[0.75,0.97,-0.30]`, vertical FOV 64 degrees.
- Standing camera `[1.88,1.65,3.10]`.
- Walking waypoint `[0.7,1.65,1.45]`.
- Final lean camera `[0,1.49,0.35]`, gaze `[0,1.485,-0.305]`.
- Screen mesh: `LaptopScreen`, position `[0,1.485,-0.305]`.
- Dim cool window key inside the room: `[-3.60,2.45,-0.15]`.
- Warm desk lamp light: `[-1.18,1.505,-0.59]`.
- Warm bedside lamp light: `[3.57,1.03,1.55]`.
- `WindowJapanNight` is the distant generated Tokyo panorama; it should disable shadow casting.

For Three.js begin with restrained ambient/hemisphere light around 0.35, cool window fill around 0.6, and warm point lights around 8–10 with inverse-square decay, then judge the actual renderer exposure. Blender watt values are not interchangeable with browser light intensity.

## Curtain breeze
`BreezeCurtainLeft` and `BreezeCurtainRight` are distinct 24 × 36 quad grids, with 925 vertices per panel, identity transforms, alpha BLEND 0.76 and double-sided fabric. The glTF local vertical axis is **Y**, from 0.82 at the hem to 3.30 at the top. Local **X** points into the room; local Z runs across each panel. Meshes have enough wall clearance for the suggested 9.5 cm maximum breeze displacement.

Cache the base position array and deform from it every frame. Keep the top fixed using `weight = pow(clamp((3.30 - y) / 2.48, 0, 1), 1.7)`. Apply `offsetX = weight * (0.07 * sin(time * 1.2 + z * 2.5) + 0.025 * sin(time * 2.0 + y * 3.0))`. A small phase difference between the two panels prevents mirrored motion. Recalculate normals periodically, mark the position attribute dirty, and respect reduced-motion preferences. No GLB animation is baked in.

## Exterior depth and verification
The generated Japan night image is retained as a distant backdrop at X = -22 m. It is behind actual modeled pitched-roof residences at X = -7.15 and -8.5 m, a residential apartment block at X = -12.1 m, and sagging utility cables around X = -6.15 m. Roof volumes, layered window frames and sills, lit glass, balcony floors and rails produce real translation parallax as the viewer walks. Geometry is combined by material to limit draw calls. Warm window glass is emissive; dark roofs and plaster have very restrained ambient emission to remain legible without adding browser exterior lights.

The backdrop spans Blender Y = -16 to 23 m and height Z = -15 to 11 m (glTF vertical Y = -15 to 11 m and horizontal Z = -23 to 16 m). `verify_exterior.py` traces 252 rays through the four window corners at 63 camera positions along the complete seated-to-screen path. The furthest panorama intersection is about 32.12 m, within the browser camera far plane of 80 m. Projected landmark positions are recorded in `exterior-qa.json` to show differing relative shifts between nearby roofs and the distant backdrop.

Visual QA files:
- `../public/scene/studio-preview.jpg`: final entry view.
- `exterior-entry.jpg`: window view from seated entry position.
- `exterior-approach.jpg`: window view from walking waypoint.
- `exterior-qa.json`: coverage and parallax measurements.
- `bed-detail.jpg`: retained bed construction QA.

Run the verification with Blender loading `quiet-studio.blend` and `--python verify_exterior.py`. The two window renders intentionally aim at the same window centre to make perspective changes easy to compare. They are QA views, not a change to the website camera motion. Browser testing is separate from this Blender and GLB validation.

## Demonstration photographs
The room uses placeholder photographs from Unsplash; they do not represent the owner's work. Image URLs are recorded in scene-metadata.json. Replace these textures with the owner's photographs as desired.

The Tokyo panorama is an AI-generated visual asset, not an actual photograph by the site owner. It is stored as `japan-night.png`, optimized to `japan-night-web.jpg`, and embedded in the GLB.
