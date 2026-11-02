"use client";
import { useEffect, useRef, useState } from "react";
import { atRegion, globePoint, inChapter, regions } from "@/lib/catalog";
import type { Album, Photo } from "@/lib/types";

export default function Atlas({ albums, photos, assetBase, selected, onSelect, onAlbum, onAll }: {
  albums: Album[]; photos: Photo[]; assetBase: string; selected: string | null;
  onSelect: (id: string | null) => void; onAlbum: (id: string) => void; onAll: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const pins = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusRegion = useRef<(id: string | null) => void>(() => {});
  const zoom = useRef<(amount: number) => void>(() => {});
  const selection = useRef(selected);
  selection.current = selected;
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const sceneAlbums = albums.filter(a => inChapter(a, 'scenes'));
  const activeRegion = regions.find(r => r.id === selected);
  const shown = selected ? sceneAlbums.filter(a => atRegion(a, selected)) : sceneAlbums;
  const firstAlbum = shown.find(a => a.photoIds.length);
  const preview = firstAlbum && photos.find(p => p.id === (firstAlbum.coverId || firstAlbum.photoIds[0]));
  const extraRegions = [...new Set(sceneAlbums.flatMap(a => a.regions || []))].filter(id => !regions.some(r => r.id === id));
  useEffect(() => { focusRegion.current(selected); }, [selected]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const abort = new AbortController();
    async function init() {
      try {
        const T = await import('three');
        if (disposed || !mount.current) return;
        const host = mount.current;
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.setClearColor(0x080e13, 0);
        host.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.z = 4.6;
        const earth = new T.Group();
        scene.add(earth);
        const geometry = new T.SphereGeometry(1.25, 80, 48);
        const material = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 9, specular: 0x192c35 });
        earth.add(new T.Mesh(geometry, material));
        scene.add(new T.AmbientLight(0xa6b9ce, 1.4));
        const sun = new T.DirectionalLight(0xfff0db, 2.5);
        sun.position.set(-3, 3, 5);
        scene.add(sun);
        const rim = new T.Mesh(new T.SphereGeometry(1.285, 64, 40), new T.ShaderMaterial({
          transparent: true, depthWrite: false, blending: T.AdditiveBlending,
          vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
          fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),3.8); gl_FragColor=vec4(0.28,0.52,0.72,rim*0.55); }',
        }));
        scene.add(rim);
        // Deterministic star positions; no extra texture or remote runtime requests.
        const stars = new Float32Array(210 * 3);
        for (let i = 0; i < 210; i++) {
          const u = ((i * 0.61803398875) % 1), v = ((i * 0.41421356237) % 1);
          stars[i*3] = (u - .5) * 20; stars[i*3+1] = (v - .5) * 14; stars[i*3+2] = -5 - (i % 7);
        }
        const starGeometry = new T.BufferGeometry();
        starGeometry.setAttribute('position', new T.BufferAttribute(stars, 3));
        scene.add(new T.Points(starGeometry, new T.PointsMaterial({ color: 0xbbb7a5, size: .014, transparent: true, opacity: .55 })));
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
        zoom.current = amount => { camera.position.z = Math.max(3.5, Math.min(6.5, camera.position.z + amount)); needsRender = true; };
        const resize = () => {
          const w = host.clientWidth, h = host.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.fov = camera.aspect < .85 ? 48 : 40;
          camera.updateProjectionMatrix(); needsRender = true;
        };
        const ro = new ResizeObserver(resize); ro.observe(host); resize();
        const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; needsRender = true; }); io.observe(host);
        const down = (e: PointerEvent) => {
          if (dragging || e.button !== 0) return;
          dragging = true; turning = false; pointerId = e.pointerId; px = e.clientX; py = e.clientY;
          host.setPointerCapture(pointerId); host.classList.add('is-dragging');
        };
        const move = (e: PointerEvent) => {
          if (!dragging || e.pointerId !== pointerId) return;
          const dx = (e.clientX-px)*.005, dy = (e.clientY-py)*.005;
          earth.quaternion.premultiply(new T.Quaternion().setFromEuler(new T.Euler(dy,dx,0,'XYZ')));
          px=e.clientX; py=e.clientY; needsRender = true;
        };
        const up = () => { dragging = false; host.classList.remove('is-dragging'); };
        const keyboard = (e: KeyboardEvent) => {
          const direction: Record<string, [number,number]> = { ArrowLeft:[0,-.14], ArrowRight:[0,.14], ArrowUp:[-.14,0], ArrowDown:[.14,0] };
          if (!direction[e.key]) return;
          e.preventDefault(); turning=false; needsRender=true;
          earth.quaternion.premultiply(new T.Quaternion().setFromEuler(new T.Euler(...direction[e.key],0,'XYZ')));
        };
        const lost = (e: Event) => { e.preventDefault(); renderer.setAnimationLoop(null); setState('fallback'); };
        host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
        host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('lostpointercapture', up); host.addEventListener('keydown', keyboard);
        renderer.domElement.addEventListener('webglcontextlost', lost);
        cleanup = () => {
          renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect();
          host.removeEventListener('pointerdown',down); host.removeEventListener('pointermove',move);
          host.removeEventListener('pointerup',up); host.removeEventListener('pointercancel',up); host.removeEventListener('lostpointercapture',up); host.removeEventListener('keydown',keyboard);
          renderer.domElement.removeEventListener('webglcontextlost',lost);
          scene.traverse(o => {
            const mesh = o as import('three').Mesh;
            mesh.geometry?.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.filter(Boolean).forEach(m => m.dispose());
          });
          material.map?.dispose(); renderer.dispose(); renderer.domElement.remove();
        };
        const timeout = setTimeout(() => abort.abort(), 15000);
        let bitmap: ImageBitmap;
        try {
          const response = await fetch(`${assetBase}atlas/earth-day.jpg`, { signal: abort.signal });
          if (!response.ok) throw new Error('Earth texture unavailable');
          bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY' });
        } finally { clearTimeout(timeout); }
        if (disposed) { bitmap.close(); return; }
        const texture = new T.CanvasTexture(bitmap);
        texture.colorSpace = T.SRGBColorSpace; material.map = texture; material.needsUpdate = true;
        const release = cleanup; cleanup = () => { release(); bitmap.close(); };
        const point = new T.Vector3();
        renderer.setAnimationLoop((now: number) => {
          const dt = Math.min((now-last)/1000,.05); last=now;
          if (!visible || document.hidden || (!needsRender && !turning)) return;
          if (turning) {
            earth.quaternion.slerp(destination, 1-Math.exp(-dt*4));
            if (earth.quaternion.angleTo(destination)<.002) turning=false;
          }
          earth.updateMatrixWorld();
          for (const region of regions) {
            const pin=pins.current[region.id]; if (!pin) continue;
            point.fromArray(globePoint(region.lat, region.lon,1.265)).applyQuaternion(earth.quaternion);
            // A marker is visible only when its surface normal faces the camera.
            const facing=point.dot(camera.position.clone().sub(point)) > .12;
            point.project(camera);
            pin.hidden=!facing || Math.abs(point.x)>1 || Math.abs(point.y)>1;
            pin.style.left=`${(point.x*.5+.5)*100}%`; pin.style.top=`${(-point.y*.5+.5)*100}%`;
          }
          renderer.render(scene,camera);
          needsRender = regions.some(region => !pins.current[region.id]);
        });
        setState('ready');
      } catch (error) {
        if (!disposed) { cleanup(); setState('fallback'); console.warn('Atlas uses the accessible region list',error); }
      }
    }
    init();
    return () => { disposed=true; abort.abort(); cleanup(); focusRegion.current=()=>{}; zoom.current=()=>{}; };
  }, [assetBase]);

  return <section className="atlas-page">
    <div className="atlas-intro">
      <div className="atlas-kicker"><span>01 / SCENES</span><span>FIELD NOTES FROM EARTH</span></div>
      <h1>A personal<br/><em>atlas.</em></h1>
      <p>Some places become part of us.<br/>These are a few of mine.</p>
      <div className="atlas-region-list" aria-label="Choose a country">
        {regions.map((region,i) => <button key={region.id} aria-pressed={selected === region.id} onClick={()=>onSelect(region.id)}>
          <span className="region-number">0{i+1}</span><span>{region.name}</span>
          <small>{sceneAlbums.filter(a=>atRegion(a,region.id)).length.toString().padStart(2,'0')}</small><span aria-hidden="true">↗</span>
        </button>)}
        {extraRegions.map(id => <button key={id} aria-pressed={selected===id} onClick={()=>onSelect(id)}><span>{id}</span><span>↗</span></button>)}
      </div>
      <button className="atlas-all-link" onClick={()=>onSelect(null)}>All Scenes collections ↗</button>
    </div>
    <div className={`atlas-world atlas-${state}`}>
      <div className="atlas-orbit orbit-one" aria-hidden="true"/><div className="atlas-orbit orbit-two" aria-hidden="true"/>
      {state !== 'ready' && <div className="atlas-flat-earth" aria-hidden="true" style={{backgroundImage:`url(${assetBase}atlas/earth-day.jpg)`}}/>}
      <div ref={mount} className="atlas-canvas" role="group" aria-label="Interactive Earth. Drag to rotate, or use the arrow keys. Country buttons are also available in the list." tabIndex={state==='ready'?0:-1}/>
      {state==='ready' && <div className="atlas-pins">
        {regions.map(region=><button hidden key={region.id} ref={el=>{pins.current[region.id]=el;}} className={`atlas-pin ${selected===region.id?'selected':''}`} onClick={()=>onSelect(region.id)} aria-label={`Explore ${region.name}`} aria-pressed={selected===region.id}>
          <svg width="28" height="28" aria-hidden="true"><line x1="14" y1="14" x2={region.labelX < 0 ? region.labelX + 70 : region.labelX} y2={region.labelY + 14}/></svg>
          <i/><span style={{left:region.labelX,top:region.labelY}}>{region.name}</span>
        </button>)}
      </div>}
      {selected && <div className="atlas-selection">
        {preview && <img src={preview.thumb} alt=""/>}
        <div><span>{activeRegion?.name || selected}</span>
          {shown.length ? <button onClick={()=>{
            document.getElementById('atlas-collections')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
            document.getElementById('atlas-collection-title')?.focus({preventScroll:true});
          }}>Explore {shown.length} collection{shown.length===1?'':'s'} ↗</button> : <small>No collections here yet.</small>}
        </div>
      </div>}
      <div className="atlas-world-footer">
        <span role="status">{state==='ready'?'DRAG TO EXPLORE · SELECT A PLACE':state==='loading'?'PREPARING THE EARTH…':'CHOOSE A PLACE FROM THE LIST'}</span>
        {state==='ready' && <div className="atlas-tools">
          <button aria-label="Zoom in on Earth" onClick={()=>zoom.current(-.4)}>+</button>
          <button aria-label="Zoom out from Earth" onClick={()=>zoom.current(.4)}>−</button>
          <button aria-label="Reset Earth view" onClick={()=>focusRegion.current(null)}>↺</button>
        </div>}
      </div>
      <span className="atlas-coordinate" aria-hidden="true">{activeRegion ? `${activeRegion.lat.toFixed(2)}° N / ${activeRegion.lon.toFixed(2)}° E` : 'A WORLD TO RETURN TO'}</span>
    </div>
    <div id="atlas-collections" className="atlas-collections" aria-live="polite">
      <div className="atlas-collections-heading"><div><p className="eyebrow">{selected?'THE PLACES IN BETWEEN':'THE SCENES ARCHIVE'}</p><h2 id="atlas-collection-title" tabIndex={-1}>{activeRegion?.name || selected || 'Across the atlas'}<sup>{shown.length.toString().padStart(2,'0')}</sup></h2></div>
        <button onClick={onAll}>All collections ↗</button>
      </div>
      {shown.length ? <div className="atlas-album-grid">{shown.map(album=>{
        const photo=photos.find(p=>p.id===(album.coverId || album.photoIds[0]));
        return <button className="atlas-album" key={album.id} onClick={()=>onAlbum(album.id)}>
          <div>{photo?<img src={photo.thumb} alt={photo.alt||photo.title} loading="lazy"/>:<span>Photographs to come</span>}</div>
          <small>{album.photoIds.length} PHOTOGRAPHS <span>↗</span></small><h3>{album.title}</h3><p>{album.description}</p>
        </button>;
      })}</div> : <div className="atlas-empty"><p>No collections here yet.</p><span>{selected ? 'This part of the journey is still taking shape.' : 'New places will appear here as the archive grows.'}</span><button onClick={onAll}>Explore all collections ↗</button></div>}
    </div>
  </section>;
}
