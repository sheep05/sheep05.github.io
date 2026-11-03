import type * as Three from "three";

/** An original, lightweight X-T5-inspired desk prop; see CAMERA-CREDITS.md.
 * Bottom centre is the origin, lens faces +Z, body width is 0.30 world units.
 * Everything is attached to the returned group for ordinary traversal disposal.
 */
export function createXT5(T: typeof Three): Three.Group {
  const root = new T.Group();
  root.name = "Fujifilm XT5 camera";
  root.scale.setScalar(0.3 / 129.5);
  const silver = new T.MeshStandardMaterial({ color: 0xa9aca8, metalness: .78, roughness: .34 });
  const black = new T.MeshStandardMaterial({ color: 0x17191a, metalness: .28, roughness: .53 });
  const rubber = new T.MeshStandardMaterial({ color: 0x0b0d0e, roughness: .92 });
  const chrome = new T.MeshStandardMaterial({ color: 0xc2c4c1, metalness: .88, roughness: .21 });
  const glass = new T.MeshPhysicalMaterial({ color: 0x172e36, metalness: .28, roughness: .12, clearcoat: 1 });
  const innerGlass = new T.MeshStandardMaterial({ color: 0x060c14, metalness: .5, roughness: .16 });
  const noise = new Uint8Array(64 * 64 * 4);
  let seed = 2505;
  for (let i = 0; i < noise.length; i += 4) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    noise[i] = noise[i + 1] = noise[i + 2] = 65 + seed % 140;
    noise[i + 3] = 255;
  }
  const grain = new T.DataTexture(noise, 64, 64);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(6, 4);
  grain.needsUpdate = true;
  const leather = new T.MeshStandardMaterial({ color: 0x252625, roughness: .88, bumpMap: grain, bumpScale: .35 });

  function mesh(geometry: Three.BufferGeometry, material: Three.Material, x: number, y: number, z: number) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    root.add(object);
    return object;
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material = black, radius = 1.5) {
    const s = new T.Shape(), a = w / 2 - radius, b = h / 2 - radius;
    s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b);
    s.quadraticCurveTo(w / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b);
    s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
    const bevel = Math.min(.7, d / 4);
    const geometry = new T.ExtrudeGeometry(s, { depth: d - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 4 });
    geometry.translate(0, 0, -d / 2 + bevel);
    return mesh(geometry, material, x, y, z);
  }
  function cylinder(radius: number, depth: number, x: number, y: number, z: number, material = black, axis: "y" | "z" = "z") {
    const object = mesh(new T.CylinderGeometry(radius, radius, depth, 48), material, x, y, z);
    if (axis === "z") object.rotation.x = Math.PI / 2;
    return object;
  }
  function torus(radius: number, tube: number, x: number, y: number, z: number, material = black) {
    return mesh(new T.TorusGeometry(radius, tube, 6, 48), material, x, y, z);
  }
  function knurl(radius: number, height: number, x: number, y: number, z: number, count = 48, axis: "y" | "z" = "z") {
    const geometry = new T.BoxGeometry(.65, height, .85);
    const ribs = new T.InstancedMesh(geometry, rubber, count);
    const dummy = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      dummy.rotation.y = -angle;
      dummy.updateMatrix();
      ribs.setMatrixAt(i, dummy.matrix);
    }
    ribs.position.set(x, y, z);
    if (axis === "z") ribs.rotation.x = Math.PI / 2;
    ribs.castShadow = true;
    root.add(ribs);
  }
  function label(text: string, w: number, h: number, x: number, y: number, z: number, top = false, color = "#e4e4df") {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = color; context.textAlign = "center"; context.textBaseline = "middle";
    context.font = "600 56px Arial"; context.fillText(text, 256, 64, 490);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const plane = mesh(new T.PlaneGeometry(w, h), material, x, y, z);
    plane.castShadow = plane.receiveShadow = false;
    if (top) plane.rotation.x = -Math.PI / 2;
    return plane;
  }
  function dialFace(radius: number, x: number, z: number, values: string[]) {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#b4b7b1"; context.fillRect(0, 0, 256, 256);
    context.translate(128, 128);
    context.textAlign = "center"; context.textBaseline = "middle";
    for (let i = 0; i < values.length * 3; i++) {
      context.save(); context.rotate(i / (values.length * 3) * Math.PI * 2);
      context.fillStyle = "#303533"; context.fillRect(-1, -119, 2, i % 3 ? 5 : 9);
      if (i % 3 === 0) {
        context.font = "17px Arial";
        context.fillStyle = values[i / 3] === "A" ? "#b54021" : "#303533";
        context.fillText(values[i / 3], 0, -92);
      }
      context.restore();
    }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const face = mesh(new T.CircleGeometry(radius - .6, 48), new T.MeshStandardMaterial({ map: texture, metalness: .5, roughness: .4 }), x, 88.15, z);
    face.rotation.x = -Math.PI / 2;
  }

  // Distinctive silver shoulders over the textured black body and deep right grip.
  box(129.5, 65, 39, 0, 35, 0, leather, 5);
  box(129, 15, 40, 0, 74, 0, silver, 3);
  box(129, 4, 40, 0, 3, 0, black, 2);
  box(21, 59, 20, -51, 34, 25, leather, 6);
  const prism = new T.Shape();
  prism.moveTo(-18, 77); prism.lineTo(-12, 91); prism.lineTo(12, 91); prism.lineTo(18, 77); prism.closePath();
  const prismGeometry = new T.ExtrudeGeometry(prism, { depth: 31, bevelEnabled: true, bevelSegments: 2, bevelSize: .8, bevelThickness: .8, steps: 1 });
  mesh(prismGeometry, silver, 0, 0, -17);
  box(20, 12, 8, 0, 83, -20, rubber, 2);
  box(14, 8, 1, 0, 83, -24.5, glass, 1);
  // Hot shoe, retaining rails, and flash contacts.
  box(16, 1.7, 17, 0, 93, -2, black, .5);
  box(1.2, 2, 16, -7.7, 94, -2, chrome, .3);
  box(1.2, 2, 16, 7.7, 94, -2, chrome, .3);
  for (const x of [-4, 0, 4]) cylinder(.8, .5, x, 94, 1, chrome, "y");
  label("FUJIFILM", 25, 5, 0, 84, 14.8, false, "#272b2a");
  label("X-T5", 16, 6, 49, 73, 20.8, false, "#272b2a");

  // ISO, shutter-speed, and exposure-compensation top dials, with tactile edges.
  for (const [x, radius, z, values] of [[45, 11, 0, ["A", "125", "400", "800", "1600", "3200", "6400"]], [-31, 11, -1, ["A", "15", "30", "60", "125", "250", "500"]], [-53, 8, -8, ["0", "+1", "+2", "+3", "C", "−3", "−2", "−1"]]] as const) {
    cylinder(radius, 4, x, 83, z, black, "y");
    cylinder(radius - .4, 3.2, x, 86.5, z, silver, "y");
    knurl(radius, 5, x, 84.5, z, 36, "y");
    cylinder(2.7, 1, x, 88.4, z, black, "y");
    dialFace(radius, x, z, [...values]);
  }
  cylinder(5, 2.5, -50, 83.5, 12, black, "y");
  cylinder(3.4, 1.8, -50, 85.5, 12, chrome, "y");
  cylinder(1.2, .3, -50, 86.5, 12, black, "y");
  cylinder(3.5, 3, -39, 66, 21, rubber);
  cylinder(2, 1.5, 45, 58, 20, chrome);
  cylinder(2, 1.6, 26, 60, 20, new T.MeshStandardMaterial({ color: 0x79261a, roughness: .3 }));

  // Lens is an illustrative compact prime: the user has not specified their lens.
  const lx = 3, ly = 38;
  cylinder(28, 3, lx, ly, 21, chrome);
  cylinder(26.5, 7, lx, ly, 26, black);
  cylinder(25, 31, lx, ly, 44, black);
  cylinder(25.8, 8, lx, ly, 34, rubber);
  knurl(26, 7, lx, ly, 34, 64);
  cylinder(25.3, 12, lx, ly, 52, rubber);
  knurl(25.5, 11, lx, ly, 52, 64);
  torus(24, 1.3, lx, ly, 61, black);
  cylinder(22.6, 1.5, lx, ly, 61, innerGlass);
  cylinder(18.4, .6, lx, ly, 62, glass);
  torus(19, 1.4, lx, ly, 62.3, black);
  torus(23.8, .3, lx, ly, 62.4, chrome);
  label("FUJINON ASPHERICAL LENS", 35, 2.8, lx, ly + 21, 63.3);
  label("SUPER EBC", 19, 2.8, lx, ly - 21, 63.3);
  const reflection = mesh(new T.CircleGeometry(4.5, 20), new T.MeshBasicMaterial({ color: 0x8aa9ab, transparent: true, opacity: .2, depthWrite: false }), lx - 6, ly + 7, 62.5);
  reflection.scale.set(1.3, .45, 1);

  // Rear tilting display and controls remain visible from elevated viewpoints.
  box(77, 46, 3, 0, 36, -21, black, 2);
  const rear = box(69, 38, 1, 0, 36, -23, glass, 1);
  rear.name = "Camera rear LCD";
  box(44, 2, 5, 0, 59.5, -22, chrome, .5);
  for (const [x, y, r] of [[49, 50, 4], [48, 32, 7], [48, 12, 3], [-49, 68, 3], [-35, 68, 3]]) {
    cylinder(r, 2, x, y, -22, black);
  }
  // Small strap lugs and a soft black strap resting beside the body.
  for (const x of [-66, 66]) {
    const lug = torus(3.2, .8, x, 68, 0, chrome);
    lug.rotation.y = Math.PI / 2;
  }
  const strapCurve = new T.CatmullRomCurve3([
    new T.Vector3(66, 67, 0), new T.Vector3(76, 32, 3), new T.Vector3(81, 5, 14),
    new T.Vector3(100, 3, 36), new T.Vector3(117, 3, 19), new T.Vector3(99, 3, -3),
    new T.Vector3(77, 5, -12), new T.Vector3(68, 28, -5), new T.Vector3(66, 67, 0),
  ]);
  mesh(new T.TubeGeometry(strapCurve, 48, 1.7, 5, false), rubber, 0, 0, 0);
  root.userData.cameraModel = "Original procedural Fujifilm X-T5-inspired prop";
  return root;
}
