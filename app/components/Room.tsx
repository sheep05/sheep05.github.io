"use client";
import { useEffect, useRef, useState, type RefObject } from 'react';
import { studyWalkPosition, easeStudy, WALK_SECONDS, ENTER_SECONDS, overviewPosition, overviewTarget, deskPosition, deskTarget, screenPosition, screenFillDistance, type StudyStage } from '@/lib/scene/study-state';

type Props = {
  gallerySurface: RefObject<HTMLDivElement | null>; interact: RefObject<((x:number,y:number)=>boolean)|null>; entering: boolean; onEnter: () => void; onReady: () => void;
  onUnavailable: () => void; onBegin: () => void; onStage?: (stage: StudyStage) => void;
  featured: { url: string; title: string }[];
};
export default function Room(props: Props) {
  const mount=useRef<HTMLDivElement>(null);
  const live=useRef(props);live.current=props;
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [stage,setStage]=useState<StudyStage>('overview');
  const state=useRef({stage:'overview' as StudyStage,day:false,lamp:true});
  const commands=useRef({begin:()=>{},redraw:()=>{}});
  const changeStage=(next:StudyStage)=>{state.current.stage=next;setStage(next);live.current.onStage?.(next);};
  const toggleLamp=()=>{state.current.lamp=!state.current.lamp;};
  const toggleDay=()=>{state.current.day=!state.current.day;};
  useEffect(()=>{commands.current.redraw();},[JSON.stringify(props.featured)]);
  useEffect(()=>{
    let disposed=false, cleanup=()=>{};
    const loadTimeout=setTimeout(()=>{if(disposed)return;disposed=true;cleanup();setFailed(true);live.current.onUnavailable();},20000);
    async function init(){
      try{
        const [THREE,{buildStudy},{batchStatic},{RoomEnvironment},{galleryProjection}]=await Promise.all([import('three'),import('@/lib/scene/study-room'),import('@/lib/scene/batch-static'),import('three/addons/environments/RoomEnvironment.js'),import('@/lib/scene/gallery-projection')]);
        if(disposed||!mount.current)return;
        const container=mount.current, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scene=new THREE.Scene();scene.background=new THREE.Color('#111820');
        const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
        renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
        const camera=new THREE.PerspectiveCamera(70,1,.035,65);
        camera.position.fromArray(overviewPosition);camera.lookAt(new THREE.Vector3(...overviewTarget));
        let environment:import('three').WebGLRenderTarget|undefined;
        let raf=0;let study:ReturnType<typeof buildStudy>|undefined;
        const ownedTextures=new Set<import('three').Texture>();
        const resources=()=>{
          cancelAnimationFrame(raf);
          const geometries=new Set<import('three').BufferGeometry>(),materials=new Set<import('three').Material>();
          scene.traverse(o=>{const m=o as import('three').Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(a=>materials.add(a));});
          materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)ownedTextures.add(v);});m.dispose();});
          study?.textures.forEach(t=>ownedTextures.add(t));ownedTextures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
          environment?.dispose();renderer.dispose();renderer.domElement.remove();
        };
        cleanup=resources;
        const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
        try{environment=pmrem.fromScene(environmentScene,.05);scene.environment=environment.texture;scene.environmentIntensity=.22;}finally{environmentScene.dispose();pmrem.dispose();}
        study=buildStudy(scene);
        const room=study;
        batchStatic(scene,[room.screen,...room.keys,room.lampTarget,room.windowTarget,...room.prints,...room.curtains.map(c=>c.mesh)]);
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
        const end=new THREE.Vector3(...deskPosition);
        const focusStart=new THREE.Vector3(...overviewTarget),focusEnd=new THREE.Vector3(...deskTarget),screenAt=new THREE.Vector3(...screenPosition);
        let elapsed=0, previous=performance.now(),visible=true, daylight=0,lamplight=1;
        let galleryStart=end.clone(),galleryGaze=focusEnd.clone();
        const begin=()=>{
          if(state.current.stage!=='overview')return;
          live.current.onBegin();elapsed=0;
          if(reduced){live.current.onEnter();return;}
          changeStage('walking');
        };
        const enter=()=>{
          elapsed=0;galleryStart=camera.position.clone();galleryGaze=focusEnd.clone();changeStage('entering');
        };
        commands.current.begin=begin;
        const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=state.current.stage==='overview'?(w<h?84:70):(w/h<.8?70:55);camera.updateProjectionMatrix();};
        const ro=new ResizeObserver(resize);ro.observe(container);resize();
        const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
        const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
        const hit=(x:number,y:number)=>{
          const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
          return raycaster.intersectObjects([room.lampTarget,room.windowTarget],true)[0]?.object;
        };
        const interact=(x:number,y:number)=>{if(state.current.stage==='entering')return false;const object=hit(x,y);if(!object)return false;if(object===room.windowTarget)toggleDay();else toggleLamp();return true;};
        live.current.interact.current=interact;
        const click=(e:PointerEvent)=>{interact(e.clientX,e.clientY);};
        const hover=(e:PointerEvent)=>{renderer.domElement.style.cursor=hit(e.clientX,e.clientY)?'pointer':'default';};
        const contextLost=(e:Event)=>{e.preventDefault();if(disposed)return;setFailed(true);setReady(false);live.current.onUnavailable();cleanup();};
        renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('webglcontextlost',contextLost);
        cleanup=()=>{live.current.interact.current=null;ro.disconnect();observer.disconnect();renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('webglcontextlost',contextLost);resources();};
        const warm=room.lamp.color.clone(),daySky=new THREE.Color('#9bb5c3'),nightSky=new THREE.Color('#101c36');
        const frame=(now:number)=>{
          raf=requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
          if(!visible||document.hidden)return;
          const current=state.current.stage;
          if(current==='walking'){
            elapsed+=dt;const t=Math.min(elapsed/WALK_SECONDS,1),e=easeStudy(t);camera.position.fromArray(studyWalkPosition(t));
            const gait=Math.sin(Math.PI*t);
            camera.lookAt(focusStart.clone().lerp(focusEnd,easeStudy(Math.min(t*1.8,1))));camera.rotateZ(Math.sin(t*Math.PI*12)*.002*gait);
            camera.fov=(camera.aspect<1?84:70)*(1-e)+(camera.aspect<.8?70:55)*e;camera.updateProjectionMatrix();
            if(t===1)enter();
          }else if(current==='entering'){
            elapsed+=dt;const t=Math.min(elapsed/ENTER_SECONDS,1),e=easeStudy(t);
            const final=screenAt.clone().add(new THREE.Vector3(0,0,screenFillDistance(camera.aspect,camera.fov)));
            camera.position.lerpVectors(galleryStart,final,e);camera.lookAt(galleryGaze.clone().lerp(screenAt,e));

          }
          const speed=reduced?1:1-Math.exp(-dt*2.1);daylight+=(Number(state.current.day)-daylight)*speed;lamplight+=(Number(state.current.lamp)-lamplight)*speed;
          scene.environmentIntensity=.22+daylight*.18;room.hemi.intensity=.55+daylight*1.5;room.sun.intensity=.55+daylight*2.6;room.sun.color.setRGB(.58+daylight*.42,.68+daylight*.27,.9-daylight*.07);
          room.lamp.intensity=9*lamplight;room.bulbMaterial.emissiveIntensity=2*lamplight;room.lamp.color.copy(warm);room.fill.intensity=.8+daylight*1.5;
          room.skyMaterial.color.copy(nightSky).lerp(daySky,daylight);
          room.cityLights[0].color.setRGB(.65*(1-daylight)+.23,.46*(1-daylight)+.24,.25*(1-daylight)+.23);
          room.cityLights[1].color.setRGB(.035+daylight*.2,.055+daylight*.2,.08+daylight*.2);
          if(!reduced)room.curtains.forEach(({mesh,base},index)=>{
            const p=mesh.geometry.attributes.position;
            for(let i=0;i<p.count;i++){const y=base[i*3+1],free=Math.pow((.93-y)/1.86,1.5);p.setZ(i,base[i*3+2]+Math.sin(now*.0007+y*2+index)*.07*free);}
            p.needsUpdate=true;mesh.geometry.computeVertexNormals();
          });
          renderer.render(scene,camera);
          const surface=live.current.gallerySurface.current;
          if(surface){
            const w=container.clientWidth,h=container.clientHeight;
            surface.style.width=`${w}px`;surface.style.height=`${h}px`;
            surface.style.transform=`matrix3d(${galleryProjection(camera,w,h).elements.join(',')})`;
            surface.style.visibility='visible';
          }
          // Keep this DOM gallery mounted: only its positioning and interactivity change.
          if(current==='entering'&&elapsed>=ENTER_SECONDS){cancelAnimationFrame(raf);live.current.onEnter();return;}
        };
        raf=requestAnimationFrame(frame);clearTimeout(loadTimeout);setReady(true);live.current.onReady();
      }catch(error){if(disposed)return;clearTimeout(loadTimeout);cleanup();console.error('Study unavailable',error);setFailed(true);live.current.onUnavailable();}
    }
    init();return()=>{disposed=true;clearTimeout(loadTimeout);commands.current={begin:()=>{},redraw:()=>{}};cleanup();};
  },[]);
  useEffect(()=>{if(props.entering){if(ready)commands.current.begin();else if(failed)live.current.onEnter();}},[props.entering,ready,failed]);
  return <div className={`room study-room ${ready?'room-ready':''} study-${stage}`}>
    <div className="study-fallback" aria-hidden="true"><span>THE STUDY</span><strong>Between code<br />and photographs.</strong></div>
    <div ref={mount} className="room-canvas" />
    {!ready&&!failed&&<span className="room-loading">Opening the study…</span>}
    {failed&&<p className="study-unavailable">The 3D study is unavailable on this device. You can enter the gallery directly.</p>}
  </div>;
}
