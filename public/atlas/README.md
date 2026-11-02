# Atlas imagery

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
