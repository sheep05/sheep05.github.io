# Atlas imagery

## High-resolution interactive globe

`earth-day-8k.jpg` (8192 × 4096; 1,697,912 bytes) and `earth-day-4k.jpg` (4096 × 2048; 560,448 bytes) use the **Solar System Scope / INOVE Earth day map**, licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

- Primary source and license: [Solar System Scope textures](https://play.solarsystemscope.com/textures/).
- Primary asset link: https://play.solarsystemscope.com/textures/download/8k_earth_daymap.jpg
- Downloaded from the [Wikimedia Commons mirror](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_8k_earth_daymap.jpg) after the primary host timed out; [original mirror file](https://upload.wikimedia.org/wikipedia/commons/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg).
- Retrieved: 3 November 2026. Changes: the 8K source was recompressed as progressive JPEG at quality 80; the fallback was resized to 4096 × 2048 and encoded at quality 82. Both omit source metadata. Colour and geography were not repainted. These are detailed equirectangular colour maps, not elevation models or live satellite imagery.
- Attribution: **Earth texture: Solar System Scope / INOVE, CC BY 4.0; resized/recompressed for this website.** No endorsement is implied.
- Orientation visually checked: north at top, Greenland left of centre, Greenwich at horizontal centre, Japan in the eastern/right half. These use the same longitude convention as the retained 2K texture below.

SHA-256:

- Downloaded 8K source: `88ab060b6e7d241cfc590c69f528fab2b3247b738d40124cb590999a6fe44abc`
- 8K: `dd3b3210124e0f0865b868fc817ec2bb9b96a1db5baa15570ff7aca3c9391f0a`
- 4K: `ba186800a46193ae3514601c2ba1c40aa931dbd20180b55f30694861499b3930`

## Retained lightweight chapter image

`earth-day.jpg` is the unchanged 2048 × 1024 equirectangular Earth colour texture supplied with the official Three.js Earth example. It is 512,606 bytes and is served locally with the website so the gallery does not rely on an external image service.

- Original asset: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg
- Example source: https://github.com/mrdoob/three.js/blob/dev/examples/misc_controls_fly.html
- Upstream repository license: https://github.com/mrdoob/three.js/blob/dev/LICENSE
- Retrieved: 2026-11-02. Credit: Three.js authors and contributors, official Earth example texture. No NASA authorship is claimed here because the upstream texture does not include a specific NASA provenance notice.

The image runs from 180°W at the left edge through Greenwich at the horizontal centre to 180°E at the right edge. North is at the top. Use an sRGB texture with the default Three.js image texture `flipY` and `SphereGeometry` UVs. With an unrotated standard sphere, longitude 0° lies on +X, 90°E on −Z, and north on +Y. A latitude/longitude marker therefore uses `x = r cos(lat) cos(lon)`, `y = r sin(lat)`, `z = -r cos(lat) sin(lon)` before any globe-group rotation.

## Upstream license notice

The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Gallery entrance portrait

`earth-card.webp` is a 1400 × 1400 transparent Earth portrait rendered from `earth-day-8k.jpg`, centred on Asia. It replaces the flat-map circle on the Scenes entrance card. Texture: Solar System Scope, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); changes: 3D sphere projection, lighting, and WebP compression. Source script: `scene-source/render-earth-card.py` (Blender). Convert its ignored `work/earth-card.png` output with Sharp `.webp({quality:90,alphaQuality:100})`.
