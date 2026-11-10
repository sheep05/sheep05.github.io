import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3, PerspectiveCamera, Box3, Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { batchStatic } from '../lib/scene/batch-static.ts';
import { screenSurface, displayContentSize, displayFillDistance, projectDisplay } from '../lib/scene/screen-surface.ts';

const authored = JSON.parse(readFileSync(new URL('../public/scene/lounge/interface.json', import.meta.url)));
const center = new Vector3(...authored.screenCenter);
const up = new Vector3(...authored.screenUp).normalize();
const normal = new Vector3(...authored.screenNormal).normalize();
const right = up.clone().cross(normal);
const topLeft = center.clone().addScaledVector(right, -authored.screenWidth / 2).addScaledVector(up, authored.screenHeight / 2);
const surface = screenSurface(topLeft, topLeft.clone().addScaledVector(right, authored.screenWidth), topLeft.clone().addScaledVector(up, -authored.screenHeight));

test('batching the scaled camera model preserves its physical size and position', () => {
  const prop = new Group();
  prop.scale.setScalar(.003);
  prop.position.set(-2, .44, 1.26);
  const material = new MeshStandardMaterial();
  for (const x of [-50, 50]) {
    const mesh = new Mesh(new BoxGeometry(20, 40, 30), material);
    mesh.position.x = x;
    prop.add(mesh);
  }
  const before = new Box3().setFromObject(prop);
  batchStatic(prop, []);
  const after = new Box3().setFromObject(prop);
  assert.ok(before.min.distanceTo(after.min) < 1e-6 && before.max.distanceTo(after.max) < 1e-6);
});

test('tilted laptop and live gallery remain aligned during zoom on desktop and mobile', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [2560, 1080]]) {
    const camera = new PerspectiveCamera(55, width / height, .015, 80);
    const end = center.clone().addScaledVector(normal, displayFillDistance(surface, camera.aspect, 55));
    const content = displayContentSize(surface, camera.aspect);
    assert.ok(content.width <= authored.screenWidth + 1e-8 && content.height <= authored.screenHeight + 1e-8);
    for (let step = 0; step <= 20; step++) {
      camera.position.lerpVectors(new Vector3(...authored.overviewPosition), end, step / 20);
      camera.up.copy(up);
      camera.lookAt(center);
      const matrix = projectDisplay(surface, camera, width, height);
      for (const [x, y] of [[0, 0], [width, 0], [width, height], [0, height], [width / 3, height / 3]]) {
        const projected = new Vector3(x, y, 0).applyMatrix4(matrix);
        const expected = center.clone().addScaledVector(right, (x / width - .5) * content.width)
          .addScaledVector(up, (.5 - y / height) * content.height).project(camera);
        assert.ok(Math.abs(projected.x - (expected.x + 1) * width / 2) < 1e-6);
        assert.ok(Math.abs(projected.y - (1 - expected.y) * height / 2) < 1e-6);
        if (step === 20) assert.ok(Math.abs(projected.x - x) < 1e-6 && Math.abs(projected.y - y) < 1e-6, 'Final frame must equal full-page gallery');
      }
    }
  }
});

test('authored Blender model supplies required interactive anchors and no remote assets', () => {
  const bytes = readFileSync(new URL('../public/scene/lounge/sofa-lounge.glb', import.meta.url));
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
  const model = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
  assert.ok(bytes.length < 20 * 1024 * 1024, 'Keep the complete room below 20 MiB');
  assert.ok(model.extensionsRequired.includes('KHR_draco_mesh_compression'));
  assert.ok(model.meshes.length < 60, 'Batch fixed furniture and distant buildings');
  let triangles = 0;
  for (const mesh of model.meshes) for (const primitive of mesh.primitives) {
    triangles += model.accessors[primitive.indices].count / 3;
    if (model.materials[primitive.material].extras?.bakedIrradiance) {
      assert.ok(primitive.attributes.TEXCOORD_1 !== undefined, 'Baked materials require a second UV set');
    }
  }
  assert.ok(triangles < 100000, 'Bound the geometry budget independently of file compression');
  const names = new Set(model.nodes.map(node => node.name));
  for (const name of ['GalleryScreen', 'ScreenTopLeft', 'ScreenTopRight', 'ScreenBottomLeft', 'OverviewCamera', 'OverviewTarget', 'CameraPropAnchor', 'LampTarget', 'WindowTarget']) {
    assert.ok(names.has(name), `Missing ${name}`);
  }
  for (const resource of [...model.buffers, ...(model.images || [])]) assert.ok(!resource.uri || !/^https?:/.test(resource.uri), 'Room assets must be self-hosted');
});
