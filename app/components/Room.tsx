"use client";
import { useEffect, useRef, useState } from 'react';
import { ANSWER, canEnterStudy, typeStudyKey, easeStudy, WALK_SECONDS, ENTER_SECONDS, overviewPosition, overviewTarget, deskPosition, deskTarget, screenPosition, screenFillDistance, type StudyStage } from '@/lib/scene/study-state';

type Props = {
  assetBase?: string; entering: boolean; onEnter: () => void; onReady: () => void;
  onUnavailable: () => void; onBegin: () => void; onStage?: (stage: StudyStage) => void;
  title: string; featured: { url: string; title: string }[];
};
export default function Room(props: Props) {
  const mount=useRef<HTMLDivElement>(null), field=useRef<HTMLInputElement>(null);
  const live=useRef(props);live.current=props;
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [stage,setStage]=useState<StudyStage>('overview'),[value,setValue]=useState(''),[message,setMessage]=useState('');
  const [day,setDay]=useState(false),[lamp,setLamp]=useState(true);
  const state=useRef({stage:'overview' as StudyStage,value:'',day:false,lamp:true});
  const commands=useRef({begin:()=>{},key:(_key:string)=>{},redraw:()=>{}});
  const changeStage=(next:StudyStage)=>{state.current.stage=next;setStage(next);live.current.onStage?.(next);};
  const toggleLamp=()=>{state.current.lamp=!state.current.lamp;setLamp(state.current.lamp);};
  const toggleDay=()=>{state.current.day=!state.current.day;setDay(state.current.day);};
  useEffect(()=>{commands.current.redraw();},[props.title,JSON.stringify(props.featured)]);
  useEffect(()=>{
    let disposed=false, cleanup=()=>{};
    const loadTimeout=setTimeout(()=>{if(disposed)return;disposed=true;cleanup();setFailed(true);live.current.onUnavailable();},20000);
    async function init(){
      try{
        const [THREE,{buildStudy},{batchStatic},{RoomEnvironment}]=await Promise.all([import('three'),import('@/lib/scene/study-room'),import('@/lib/scene/batch-static'),import('three/addons/environments/RoomEnvironment.js')]);
        if(disposed||!mount.current)return;
        const container=mount.current, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scene=new THREE.Scene();scene.background=new THREE.Color('#111820');
        const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
        renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
        const camera=new THREE.PerspectiveCamera(76,1,.035,65);
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
        batchStatic(scene,[room.screen,...room.keys,room.lampTarget,...room.prints,...room.curtains.map(c=>c.mesh)]);
        const ctx=room.screenCanvas.getContext('2d')!;
        let artworkVersion=0;const loadedPhotos:HTMLImageElement[]=[];
        function drawScreen(){
          const isGallery=state.current.stage==='entering';
          ctx.fillStyle='#0b1116';ctx.fillRect(0,0,1280,800);
          ctx.fillStyle='#a9b5b8';ctx.font='17px monospace';ctx.fillText(live.current.title.toUpperCase().slice(0,55),65,65);
          ctx.fillStyle='#e9e4d9';ctx.font='68px Georgia';ctx.fillText(isGallery?'Three ways of seeing.':'Who is',65,isGallery?180:325);
          if(!isGallery){
            ctx.font='76px monospace';const typed=state.current.value;
            ctx.fillStyle='#e9e4d9';ctx.fillText(typed,340,325);
            if(ANSWER.startsWith(typed)){ctx.fillStyle='#56616a';ctx.fillText(ANSWER.slice(typed.length),340+ctx.measureText(typed).width,325);}
            ctx.strokeStyle='#7c8b8d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(340,350);ctx.lineTo(1135,350);ctx.stroke();
            ctx.fillStyle='#aeb9bb';ctx.font='21px monospace';ctx.fillText(canEnterStudy(typed)?'THAT’S ME. PRESS ENTER ↗':'TYPE SHEEP ON THE KEYBOARD',65,430);
            ctx.fillStyle='#728087';ctx.font='18px monospace';ctx.fillText('A photographer. A programmer. Always looking.',65,715);
          }else{
            ['Scenes','Portraits','Street'].forEach((text,i)=>{
              const x=65+i*390;ctx.fillStyle=['#263842','#3b3735','#303a36'][i];ctx.fillRect(x,245,365,360);
              const img=loadedPhotos[i];if(img){const r=Math.max(365/img.width,360/img.height);ctx.save();ctx.beginPath();ctx.rect(x,245,365,360);ctx.clip();ctx.drawImage(img,x+(365-img.width*r)/2,245+(360-img.height*r)/2,img.width*r,img.height*r);ctx.restore();}
              ctx.fillStyle='#e9e4d9';ctx.font='32px Georgia';ctx.fillText(text,x,660);
            });
          }
          room.screenTexture.needsUpdate=true;
        }
        const updateArtwork=()=>{
          const version=++artworkVersion;
          live.current.featured.slice(0,room.prints.length).forEach((photo,i)=>{
            const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
              if(disposed||version!==artworkVersion)return;
              loadedPhotos[i]=image;
              const ratio=image.width/image.height;const target=room.prints[i];
              const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;ownedTextures.add(texture);
              const targetRatio=(target.geometry as import('three').PlaneGeometry).parameters.width/(target.geometry as import('three').PlaneGeometry).parameters.height;
              if(ratio>targetRatio){texture.repeat.x=targetRatio/ratio;texture.offset.x=(1-texture.repeat.x)/2;}else{texture.repeat.y=ratio/targetRatio;texture.offset.y=(1-texture.repeat.y)/2;}
              const material=target.material as import('three').MeshStandardMaterial;
              if(material.map){material.map.dispose();ownedTextures.delete(material.map);}material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;drawScreen();
            };image.src=photo.url;
          });drawScreen();
        };
        commands.current.redraw=updateArtwork;updateArtwork();
        const start=new THREE.Vector3(...overviewPosition),end=new THREE.Vector3(...deskPosition);
        const walk=new THREE.CatmullRomCurve3([start,new THREE.Vector3(1.35,1.85,1.2),new THREE.Vector3(.25,1.63,.75),end]);
        const focusStart=new THREE.Vector3(...overviewTarget),focusEnd=new THREE.Vector3(...deskTarget),screenAt=new THREE.Vector3(...screenPosition);
        let elapsed=0, previous=performance.now(),visible=true, daylight=0,lamplight=1;
        let galleryStart=end.clone(),galleryGaze=focusEnd.clone();
        const begin=()=>{
          if(state.current.stage!=='overview')return;
          live.current.onBegin();elapsed=0;
          changeStage(reduced?'desk':'walking');
          if(reduced){camera.position.copy(end);camera.lookAt(focusEnd);camera.fov=camera.aspect<.8?70:55;camera.updateProjectionMatrix();}
        };
        const enter=()=>{
          if(state.current.stage!=='desk')return;
          if(!canEnterStudy(state.current.value)){setMessage('Try “sheep”, then press Enter.');return;}
          setMessage('Welcome, make yourself at home.');elapsed=0;galleryStart=camera.position.clone();galleryGaze=focusEnd.clone();changeStage('entering');drawScreen();
          if(reduced)live.current.onEnter();
        };
        const press=(key:string)=>{
          if(state.current.stage!=='desk')return;
          if(key==='Enter'){const keycap=room.keys.find(k=>k.userData.key==='Enter');if(keycap)keycap.userData.pressedUntil=performance.now()+160;enter();return;}
          state.current.value=typeStudyKey(state.current.value,key);setValue(state.current.value);setMessage('');
          const mesh=room.keys.find(k=>k.userData.key===key.toLowerCase()||k.userData.key===key);
          if(mesh)mesh.userData.pressedUntil=performance.now()+160;
          drawScreen();
        };
        commands.current.begin=begin;commands.current.key=press;
        const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=state.current.stage==='overview'?(w<h?90:76):(w/h<.8?70:55);camera.updateProjectionMatrix();};
        const ro=new ResizeObserver(resize);ro.observe(container);resize();
        const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
        const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
        const hit=(e:PointerEvent)=>{
          const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
          return raycaster.intersectObjects(state.current.stage==='desk'?[...room.keys,room.lampTarget]:[room.lampTarget],false)[0]?.object;
        };
        const click=(e:PointerEvent)=>{const object=hit(e);if(object===room.lampTarget)toggleLamp();else if(object?.userData.key)press(object.userData.key);};
        const hover=(e:PointerEvent)=>{renderer.domElement.style.cursor=hit(e)?'pointer':'default';};
        const keyboard=(e:KeyboardEvent)=>{
          if(state.current.stage!=='desk'||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
          const target=e.target as HTMLElement;
          if(target.closest('input,textarea,button,a,select,[contenteditable]'))return;
          if(/^[a-z]$/i.test(e.key)||['Backspace','Escape','Enter'].includes(e.key)){e.preventDefault();press(e.key);}
        };
        const contextLost=(e:Event)=>{e.preventDefault();if(disposed)return;setFailed(true);setReady(false);live.current.onUnavailable();cleanup();};
        renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('webglcontextlost',contextLost);window.addEventListener('keydown',keyboard);
        cleanup=()=>{ro.disconnect();observer.disconnect();window.removeEventListener('keydown',keyboard);renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('webglcontextlost',contextLost);resources();};
        const warm=new THREE.Color('#ffbd77'),daySky=new THREE.Color('#9bb5c3'),nightSky=new THREE.Color('#101c36');
        const frame=(now:number)=>{
          raf=requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
          if(!visible||document.hidden)return;
          const current=state.current.stage;
          if(current==='walking'){
            elapsed+=dt;const t=Math.min(elapsed/WALK_SECONDS,1),e=easeStudy(t);camera.position.copy(walk.getPointAt(e));
            const gait=Math.sin(Math.PI*t);camera.position.x+=Math.sin(t*Math.PI*12)*.014*gait;camera.position.y+=Math.sin(t*Math.PI*24)*.009*gait;
            camera.lookAt(focusStart.clone().lerp(focusEnd,easeStudy(Math.min(t*1.8,1))));camera.rotateZ(Math.sin(t*Math.PI*12)*.002*gait);
            camera.fov=(camera.aspect<1?90:76)*(1-e)+(camera.aspect<.8?70:55)*e;camera.updateProjectionMatrix();
            if(t===1){changeStage('desk');setMessage('Type “sheep” using the desk keys or the field below.');}
          }else if(current==='entering'){
            elapsed+=dt;const t=Math.min(elapsed/ENTER_SECONDS,1),e=easeStudy(t);
            const final=screenAt.clone().add(new THREE.Vector3(0,0,screenFillDistance(camera.aspect,camera.fov)*.96));
            camera.position.lerpVectors(galleryStart,final,e);camera.lookAt(galleryGaze.clone().lerp(screenAt,e));
            container.style.setProperty('--screen-fade',String(easeStudy((t-.85)/.15)));
            if(t===1){cancelAnimationFrame(raf);live.current.onEnter();return;}
          }
          const speed=reduced?1:1-Math.exp(-dt*2.1);daylight+=(Number(state.current.day)-daylight)*speed;lamplight+=(Number(state.current.lamp)-lamplight)*speed;
          scene.environmentIntensity=.22+daylight*.18;room.hemi.intensity=.55+daylight*1.5;room.sun.intensity=.55+daylight*2.6;room.sun.color.setRGB(.58+daylight*.42,.68+daylight*.27,.9-daylight*.07);
          room.lamp.intensity=9*lamplight;room.bulbMaterial.emissiveIntensity=2*lamplight;room.lamp.color.copy(warm);room.fill.intensity=.8+daylight*1.5;
          room.skyMaterial.color.copy(nightSky).lerp(daySky,daylight);
          room.cityLights[0].color.setRGB(.65*(1-daylight)+.23,.46*(1-daylight)+.24,.25*(1-daylight)+.23);
          room.cityLights[1].color.setRGB(.035+daylight*.2,.055+daylight*.2,.08+daylight*.2);
          for(const mesh of room.keys)mesh.position.y=mesh.userData.restY-(now<(mesh.userData.pressedUntil||0)?.012:0);
          if(!reduced)room.curtains.forEach(({mesh,base},index)=>{
            const p=mesh.geometry.attributes.position;
            for(let i=0;i<p.count;i++){const y=base[i*3+1],free=Math.pow((.93-y)/1.86,1.5);p.setZ(i,base[i*3+2]+Math.sin(now*.0007+y*2+index)*.07*free);}
            p.needsUpdate=true;mesh.geometry.computeVertexNormals();
          });
          renderer.render(scene,camera);
        };
        raf=requestAnimationFrame(frame);clearTimeout(loadTimeout);setReady(true);live.current.onReady();
      }catch(error){if(disposed)return;clearTimeout(loadTimeout);cleanup();console.error('Study unavailable',error);setFailed(true);live.current.onUnavailable();}
    }
    init();return()=>{disposed=true;clearTimeout(loadTimeout);commands.current={begin:()=>{},key:()=>{},redraw:()=>{}};cleanup();};
  },[]);
  useEffect(()=>{if(props.entering){if(ready)commands.current.begin();else if(failed)live.current.onEnter();}},[props.entering,ready,failed]);
  useEffect(()=>{if(stage==='desk'&&matchMedia('(pointer: fine)').matches)field.current?.focus({preventScroll:true});},[stage]);
  return <div className={`room study-room ${ready?'room-ready':''} study-${stage}`}>
    <div className="study-fallback" aria-hidden="true"><span>THE STUDY</span><strong>Between code<br />and photographs.</strong></div>
    <div ref={mount} className="room-canvas" />
    {!ready&&!failed&&<span className="room-loading">Opening the study…</span>}
    {failed&&<p className="study-unavailable">The 3D study is unavailable on this device. You can enter the gallery directly.</p>}
    {ready&&stage!=='entering'&&<div className="study-switches" aria-label="Room lighting">
      <button onClick={toggleLamp} aria-pressed={lamp}>Lamp <span>{lamp?'on':'off'}</span></button>
      <button onClick={toggleDay} aria-pressed={day}>{day?'Daylight':'Night'} <span aria-hidden="true">{day?'☀':'☾'}</span></button>
    </div>}
    {ready&&stage==='desk'&&<form className="study-prompt" onSubmit={e=>{e.preventDefault();commands.current.key('Enter');}}>
      <label htmlFor="study-name">Who is <span className="study-answer"><input ref={field} id="study-name" value={value} placeholder="sheep" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={16} aria-describedby="study-hint" onChange={e=>{
        const next=e.target.value.toLowerCase().replace(/[^a-z]/g,'').slice(0,16);const old=state.current.value;
        // Route text entry through the same key pipeline as the physical desk.
        if(next.startsWith(old)){for(const key of next.slice(old.length))commands.current.key(key);}else{commands.current.key('Escape');for(const key of next)commands.current.key(key);}
      }} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();commands.current.key('Escape');}}}/></span>?</label>
      <button type="submit">Enter <span aria-hidden="true">↵</span></button>
      <p id="study-hint" role="status">{message||'Click the desk keys, or type “sheep”.'}</p>
    </form>}
  </div>;
}
