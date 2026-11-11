"use client";
import {updateStudyLighting} from '@/lib/scene/study-lighting';
import {animateCurtains} from '@/lib/scene/animate-curtains';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { easeStudy, ENTER_SECONDS, overviewPosition, overviewTarget, screenPosition, screenFillDistance, type StudyStage } from '@/lib/scene/study-state';

type Props = {
  gallerySurface: RefObject<HTMLDivElement | null>;
  onEnter: () => void;
  onWake: () => void;
  onStage: (stage: StudyStage) => void;
  featured: { url: string; title: string }[];
};
export default function Room(props: Props) {
  const mount=useRef<HTMLDivElement>(null);
  const live=useRef(props);live.current=props;
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [stage,setStage]=useState<StudyStage>('overview');
  const state=useRef({stage:'overview' as StudyStage,day:false,lamp:true});
  const commands=useRef({begin:()=>{},inspect:()=>{},redraw:()=>{}});
  const changeStage=(next:StudyStage)=>{state.current.stage=next;setStage(next);live.current.onStage?.(next);};
  const toggleLamp=()=>{state.current.lamp=!state.current.lamp;};
  const toggleDay=()=>{state.current.day=!state.current.day;};
  useEffect(()=>{commands.current.redraw();},[JSON.stringify(props.featured)]);
  useEffect(()=>{
    let disposed=false, cleanup=()=>{};
    const release=()=>{const clean=cleanup;cleanup=()=>{};clean();};
    const loadTimeout=setTimeout(()=>{if(disposed)return;disposed=true;release();setFailed(true);},20000);
    async function init(){
      try{
        const [THREE,{buildStudy},{batchStatic},{RoomEnvironment},{galleryProjection},{prepareStudyMaterials,applyStudyMaterials}]=await Promise.all([import('three'),import('@/lib/scene/study-room'),import('@/lib/scene/batch-static'),import('three/addons/environments/RoomEnvironment.js'),import('@/lib/scene/gallery-projection'),import('@/lib/scene/study-materials')]);
        if(disposed||!mount.current)return;
        const container=mount.current, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scene=new THREE.Scene();scene.background=new THREE.Color('#111820');
        const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
        renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
        const camera=new THREE.PerspectiveCamera(70,1,.035,65);
        camera.position.fromArray(overviewPosition);camera.lookAt(new THREE.Vector3(...overviewTarget));
        let environment:import('three').WebGLRenderTarget|undefined;
        const materialAbort=new AbortController();
        let enhanceTimer:ReturnType<typeof setTimeout>|undefined,materialDeadline:ReturnType<typeof setTimeout>|undefined;
        let raf=0;let study:ReturnType<typeof buildStudy>|undefined;
        const ownedTextures=new Set<import('three').Texture>();
        const resources=()=>{
          materialAbort.abort();clearTimeout(enhanceTimer);clearTimeout(materialDeadline);
          cancelAnimationFrame(raf);
          const geometries=new Set<import('three').BufferGeometry>(),materials=new Set<import('three').Material>();
          scene.traverse(o=>{const m=o as import('three').Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(a=>materials.add(a));});
          materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)ownedTextures.add(v);});m.dispose();});
          study?.textures.forEach(t=>ownedTextures.add(t));ownedTextures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
          environment?.dispose();renderer.dispose();renderer.domElement.remove();
        };
        cleanup=resources;
        const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
        try{environment=pmrem.fromScene(environmentScene,.04);scene.environment=environment.texture;scene.environmentIntensity=.22;}finally{environmentScene.dispose();pmrem.dispose();}
        study=buildStudy(scene);
        const room=study;
        const materialPlan=prepareStudyMaterials(scene);
        batchStatic(scene,[room.screen,room.cameraTarget,...room.keys,room.lampTarget,room.windowTarget,...room.prints,...room.curtains.map(c=>c.mesh)]);
        let artworkVersion=0;
        const updateArtwork=()=>{
          const version=++artworkVersion;
          live.current.featured.slice(0,room.prints.length).forEach((photo,i)=>{
            const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
              if(disposed||version!==artworkVersion)return;
              const ratio=image.width/image.height;const target=room.prints[i];
              const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;ownedTextures.add(texture);
              const targetRatio=(target.geometry as import('three').PlaneGeometry).parameters.width/(target.geometry as import('three').PlaneGeometry).parameters.height;
              if(ratio>targetRatio){texture.repeat.x=targetRatio/ratio;texture.offset.x=(1-texture.repeat.x)/2;}else{texture.repeat.y=ratio/targetRatio;texture.offset.y=(1-texture.repeat.y)/2;}
              const material=target.material as import('three').MeshStandardMaterial;
              if(material.map){material.map.dispose();ownedTextures.delete(material.map);}material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;
            };image.src=photo.url;
          });
        };
        commands.current.redraw=updateArtwork;updateArtwork();
        const home = new THREE.Vector3(...overviewPosition);
        const homeGaze = new THREE.Vector3(...overviewTarget);
        const screenAt = new THREE.Vector3(...screenPosition);
        const modelAt = room.cameraTarget.position.clone();
        const modelAngle = new THREE.Vector3(-.32, .32, 1).normalize();
        const gaze = homeGaze.clone(), startPosition = home.clone(), startGaze = homeGaze.clone();
        const destination = new THREE.Vector3(), endGaze = new THREE.Vector3();
        let elapsed = 0, startFov = camera.fov, woke = false;
        let previous=performance.now(),visible=true,daylight=0,lamplight=1;
        const startMove = (next: StudyStage) => {
          startPosition.copy(camera.position);
          startGaze.copy(gaze);
          startFov = camera.fov;
          elapsed = 0;
          changeStage(next);
        };
        const begin = () => {
          if (state.current.stage !== 'overview') return;
          materialAbort.abort();clearTimeout(enhanceTimer);
          if (reduced) { live.current.onEnter(); return; }
          startMove('entering');
        };
        const inspect = () => {
          if (state.current.stage === 'overview') startMove('inspecting');
          else if (state.current.stage === 'inspecting') startMove('returning');
        };
        commands.current.begin = begin;
        commands.current.inspect = inspect;
        const resize = () => {
          const w=container.clientWidth,h=container.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w,h); camera.aspect=w/h;
          if (state.current.stage==='overview') camera.fov=w<h?84:70;
          camera.updateProjectionMatrix();
        };
        const ro=new ResizeObserver(resize);ro.observe(container);resize();
        const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
        const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
        const hit=(x:number,y:number)=>{
          const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
          return raycaster.intersectObjects([room.screen,room.cameraTarget,room.lampTarget,room.windowTarget],true)[0]?.object;
        };
        const click = (e: MouseEvent) => {
          if (state.current.stage === 'inspecting') { inspect(); return; }
          if (state.current.stage !== 'overview') return;
          const target = hit(e.clientX,e.clientY);
          if (target === room.screen) begin();
          else if (target === room.cameraTarget) inspect();
          else if (target === room.windowTarget) toggleDay();
          else if (target) toggleLamp();
        };
        const hover = (e: PointerEvent) => {
          const interactive = state.current.stage === 'inspecting' || (state.current.stage === 'overview' && hit(e.clientX,e.clientY));
          renderer.domElement.style.cursor = interactive ? 'pointer' : 'default';
        };
        const contextLost=(e:Event)=>{e.preventDefault();if(disposed)return;disposed=true;setFailed(true);setReady(false);release();};
        renderer.domElement.addEventListener('click',click);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('webglcontextlost',contextLost);
        cleanup=()=>{ro.disconnect();observer.disconnect();renderer.domElement.removeEventListener('click',click);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('webglcontextlost',contextLost);resources();};
        let enhancementsStarted=false;
        const frame=(now:number)=>{
          raf=requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
          if(!visible||document.hidden)return;
          const current=state.current.stage;
          if (current !== 'overview') {
            const duration = current === 'entering' ? ENTER_SECONDS : 1.35;
            elapsed = Math.min(duration, reduced ? duration : elapsed + dt);
            const progress = easeStudy(elapsed / duration);
            const homeFov = camera.aspect < 1 ? 84 : 70;
            let endFov = homeFov;
            if (current === 'entering') {
              endFov = camera.aspect < .8 ? 70 : 55;
              destination.copy(screenAt);
              destination.z += screenFillDistance(camera.aspect, endFov);
              endGaze.copy(screenAt);
              if (progress > .84 && !woke) { woke = true; live.current.onWake(); }
            } else if (current === 'inspecting') {
              endFov = 36;
              destination.copy(modelAt).addScaledVector(modelAngle, Math.max(.53, .7 / camera.aspect));
              endGaze.copy(modelAt);
            } else {
              destination.copy(home);
              endGaze.copy(homeGaze);
            }
            camera.position.lerpVectors(startPosition, destination, progress);
            gaze.lerpVectors(startGaze, endGaze, progress);
            camera.lookAt(gaze);
            camera.fov = startFov + (endFov - startFov) * progress;
            camera.updateProjectionMatrix();
            if (current === 'returning' && elapsed === duration) changeStage('overview');
          }
          const speed=reduced?1:1-Math.exp(-dt*2.1);daylight+=(Number(state.current.day)-daylight)*speed;lamplight+=(Number(state.current.lamp)-lamplight)*speed;
          updateStudyLighting(scene,room,daylight,lamplight);
          if(!reduced)animateCurtains(room.curtains,now);
          renderer.render(scene,camera);
          if(!enhancementsStarted){
            enhancementsStarted=true;
            container.dataset.roomReadyMs=String(Math.round(performance.now()));
            // The base room has rendered and controls are live. Optional assets
            // start on a later task, never inside the startup timeout.
            enhanceTimer=setTimeout(()=>{
              if(disposed||materialAbort.signal.aborted)return;
              container.dataset.materials='loading';
              materialDeadline=setTimeout(()=>materialAbort.abort(),90000);
              void applyStudyMaterials(scene,renderer,ownedTextures,{
                plan:materialPlan,signal:materialAbort.signal,
                onProgress:report=>{
                  container.dataset.materialsLoaded=String(report.loaded);
                  if(environment&&scene.environment!==environment.texture){environment.dispose();environment=undefined;}
                }
              }).then(report=>{
                if(disposed)return;
                container.dataset.materials=report.loaded===report.total?'ready':report.loaded?'partial':'fallback';
              }).catch(()=>{if(!disposed)container.dataset.materials='fallback';})
                .finally(()=>clearTimeout(materialDeadline));
            },150);
          }
          const surface=live.current.gallerySurface.current;
          if(surface){
            const w=container.clientWidth,h=container.clientHeight;
            surface.style.width=`${w}px`;surface.style.height=`${h}px`;
            surface.style.transform=`matrix3d(${galleryProjection(camera,w,h).elements.join(',')})`;
            surface.style.visibility = current === 'inspecting' || current === 'returning' ? 'hidden' : 'visible';
          }
          // Keep this DOM gallery mounted: only its positioning and interactivity change.
          if(current==='entering'&&elapsed>=ENTER_SECONDS){cancelAnimationFrame(raf);live.current.onEnter();return;}
        };
        raf=requestAnimationFrame(frame);clearTimeout(loadTimeout);setReady(true);
      }catch(error){if(disposed)return;clearTimeout(loadTimeout);disposed=true;release();console.error('Study unavailable',error);setFailed(true);}
    }
    init();return()=>{disposed=true;clearTimeout(loadTimeout);commands.current={begin:()=>{},inspect:()=>{},redraw:()=>{}};release();};
  },[]);
  return <div className={`room study-room ${ready?'room-ready':''} study-${stage}`}>
    <div className="study-fallback" aria-hidden="true"><strong>Between code<br />and photographs.</strong></div>
    <div ref={mount} className="room-canvas" />
    <div className="study-actions">
      {failed||!ready ? <button onClick={props.onEnter}>Open gallery ↗</button> :
        stage === 'overview' ? <>
          <button className="study-keyboard-action" onClick={() => commands.current.begin()}>Open monitor ↗</button>
          <button className="study-keyboard-action" onClick={() => commands.current.inspect()}>Inspect camera</button>
        </> : stage === 'inspecting' ? <>
          <span>Fujifilm X-T5</span>
          <button onClick={() => commands.current.inspect()}>Back to room ↩</button>
        </> : stage === 'entering' ? <button onClick={props.onEnter}>Skip zoom ↗</button> : null}
    </div>
    {!ready&&!failed&&<span className="room-loading">Opening the study…</span>}
    {failed&&<p className="study-unavailable">The 3D study is unavailable on this device. You can enter the gallery directly.</p>}
  </div>;
}
