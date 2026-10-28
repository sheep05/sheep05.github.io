"use client";
import { useEffect, useRef, useState } from "react";
import sceneConfig from "@/public/scene/scene-metadata.json";
export default function Room({
  assetBase = "/",
  entering,
  onEnter,
  onReady,
  onUnavailable,
  onBegin,
  title,
  featured,
}: {
  assetBase?: string;
  entering: boolean;
  onEnter: () => void;
  onReady: () => void;
  onUnavailable: () => void;
  onBegin: () => void;
  title: string;
  featured: { url: string; title: string }[];
}) {
  const mount = useRef<HTMLDivElement>(null),
    go = useRef<() => void>(() => onEnter());
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const callback = useRef(onEnter);
  callback.current = onEnter;
  const artwork = useRef({ title, featured });
  artwork.current = { title, featured };
  const updateArtwork = useRef(() => {});
  const artworkKey = JSON.stringify(featured);
  useEffect(() => { updateArtwork.current(); }, [title, artworkKey]);
  useEffect(() => {
    let cleanup = () => {},
      disposed = false;
    const modelAbort = new AbortController();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFailed(true);
      onUnavailable();
      return;
    }
    async function init() {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import(
          "three/addons/loaders/GLTFLoader.js"
        );
        if (disposed || !mount.current) return;
        const container = mount.current,
          scene = new THREE.Scene();
        scene.background = new THREE.Color("#28241f");
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
        container.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-hidden", "true");
        const camera = new THREE.PerspectiveCamera(
            sceneConfig.fov,
            1,
            0.05,
            80,
          ),
          start = new THREE.Vector3().fromArray(sceneConfig.camera),
          target = new THREE.Vector3().fromArray(sceneConfig.target);
        camera.position.copy(start);
        camera.lookAt(target);
        const walk = new THREE.CatmullRomCurve3(
          [
            start,
            new THREE.Vector3().fromArray(sceneConfig.standCamera),
            new THREE.Vector3().fromArray(sceneConfig.walkCamera),
            new THREE.Vector3().fromArray(sceneConfig.zoomCamera),
          ],
          false,
          "centripetal",
        );
        scene.add(new THREE.HemisphereLight(0x8294ad, 0x39271c, 0.55));
        const sun = new THREE.DirectionalLight(0xb2c0dc, 0.65);
        sun.position.fromArray(sceneConfig.interiorKeyLight);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, {
          left: -6,
          right: 6,
          top: 6,
          bottom: -6,
          near: 0.1,
          far: 20,
        });
        sun.shadow.bias = -0.0003;
        sun.shadow.normalBias = 0.02;
        sun.shadow.radius = 3;
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0xffbb76, 0.2);
        fill.position.set(2, 2.3, 2);
        scene.add(fill);
        let raf = 0,
          zoomStart = 0,
          animationDone = false,
          hover = false,
          visible = true;
        let object: any = null;
        const curtains: {
          mesh: any;
          base: Float32Array;
          top: number;
          bottom: number;
          phase: number;
        }[] = [];
        const pointer = new THREE.Vector2(),
          raycaster = new THREE.Raycaster();
        const resize = () => {
          const w = container.clientWidth,
            h = container.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.fov = w / h < 1 ? 74 : sceneConfig.fov;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        resize();
        const move = (e: PointerEvent) => {
          if (!object || zoomStart) return;
          const b = container.getBoundingClientRect();
          pointer.set(
            ((e.clientX - b.left) / b.width) * 2 - 1,
            (-(e.clientY - b.top) / b.height) * 2 + 1,
          );
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster
            .intersectObjects(object.children, true)
            .find((hit) => !/shadow/i.test(hit.object.name));
          hover = !!hit && /Laptop/i.test(hit.object.name);
          container.style.cursor = hover ? "pointer" : "default";
        };
        const zoom = () => {
          if (!zoomStart) {
            zoomStart = performance.now();
            onBegin();
          }
        };
        go.current = zoom;
        const click = () => {
          if (hover) zoom();
        };
        container.addEventListener("pointermove", move);
        container.addEventListener("pointerdown", move);
        container.addEventListener("click", click);
        const observer = new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
        });
        observer.observe(container);
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          if (!visible || document.hidden) return;
          if (zoomStart) {
            const t = Math.min((now - zoomStart) / 9500, 1),
              e = (1 - Math.cos(Math.PI * t)) / 2;
            camera.position.copy(walk.getPointAt(e));
            const gait = Math.sin(
              Math.PI * Math.min(1, Math.max(0, (e - 0.12) / 0.76)),
            );
            const phase = e * Math.PI * 8;
            camera.position.x += Math.sin(phase) * 0.018 * gait;
            camera.position.y += Math.sin(phase * 2) * 0.012 * gait;
            const gaze = target
              .clone()
              .lerp(
                new THREE.Vector3().fromArray(sceneConfig.zoomTarget),
                Math.min(1, e / 0.55),
              );
            gaze.x += Math.sin(phase + 0.5) * 0.009 * gait;
            camera.lookAt(gaze);
            camera.rotateZ(Math.sin(phase) * 0.003 * gait);
            const focus = Math.max(0, (e - 0.72) / 0.28);
            const lens = focus * focus * (3 - 2 * focus);
            camera.fov =
              (camera.aspect < 1 ? 74 : sceneConfig.fov) * (1 - lens) +
              40 * lens;
            camera.updateProjectionMatrix();
            if (t === 1 && !animationDone) {
              animationDone = true;
              callback.current();
            }
          }
          for (const curtain of curtains) {
            const positions = curtain.mesh.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              const x = curtain.base[i * 3],
                y = curtain.base[i * 3 + 1],
                z = curtain.base[i * 3 + 2];
              const free = Math.pow(
                Math.max(0, (curtain.top - y) / (curtain.top - curtain.bottom)),
                1.35,
              );
              const breeze =
                Math.sin(now * 0.00065 + z * 1.4 + curtain.phase) * 0.065 +
                Math.sin(now * 0.0011 + y * 1.8 + z * 2) * 0.022;
              positions.setXYZ(
                i,
                x + breeze * free,
                y,
                z + Math.sin(now * 0.0008 + y + curtain.phase) * 0.025 * free,
              );
            }
            positions.needsUpdate = true;
            curtain.mesh.geometry.computeVertexNormals();
          }
          renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(frame);
        cleanup = () => {
          ro.disconnect();
          observer.disconnect();
          cancelAnimationFrame(raf);
          container.removeEventListener("pointermove", move);
          container.removeEventListener("pointerdown", move);
          container.removeEventListener("click", click);
          scene.traverse((obj: any) => {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            mats.filter(Boolean).forEach((m: any) => {
              for (const v of Object.values(m))
                if (v instanceof THREE.Texture) v.dispose();
              m.dispose();
            });
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
        const modelTimeout = setTimeout(
          () => modelAbort.abort(new Error("Studio room timed out")),
          30000,
        );
        let modelBytes: ArrayBuffer;
        try {
          const response = await fetch(`${assetBase}scene/quiet-studio.glb`, {
            signal: modelAbort.signal,
          });
          if (!response.ok) throw new Error("Studio room unavailable");
          modelBytes = await response.arrayBuffer();
        } finally {
          clearTimeout(modelTimeout);
        }
        if (disposed) return;
        const gltf = await new GLTFLoader().parseAsync(
          modelBytes,
          new URL(`${assetBase}scene/`, location.href).href,
        );
        if (disposed) {
          gltf.scene.traverse((o: any) => o.geometry?.dispose());
          return;
        }
        object = gltf.scene;
        object.traverse((o: any) => {
          if (o.isMesh) {
            o.castShadow = !/shadow/i.test(o.name);
            o.receiveShadow = !/shadow/i.test(o.name);
            if (/shadow/i.test(o.name) && o.material)
              o.material.depthWrite = false;
          }
        });
        scene.add(object);
        object.traverse((obj: any) => {
          if (obj.isMesh && /^BreezeCurtain/.test(obj.name)) {
            obj.geometry = obj.geometry.clone();
            obj.geometry.computeBoundingBox();
            curtains.push({
              mesh: obj,
              base: new Float32Array(obj.geometry.attributes.position.array),
              top: obj.geometry.boundingBox.max.y,
              bottom: obj.geometry.boundingBox.min.y,
              phase: curtains.length * 1.3,
            });
            obj.castShadow = false;
            obj.material.side = THREE.DoubleSide;
          }
        });
        for (const position of [
          sceneConfig.deskLampLight,
          sceneConfig.bedsideLampLight,
        ]) {
          const lamp = new THREE.PointLight(0xffb368, 12, 5, 2);
          lamp.position.fromArray(position);
          scene.add(lamp);
        }
        let artworkVersion = 0;
        const replaceMaterial = (mesh: any, material: any) => {
          mesh.material.map?.dispose();
          mesh.material.dispose();
          mesh.material = material;
        };
        updateArtwork.current = () => {
          const version = ++artworkVersion;
          const { title, featured } = artwork.current;
          const screen = object.getObjectByName("LaptopScreen");
          if (screen) {
            const canvas = document.createElement("canvas");
            canvas.width = 1200;
            canvas.height = 750;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#f7f5f0";
            ctx.fillRect(0, 0, 1200, 750);
            ctx.fillStyle = "#35372f";
            ctx.font = "20px Arial";
            ctx.fillText(title.toUpperCase(), 55, 60);
            ctx.font = "13px Arial";
            ctx.fillText("THE COLLECTION", 960, 60);
            ctx.fillStyle = "#d5d4c9";
            ctx.fillRect(55, 88, 1090, 1);
            ctx.fillStyle = "#35372f";
            ctx.font = "64px Georgia";
            ctx.fillText("Collected moments.", 55, 180);
            ctx.font = "15px Arial";
            ctx.fillText(
              "PLACES. PASSING LIGHT. THE MOMENTS IN BETWEEN.",
              55,
              222,
            );
            const texture = new THREE.CanvasTexture(canvas);
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({ map: texture });
            replaceMaterial(screen, material);
            featured.slice(0, 3).forEach((photo, i) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                if (disposed || version !== artworkVersion) return;
                const w = 340,
                  h = 350,
                  x = 55 + i * 375,
                  y = 270;
                const ratio = Math.max(w / img.width, h / img.height);
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();
                ctx.drawImage(
                  img,
                  x + (w - img.width * ratio) / 2,
                  y + (h - img.height * ratio) / 2,
                  img.width * ratio,
                  img.height * ratio,
                );
                ctx.restore();
                ctx.fillStyle = "#35372f";
                ctx.font = "20px Georgia";
                ctx.fillText(photo.title.slice(0, 26), x, 660);
                texture.needsUpdate = true;
              };
              img.src = photo.url;
            });
          }
          let frameIndex = 0;
          object.traverse((obj: any) => {
            if (obj.isMesh && obj.name.endsWith("print")) {
              const photo = featured[frameIndex++ % Math.max(1, featured.length)];
              if (photo)
                new THREE.TextureLoader().load(photo.url, (texture) => {
                  if (disposed || version !== artworkVersion) {
                    texture.dispose();
                    return;
                  }
                  texture.flipY = false;
                  texture.colorSpace = THREE.SRGBColorSpace;
                  replaceMaterial(obj, new THREE.MeshBasicMaterial({ map: texture }));
                });
              else
                replaceMaterial(obj, new THREE.MeshStandardMaterial({
                  color: 0xdad6c9,
                  roughness: 1,
                }));
            }
          });
        };
        updateArtwork.current();
        setReady(true);
        onReady();
      } catch (e) {
        if (disposed) return;
        console.error("Studio scene unavailable", e);
        setFailed(true);
        onUnavailable();
        cleanup();
      }
    }
    init();
    return () => {
      disposed = true;
      modelAbort.abort();
      updateArtwork.current = () => {};
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (entering) {
      if (ready) go.current();
      else if (failed) callback.current();
    }
  }, [entering, ready, failed]);
  return (
    <div className={`room ${ready ? "room-ready" : ""}`}>
      <img
        className="room-poster"
        src={`${assetBase}scene/studio-preview.jpg`}
        alt="A warm, dim photography room viewed from the bed, with soft curtains and a glowing laptop"
        fetchPriority="high"
      />
      <div ref={mount} className="room-canvas" />
      {!ready && !failed && (
        <span className="room-loading">
          Opening the studio<span> …</span>
        </span>
      )}
    </div>
  );
}
