"use client";
import { observeScrollReveal } from "@/lib/scroll-reveal";
import { useEffect, useRef, useState } from "react";
import { atRegion, globePoint, inChapter, regions } from "@/lib/catalog";
import { atlasPixelRatio, globeDiameter } from "@/lib/atlas-quality";
import { loadAtlasTexture } from "@/lib/atlas-assets";
import { atlasPreviewPosition } from "@/lib/atlas-preview";
import type { Album, Photo } from "@/lib/types";

export default function Atlas({ albums, photos, assetBase, selected, onSelect, onExplore }: {
  albums: Album[]; photos: Photo[]; assetBase: string; selected: string | null;
  onSelect: (id: string | null) => void; onExplore: (id: string) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const dragSurface = useRef<HTMLDivElement>(null);
  const previewCard = useRef<HTMLElement | null>(null);
  const pins = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusRegion = useRef<(id: string | null) => void>(() => {});
  const zoom = useRef<(amount: number) => void>(() => {});
  const selection = useRef(selected);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const sceneAlbums = albums.filter(a => inChapter(a, 'scenes'));
  const activeRegion = regions.find(r => r.id === selected);
  const shown = selected ? sceneAlbums.filter(a => atRegion(a, selected)) : sceneAlbums;
  const firstAlbum = shown.find(a => a.photoIds.length);
  const preview = firstAlbum && photos.find(p => p.id === (firstAlbum.coverId || firstAlbum.photoIds[0]));
  const extraRegions = [...new Set(sceneAlbums.flatMap(a => a.regions || []))].filter(id => !regions.some(r => r.id === id));
  useEffect(() => { selection.current = selected; focusRegion.current(selected); }, [selected]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    async function init() {
      try {
        const [T, textureBlob] = await Promise.all([import('three'), loadAtlasTexture(assetBase)]);
        if (disposed || !mount.current || !dragSurface.current) return;
        const host = mount.current;
        const interaction = dragSurface.current;
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(atlasPixelRatio(host.clientWidth,host.clientHeight,devicePixelRatio));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.setClearColor(0x080e13, 0);
        host.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.z = 4.6;
        const earth = new T.Group();
        scene.add(earth);
        const geometry = new T.SphereGeometry(1.25, 160, 96);
        const material = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 5, specular: 0x071018 });
        earth.add(new T.Mesh(geometry, material));
        scene.add(new T.AmbientLight(0xd4e2f2, .85));
        const sun = new T.DirectionalLight(0xfff7ed, 1.7);
        sun.position.set(-3, 3, 5);
        scene.add(sun);
        const rim = new T.Mesh(new T.SphereGeometry(1.285, 64, 40), new T.ShaderMaterial({
          transparent: true, depthWrite: false, blending: T.AdditiveBlending,
          vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
          fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),3.8); gl_FragColor=vec4(0.28,0.52,0.72,rim*0.32); }',
        }));
        scene.add(rim);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const destination = new T.Quaternion();
        let turning = false, dragging = false, pointerId = -1, px = 0, py = 0, last = 0, visible = true, needsRender = true;
        const orient = (lat: number, lon: number) => new T.Quaternion().setFromEuler(new T.Euler(lat*Math.PI/180, -lon*Math.PI/180-Math.PI/2, 0, 'XYZ'));
        earth.quaternion.copy(orient(20, 116));
        focusRegion.current = id => {
          const region = regions.find(r => r.id === id);
          destination.copy(region ? orient(region.lat, region.lon) : orient(20,116));
          turning = true; needsRender = true;
          if (reduced.matches) { earth.quaternion.copy(destination); turning = false; }
        };
        if (selection.current) focusRegion.current(selection.current);
        const updateDragArea = () => {
          const diameter = globeDiameter(host.clientHeight, camera.fov, camera.position.z, 1.25);
          interaction.style.width = interaction.style.height = `${diameter}px`;
        };
        zoom.current = amount => { camera.position.z = Math.max(3.5, Math.min(6.5, camera.position.z + amount)); updateDragArea(); needsRender = true; };
        const resize = () => {
          const w = host.clientWidth, h = host.clientHeight;
          if (!w || !h) return;
          renderer.setPixelRatio(atlasPixelRatio(w,h,devicePixelRatio));
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.fov = camera.aspect < .85 ? 48 : 40;
          camera.updateProjectionMatrix(); updateDragArea(); needsRender = true;
        };
        const ro = new ResizeObserver(resize); ro.observe(host); resize();
        const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; needsRender = true; }); io.observe(host);
        const down = (e: PointerEvent) => {
          if (dragging || e.button !== 0) return;
          dragging = true; turning = false; pointerId = e.pointerId; px = e.clientX; py = e.clientY;
          interaction.setPointerCapture(pointerId); interaction.classList.add('is-dragging');
        };
        const move = (e: PointerEvent) => {
          if (!dragging || e.pointerId !== pointerId) return;
          const dx = (e.clientX-px)*.005, dy = (e.clientY-py)*.005;
          earth.quaternion.premultiply(new T.Quaternion().setFromEuler(new T.Euler(dy,dx,0,'XYZ')));
          px=e.clientX; py=e.clientY; needsRender = true;
        };
        const up = () => { dragging = false; interaction.classList.remove('is-dragging'); };
        const keyboard = (e: KeyboardEvent) => {
          const direction: Record<string, [number,number]> = { ArrowLeft:[0,-.14], ArrowRight:[0,.14], ArrowUp:[-.14,0], ArrowDown:[.14,0] };
          if (!direction[e.key]) return;
          e.preventDefault(); turning=false; needsRender=true;
          earth.quaternion.premultiply(new T.Quaternion().setFromEuler(new T.Euler(...direction[e.key],0,'XYZ')));
        };
        const lost = (e: Event) => { e.preventDefault(); renderer.setAnimationLoop(null); setState('fallback'); };
        interaction.addEventListener('pointerdown', down); interaction.addEventListener('pointermove', move);
        interaction.addEventListener('pointerup', up); interaction.addEventListener('pointercancel', up); interaction.addEventListener('lostpointercapture', up); interaction.addEventListener('keydown', keyboard);
        renderer.domElement.addEventListener('webglcontextlost', lost);
        cleanup = () => {
          renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect();
          interaction.removeEventListener('pointerdown',down); interaction.removeEventListener('pointermove',move);
          interaction.removeEventListener('pointerup',up); interaction.removeEventListener('pointercancel',up); interaction.removeEventListener('lostpointercapture',up); interaction.removeEventListener('keydown',keyboard);
          renderer.domElement.removeEventListener('webglcontextlost',lost);
          scene.traverse(o => {
            const mesh = o as import('three').Mesh;
            mesh.geometry?.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.filter(Boolean).forEach(m => m.dispose());
          });
          material.map?.dispose(); renderer.dispose(); renderer.domElement.remove();
        };
        let activeBitmap:ImageBitmap|null=null;
        const release=cleanup;cleanup=()=>{release();activeBitmap?.close();activeBitmap=null;};
        const limit = renderer.capabilities.maxTextureSize;
        const bitmap = await createImageBitmap(textureBlob, {
          imageOrientation: 'flipY',
          ...(limit < 4096 ? {resizeWidth:limit, resizeHeight:limit / 2} : {}),
        });
        if(disposed){bitmap.close();return;}
        activeBitmap = bitmap;
        const texture=new T.CanvasTexture(activeBitmap);
        texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
        texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
        material.map=texture;material.needsUpdate=true;
        const point = new T.Vector3();
        let firstFrame = true;
        renderer.setAnimationLoop((now: number) => {
          const dt = Math.min((now-last)/1000,.05); last=now;
          if (!visible || document.hidden || (!needsRender && !turning)) return;
          if (turning) {
            earth.quaternion.slerp(destination, 1-Math.exp(-dt*4));
            if (earth.quaternion.angleTo(destination)<.002) turning=false;
          }
          earth.updateMatrixWorld();
          // Project markers with the current camera even before the first render.
          camera.updateMatrixWorld();
          for (const region of regions) {
            const pin=pins.current[region.id]; if (!pin) continue;
            point.fromArray(globePoint(region.lat, region.lon,1.265)).applyQuaternion(earth.quaternion);
            // A marker is visible only when its surface normal faces the camera.
            const facing=point.dot(camera.position.clone().sub(point)) > .12;
            point.project(camera);
            pin.hidden=!facing || Math.abs(point.x)>1 || Math.abs(point.y)>1;
            pin.style.left=`${(point.x*.5+.5)*100}%`; pin.style.top=`${(-point.y*.5+.5)*100}%`;
            const label = pin.querySelector('span');
            const leader = pin.querySelector('line');
            if (label && leader && !pin.hidden) {
              const x = (point.x*.5+.5)*host.clientWidth - 14;
              const y = (-point.y*.5+.5)*host.clientHeight - 14;
              const left = Math.max(6-x, Math.min(region.labelX, host.clientWidth-x-label.offsetWidth-6));
              const top = Math.max(6-y, Math.min(region.labelY, host.clientHeight-y-label.offsetHeight-6));
              label.style.left = `${left}px`; label.style.top = `${top}px`;
              leader.setAttribute('x2', String(left < 14 ? left + label.offsetWidth : left));
              leader.setAttribute('y2', String(top + label.offsetHeight/2));
            }
          }
          const card=previewCard.current;
          if(card) {
            const pin=selection.current ? pins.current[selection.current] : null;
            const label=pin?.querySelector('span');
            card.style.visibility=pin?.hidden?'hidden':'visible';
            if(pin && label && !pin.hidden) {
              const obstacles=[];
              for(const marker of Object.values(pins.current)) {
                if(!marker || marker.hidden)continue;
                const name=marker.querySelector('span');
                if(name)obstacles.push({x:marker.offsetLeft-14+name.offsetLeft,y:marker.offsetTop-14+name.offsetTop,width:name.offsetWidth,height:name.offsetHeight});
                obstacles.push({x:marker.offsetLeft-10,y:marker.offsetTop-10,width:20,height:20});
              }
              const worldRect=host.getBoundingClientRect();
              for(const control of host.parentElement!.querySelectorAll<HTMLElement>('.atlas-tools, .atlas-coordinate')) {
                if(!control.offsetWidth || !control.offsetHeight)continue;
                const rect=control.getBoundingClientRect();
                obstacles.push({x:(rect.left-worldRect.left)*host.clientWidth/worldRect.width,y:(rect.top-worldRect.top)*host.clientHeight/worldRect.height,width:rect.width*host.clientWidth/worldRect.width,height:rect.height*host.clientHeight/worldRect.height});
              }
              const position=atlasPreviewPosition({
                x:pin.offsetLeft-14+label.offsetLeft, y:pin.offsetTop-14+label.offsetTop,
                width:label.offsetWidth,height:label.offsetHeight,
              },{width:card.offsetWidth,height:card.offsetHeight},{width:host.clientWidth,height:host.clientHeight},obstacles);
              card.style.visibility=position?'visible':'hidden';
              if(position){card.style.left=`${position.x}px`;card.style.top=`${position.y}px`;}
            }
          }
          renderer.render(scene,camera);
          if(firstFrame){firstFrame=false;setState('ready');}
          needsRender = regions.some(region => !pins.current[region.id]);
        });
      } catch (error) {
        if (!disposed) { cleanup(); setState('fallback'); console.warn('Atlas uses the accessible region list',error); }
      }
    }
    init();
    return () => { disposed=true; cleanup(); focusRegion.current=()=>{}; zoom.current=()=>{}; };
  }, [assetBase]);

  return <section className="atlas-page">
    <div className="atlas-intro">
      <h1 ref={observeScrollReveal}>ATLAS</h1>
      <div className="atlas-region-list" aria-label="Choose a country">
        {regions.map(region => <button ref={observeScrollReveal} key={region.id} aria-pressed={selected === region.id} onClick={()=>onSelect(region.id)}>
          <span>{region.name}</span><span aria-hidden="true">↗</span>
        </button>)}
        {extraRegions.map(id => <button ref={observeScrollReveal} key={id} aria-pressed={selected===id} onClick={()=>onSelect(id)}><span>{id}</span><span aria-hidden="true">↗</span></button>)}
      </div>
    </div>
    <div ref={observeScrollReveal} className={`atlas-world atlas-${state}`}>
      {state === 'fallback' && <div className="atlas-flat-earth" aria-hidden="true" style={{backgroundImage:`url(${assetBase}atlas/earth-day.jpg)`}}/>}
      <div ref={mount} className="atlas-canvas" aria-hidden="true"/>
      <div ref={dragSurface} className="atlas-drag-surface" role="group" aria-label="Interactive Earth. Drag to rotate, or use the arrow keys. Country buttons are also available in the list." tabIndex={state==='ready'?0:-1} style={{pointerEvents:state==='ready'?'auto':'none'}}/>
      {state==='ready' && <div className="atlas-pins">
        {regions.map(region=><button hidden key={region.id} ref={el=>{pins.current[region.id]=el;}} className={`atlas-pin ${selected===region.id?'selected':''}`} onClick={()=>onSelect(region.id)} aria-label={`Explore ${region.name}`} aria-pressed={selected===region.id}>
          <svg width="28" height="28" aria-hidden="true"><line x1="14" y1="14" x2={region.labelX < 0 ? region.labelX + 70 : region.labelX} y2={region.labelY + 14}/></svg>
          <i/><span style={{left:region.labelX,top:region.labelY}}>{region.name}</span>
        </button>)}
      </div>}
      {selected && (shown.length ? <button ref={el=>{previewCard.current=el;}} style={{visibility:state==='ready'?'hidden':'visible'}} className="atlas-selection" onClick={()=>onExplore(selected)} aria-label={`View photos from ${activeRegion?.name || selected}`}>
        {preview && <img src={preview.thumb} alt=""/>}
        <span className="atlas-selection-copy"><span>{activeRegion?.name || selected}</span>
          <span className="atlas-selection-action">Explore</span>
        </span>
      </button> : <div ref={el=>{previewCard.current=el;}} style={{visibility:state==='ready'?'hidden':'visible'}} className="atlas-selection" role="status">
        <span className="atlas-selection-copy"><span>{activeRegion?.name || selected}</span><small>No collections here yet.</small></span>
      </div>)}
      <div className="atlas-world-footer">
        {state!=='ready' && <span role="status">{state==='loading'?'PREPARING THE EARTH…':'CHOOSE A PLACE FROM THE LIST'}</span>}
        {state==='ready' && <div className="atlas-tools">
          <button aria-label="Zoom in on Earth" onClick={()=>zoom.current(-.4)}>+</button>
          <button aria-label="Zoom out from Earth" onClick={()=>zoom.current(.4)}>−</button>
          <button aria-label="Reset Earth view" onClick={()=>focusRegion.current(null)}>↺</button>
        </div>}
      </div>
      {activeRegion && <span className="atlas-coordinate" aria-hidden="true">{activeRegion.lat.toFixed(2)}° N / {activeRegion.lon.toFixed(2)}° E</span>}
    </div>
  </section>;
}
