"use client";
import { useEffect, useRef, useState, type RefObject } from 'react';
import { easeStudy, ENTER_SECONDS, type StudyStage } from '@/lib/scene/study-state';
import type { loadLounge } from '@/lib/scene/lounge';

type Props = {
  assetBase?: string;
  gallerySurface: RefObject<HTMLDivElement | null>;
  onEnter: () => void;
  onWake: () => void;
  onStage: (stage: StudyStage) => void;
  featured: { url: string; title: string }[];
};

export default function Room(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<StudyStage>('overview');
  const state = useRef({ stage: 'overview' as StudyStage, day: false, lamp: true });
  const commands = useRef({ begin: () => {}, inspect: () => {}, redraw: () => {} });
  function changeStage(next: StudyStage) {
    state.current.stage = next;
    setStage(next);
    live.current.onStage(next);
  }
  useEffect(() => { commands.current.redraw(); }, [JSON.stringify(props.featured)]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const timeout = setTimeout(() => {
      if (disposed) return;
      disposed = true;
      cleanup();
      setFailed(true);
    }, 30000);
    async function initialize() {
      try {
        const [THREE, { loadLounge }, { projectDisplay, displayFillDistance }, { RoomEnvironment }] = await Promise.all([
          import('three'), import('@/lib/scene/lounge'), import('@/lib/scene/screen-surface'),
          import('three/addons/environments/RoomEnvironment.js'),
        ]);
        if (disposed || !mount.current) return;
        const container = mount.current;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .95;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        container.appendChild(renderer.domElement);
        const camera = new THREE.PerspectiveCamera(48, 1, .015, 80);
        let room: Awaited<ReturnType<typeof loadLounge>> | undefined;
        let frameId = 0;
        let environment: import('three').WebGLRenderTarget | undefined;
        const textures = new Set<import('three').Texture>();
        function freeResources() {
          cancelAnimationFrame(frameId);
          const geometries = new Set<import('three').BufferGeometry>();
          const materials = new Set<import('three').Material>();
          scene.traverse(object => {
            const mesh = object as import('three').Mesh;
            if (mesh.geometry) geometries.add(mesh.geometry);
            if (mesh.material) {
              for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
            }
          });
          materials.forEach(material => {
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
            material.dispose();
          });
          room?.textures.forEach(texture => textures.add(texture));
          textures.forEach(texture => texture.dispose());
          geometries.forEach(geometry => geometry.dispose());
          environment?.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        }
        cleanup = freeResources;
        room = await loadLounge(live.current.assetBase || '/', renderer);
        scene.add(room.group);
        if (disposed) { freeResources(); return; }
        const lounge = room;
        scene.background = lounge.sky;
        const environmentScene = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        try {
          environment = pmrem.fromScene(environmentScene, .03);
          scene.environment = environment.texture;
          scene.environmentIntensity = .22;
        } finally {
          environmentScene.dispose();
          pmrem.dispose();
        }
        camera.position.copy(lounge.overview);
        camera.lookAt(lounge.overviewTarget);
        const homeRotation = camera.quaternion.clone();
        const printMaterials = lounge.prints.map(print => {
          const material = print.material as import('three').MeshStandardMaterial;
          print.material = material;
          return material;
        });
        const artworkTextures: (import('three').Texture | undefined)[] = [];
        let artworkVersion = 0;
        function updateArtwork() {
          const version = ++artworkVersion;
          live.current.featured.slice(0, lounge.prints.length).forEach((photo, index) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
              if (disposed || version !== artworkVersion) return;
              const texture = new THREE.Texture(image);
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.flipY = false;
              texture.needsUpdate = true;
              textures.add(texture);
              const previous = artworkTextures[index];
              previous?.dispose();
              if (previous) textures.delete(previous);
              artworkTextures[index] = texture;
              const material = printMaterials[index];
              material.map = texture;
              material.color.set('#ffffff');
              material.needsUpdate = true;
            };
            image.src = photo.url;
          });
        }
        commands.current.redraw = updateArtwork;
        updateArtwork();
        const startPosition = camera.position.clone();
        const startRotation = camera.quaternion.clone();
        const destination = new THREE.Vector3();
        const endRotation = new THREE.Quaternion();
        const look = new THREE.Matrix4();
        const modelCenter = lounge.cameraTarget.position.clone();
        const modelAngle = new THREE.Vector3(.18, .32, 1).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        let elapsed = 0;
        let startFov = camera.fov;
        let woke = false;
        function startMove(next: StudyStage) {
          startPosition.copy(camera.position);
          startRotation.copy(camera.quaternion);
          startFov = camera.fov;
          elapsed = 0;
          changeStage(next);
        }
        function begin() {
          if (state.current.stage !== 'overview') return;
          if (reduced) { live.current.onEnter(); return; }
          startMove('entering');
        }
        function inspect() {
          if (state.current.stage === 'overview') startMove('inspecting');
          else if (state.current.stage === 'inspecting') startMove('returning');
        }
        commands.current.begin = begin;
        commands.current.inspect = inspect;
        function homeFov() {
          // Preserve a useful horizontal view of the room on narrow screens.
          return camera.aspect < 1 ? Math.min(116, 2 * Math.atan(Math.tan(48 * Math.PI / 360) * 1.6 / camera.aspect) * 180 / Math.PI) : 46;
        }
        function resize() {
          const width = container.clientWidth;
          const height = container.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          if (state.current.stage === 'overview') camera.fov = homeFov();
          camera.updateProjectionMatrix();
        }
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();
        let visible = true;
        const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
        visibilityObserver.observe(container);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const targets = [lounge.screen, lounge.cameraTarget, lounge.lampTarget, lounge.windowTarget];
        function hit(x: number, y: number) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          return raycaster.intersectObjects(targets, true)[0]?.object;
        }
        function click(event: MouseEvent) {
          if (state.current.stage === 'inspecting') { inspect(); return; }
          if (state.current.stage !== 'overview') return;
          const target = hit(event.clientX, event.clientY);
          if (target === lounge.screen) begin();
          if (target === lounge.cameraTarget) inspect();
          if (target === lounge.windowTarget) state.current.day = !state.current.day;
          if (target === lounge.lampTarget) state.current.lamp = !state.current.lamp;
        }
        function hover(event: PointerEvent) {
          const interactive = state.current.stage === 'inspecting' || (state.current.stage === 'overview' && hit(event.clientX, event.clientY));
          renderer.domElement.style.cursor = interactive ? 'pointer' : 'default';
        }
        function contextLost(event: Event) {
          event.preventDefault();
          if (disposed) return;
          disposed = true;
          cleanup();
          setFailed(true);
          setReady(false);
        }
        renderer.domElement.addEventListener('click', click);
        renderer.domElement.addEventListener('pointermove', hover);
        renderer.domElement.addEventListener('webglcontextlost', contextLost);
        cleanup = () => {
          resizeObserver.disconnect();
          visibilityObserver.disconnect();
          renderer.domElement.removeEventListener('click', click);
          renderer.domElement.removeEventListener('pointermove', hover);
          renderer.domElement.removeEventListener('webglcontextlost', contextLost);
          freeResources();
        };
        let previous = performance.now();
        let daylight = 0;
        let lamplight = 1;
        let frameNumber = 0;
        function frame(now: number) {
          frameId = requestAnimationFrame(frame);
          const dt = Math.min((now - previous) / 1000, .1);
          previous = now;
          if (!visible || document.hidden) return;
          const current = state.current.stage;
          if (current !== 'overview') {
            const duration = current === 'entering' ? ENTER_SECONDS : 1.35;
            elapsed = Math.min(duration, reduced ? duration : elapsed + dt);
            const progress = easeStudy(elapsed / duration);
            let endFov = homeFov();
            if (current === 'entering') {
              endFov = 55;
              destination.copy(lounge.surface.center).addScaledVector(lounge.surface.normal, displayFillDistance(lounge.surface, camera.aspect, endFov));
              endRotation.setFromRotationMatrix(look.lookAt(destination, lounge.surface.center, lounge.surface.up));
              if (progress > .84 && !woke) { woke = true; live.current.onWake(); }
            } else if (current === 'inspecting') {
              endFov = 36;
              destination.copy(modelCenter).addScaledVector(modelAngle, Math.max(.53, .7 / camera.aspect));
              endRotation.setFromRotationMatrix(look.lookAt(destination, modelCenter, worldUp));
            } else {
              destination.copy(lounge.overview);
              endRotation.copy(homeRotation);
            }
            camera.position.lerpVectors(startPosition, destination, progress);
            camera.quaternion.slerpQuaternions(startRotation, endRotation, progress);
            camera.fov = startFov + (endFov - startFov) * progress;
            camera.updateProjectionMatrix();
            if (current === 'returning' && elapsed === duration) changeStage('overview');
          }
          const speed = reduced ? 1 : 1 - Math.exp(-dt * 2.1);
          daylight += (Number(state.current.day) - daylight) * speed;
          lamplight += (Number(state.current.lamp) - lamplight) * speed;
          lounge.mood(daylight, lamplight);
          scene.environmentIntensity = .22 + daylight * .18;
          if (!reduced) lounge.curtains.forEach(({ mesh, base, top, bottom }, index) => {
            const positions = mesh.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              const y = base[i * 3 + 1];
              const free = Math.pow(Math.max(0, (top - y) / Math.max(.01, top - bottom)), 1.5);
              positions.setX(i, base[i * 3] + Math.sin(now * .0007 + y * 2 + index) * .035 * free);
            }
            positions.needsUpdate = true;
            if (frameNumber % 6 === 0) mesh.geometry.computeVertexNormals();
          });
          frameNumber++;
          renderer.render(scene, camera);
          const surface = live.current.gallerySurface.current;
          if (surface) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            surface.style.width = `${width}px`;
            surface.style.height = `${height}px`;
            surface.style.transform = `matrix3d(${projectDisplay(lounge.surface, camera, width, height).elements.join(',')})`;
            surface.style.visibility = current === 'inspecting' || current === 'returning' ? 'hidden' : 'visible';
          }
          if (current === 'entering' && elapsed >= ENTER_SECONDS) {
            cancelAnimationFrame(frameId);
            live.current.onEnter();
          }
        }
        renderer.shadowMap.needsUpdate = true;
        frameId = requestAnimationFrame(frame);
        clearTimeout(timeout);
        setReady(true);
      } catch (error) {
        if (disposed) return;
        clearTimeout(timeout);
        cleanup();
        console.error('Lounge unavailable', error);
        setFailed(true);
      }
    }
    initialize();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      commands.current = { begin: () => {}, inspect: () => {}, redraw: () => {} };
      cleanup();
    };
  }, []);
  return <div className={`room study-room lounge-room ${ready ? 'room-ready' : ''} study-${stage}`}>
    <div className="study-fallback" aria-hidden="true" style={{ backgroundImage: `url(${props.assetBase || '/'}scene/lounge/preview.jpg)` }} />
    <div ref={mount} className="room-canvas" />
    <div className="study-actions">
      {failed ? <button onClick={props.onEnter}>Open gallery ↗</button> :
        ready && stage === 'overview' ? <>
          <button onClick={() => commands.current.begin()}>Open laptop ↗</button>
          <button onClick={() => commands.current.inspect()}>Inspect camera</button>
        </> : stage === 'inspecting' ? <>
          <span>Fujifilm X-T5</span>
          <button onClick={() => commands.current.inspect()}>Back to room ↩</button>
        </> : stage === 'entering' ? <button onClick={props.onEnter}>Skip zoom ↗</button> : !ready ? <button onClick={props.onEnter}>Open gallery ↗</button> : null}
    </div>
    {!ready && !failed && <span className="room-loading">Opening the room…</span>}
    {failed && <p className="study-unavailable">The 3D room is unavailable on this device. You can enter the gallery directly.</p>}
  </div>;
}
