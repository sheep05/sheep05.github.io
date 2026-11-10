import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createXT5 } from './fujifilm-xt5';
import { batchStatic } from './batch-static';
import { screenSurface } from './screen-surface';

/** Load the original Blender scene and bind its authored interaction anchors. */
export async function loadLounge(assetBase: string, renderer: THREE.WebGLRenderer) {
  const decoder = new DRACOLoader().setDecoderPath(`${assetBase}scene/lounge/draco/`).setWorkerLimit(2);
  let gltf: GLTF;
  try {
    gltf = await new GLTFLoader().setDRACOLoader(decoder).loadAsync(`${assetBase}scene/lounge/sofa-lounge.glb`);
  } finally {
    decoder.dispose();
  }
  const group = gltf.scene;
  group.updateMatrixWorld(true);
  function required(name: string) {
    const object = group.getObjectByName(name);
    if (!object) throw new Error(`Missing lounge anchor: ${name}`);
    return object;
  }
  const world = (name: string) => required(name).getWorldPosition(new THREE.Vector3());
  const surface = screenSurface(world('ScreenTopLeft'), world('ScreenTopRight'), world('ScreenBottomLeft'));
  const screen = required('GalleryScreen') as THREE.Mesh;
  const previousScreenMaterial = screen.material;
  screen.material = new THREE.MeshBasicMaterial({ color: '#0b1116', toneMapped: false });
  for (const material of Array.isArray(previousScreenMaterial) ? previousScreenMaterial : [previousScreenMaterial]) material.dispose();

  const cameraProp = createXT5(THREE);
  batchStatic(cameraProp, []);
  cameraProp.position.copy(world('CameraPropAnchor'));
  cameraProp.rotation.y = .2;
  group.add(cameraProp);
  group.updateMatrixWorld(true);
  function hitBox(name: string, center: THREE.Vector3, size: THREE.Vector3) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial());
    target.name = name;
    target.position.copy(center);
    target.visible = false;
    group.add(target);
    return target;
  }
  const cameraBounds = new THREE.Box3().setFromObject(cameraProp);
  const cameraTarget = hitBox('CameraInspection', cameraBounds.getCenter(new THREE.Vector3()), cameraBounds.getSize(new THREE.Vector3()).addScalar(.07));
  const lampTarget = hitBox('LampSwitch', world('LampTarget'), new THREE.Vector3(.5, .65, .5));
  const windowTarget = hitBox('WindowSwitch', world('WindowTarget'), new THREE.Vector3(.15, 2.3, 3));
  const textures = new Set<THREE.Texture>();
  const curtains: { mesh: THREE.Mesh; base: Float32Array; bottom: number; top: number }[] = [];
  const bakedMaterials = new Set<THREE.MeshStandardMaterial>();
  const glows: { material: THREE.MeshStandardMaterial; intensity: number }[] = [];
  const exteriorGlows = new Map<THREE.MeshStandardMaterial, number>();
  const prints: THREE.Mesh[] = [];
  const shelfMeshes: THREE.Mesh[] = [];
  group.traverse(object => {
    if (object instanceof THREE.Light) object.intensity = 0;
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    object.castShadow = object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          value.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          textures.add(value);
        }
      }
      if (material instanceof THREE.MeshStandardMaterial && material.userData.bakedIrradiance && material.emissiveMap) {
        bakedMaterials.add(material);
      }
      if (material instanceof THREE.MeshStandardMaterial && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0 && /^(ShelfGlow|SofaGlow|Lamp)/.test(object.name)) {
        glows.push({ material, intensity: material.emissiveIntensity });
      }
      if (material instanceof THREE.MeshStandardMaterial && material.name === 'Neighbour window glow') exteriorGlows.set(material, material.emissiveIntensity);
    }
    if (object.name.startsWith('Curtain')) {
      const positions = object.geometry.attributes.position;
      object.geometry.computeBoundingBox();
      curtains.push({ mesh: object, base: new Float32Array(positions.array), bottom: object.geometry.boundingBox!.min.y, top: object.geometry.boundingBox!.max.y });
      object.castShadow = false;
    }
    if (/^GalleryPrint.*photograph/.test(object.name)) prints.push(object);
    if (object.name.startsWith('ShelfGlow') || object.name.startsWith('SofaGlow')) shelfMeshes.push(object);
  });

  // Blender carries the second UV set through glTF's emissive slot. Use it as
  // irradiance here, so wood grain, cloth normals and reflections stay physical.
  const lampBlend = { value: 1 };
  if (bakedMaterials.size) {
    const offMap = await new THREE.TextureLoader().loadAsync(`${assetBase}scene/lounge/lightmap-off.png`);
    offMap.flipY = false;
    offMap.colorSpace = THREE.LinearSRGBColorSpace;
    offMap.channel = 1;
    textures.add(offMap);
    const resized = new Set<THREE.Texture>();
    const atlasLimit = Math.min(renderer.capabilities.maxTextureSize, matchMedia('(pointer: coarse)').matches || innerWidth < 768 ? 2048 : 4096);
    function fitAtlas(texture: THREE.Texture) {
      if (resized.has(texture)) return;
      resized.add(texture);
      const image = texture.image;
      if (image.width <= atlasLimit && image.height <= atlasLimit) return;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = atlasLimit;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, atlasLimit, atlasLimit);
      texture.image = canvas;
      texture.needsUpdate = true;
    }
    fitAtlas(offMap);
    for (const material of bakedMaterials) {
      const onMap = material.emissiveMap!;
      fitAtlas(onMap);
      onMap.colorSpace = THREE.LinearSRGBColorSpace;
      onMap.channel = 1;
      onMap.needsUpdate = true;
      material.lightMap = onMap;
      material.lightMapIntensity = Number(material.userData.lightmapScale || 2);
      material.emissiveMap = null;
      material.emissive.set('#000000');
      material.envMapIntensity = .2;
      material.onBeforeCompile = shader => {
        shader.uniforms.loungeLamp = lampBlend;
        shader.uniforms.loungeUnlit = { value: offMap };
        shader.fragmentShader = `uniform float loungeLamp;\nuniform sampler2D loungeUnlit;\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_maps>',
          THREE.ShaderChunk.lights_fragment_maps.replace('vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );',
            'vec4 lightMapTexel = mix(texture2D(loungeUnlit, vLightMapUv), texture2D(lightMap, vLightMapUv), loungeLamp);'));
      };
      material.customProgramCacheKey = () => 'sofa-lounge-dual-lightmap-v1';
      material.needsUpdate = true;
    }
  }
  const baked = bakedMaterials.size > 0;
  RectAreaLightUniformsLib.init();
  const lighting = new THREE.Group();
  lighting.name = 'Browser lighting';
  const ambient = new THREE.HemisphereLight('#bbc6dd', '#b58c63', .55);
  lighting.add(ambient);
  const lamp = new THREE.PointLight('#ffcb8a', 10, 6, 2);
  lamp.position.copy(world('LampTarget'));
  lamp.position.y += .06;
  lamp.castShadow = !baked;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -.001;
  lamp.shadow.normalBias = .025;
  lamp.shadow.camera.near = .1;
  lamp.shadow.camera.far = 7;
  lighting.add(lamp);
  const windowLight = new THREE.DirectionalLight('#9fb1de', 1.2);
  windowLight.position.copy(world('WindowTarget')).add(new THREE.Vector3(2, 2, 0));
  windowLight.target.position.set(-1, .5, -1);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(2048, 2048);
  Object.assign(windowLight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .1, far: 18 });
  windowLight.shadow.bias = -.0005;
  windowLight.shadow.normalBias = .02;
  lighting.add(windowLight, windowLight.target);
  const shelfLights: THREE.RectAreaLight[] = [];
  for (const mesh of baked ? [] : shelfMeshes) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const light = new THREE.RectAreaLight('#ffd7a1', 5, Math.max(.2, size.x), .1);
    light.position.copy(center).add(new THREE.Vector3(0, -.035, .08));
    light.lookAt(center.clone().add(new THREE.Vector3(0, -.8, .5)));
    lighting.add(light);
    shelfLights.push(light);
  }
  group.add(lighting);
  const sky = new THREE.Color('#111926');
  const daySky = new THREE.Color('#7b8e9b');
  const nightLight = new THREE.Color('#a6b8df');
  const dayLight = new THREE.Color('#ffebd0');
  const windowReflection = new THREE.Color('#263746');
  function mood(day: number, lamps: number) {
    ambient.intensity = (baked ? .12 : .55) + day * .65;
    lampBlend.value = lamps;
    windowLight.color.copy(nightLight).lerp(dayLight, day);
    windowLight.intensity = (baked ? .1 : .8) + day * 2.1;
    lamp.intensity = (baked ? 1 : 10) * lamps;
    shelfLights.forEach(light => { light.intensity = (baked ? 0 : 5) * lamps; });
    glows.forEach(({ material, intensity }) => { material.emissiveIntensity = intensity * lamps; });
    exteriorGlows.forEach((intensity, material) => {
      material.emissiveIntensity = intensity * (1 - day);
      material.color.set('#ffbc74').lerp(windowReflection, day);
    });
    sky.set('#111926').lerp(daySky, day);
  }
  return { group, surface, screen, cameraTarget, lampTarget, windowTarget, curtains, textures, prints, mood, sky,
    overview: world('OverviewCamera'), overviewTarget: world('OverviewTarget') };
}
