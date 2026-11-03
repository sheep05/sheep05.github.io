import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {typeStudyKey,canEnterStudy,screenFillDistance,deskPosition,deskTarget,overviewPosition,overviewTarget,screenPosition,screenSize} from '../lib/scene/study-state.ts';
// Native Node type stripping needs explicit extensions for these bundled-only imports.
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.match(/\.[a-z]+$/i))return next(specifier+'.ts',context);throw error;}}});
const {buildStudy}=await import('../lib/scene/study-room.ts');
const drawing=new Proxy({}, {get:(_t,k)=>k==='measureText'?s=>({width:s.length*12}):()=>{},set:()=>true});
// Geometry checks only: no browser or rendered appearance is simulated here.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const scene=new THREE.Scene(),room=buildStudy(scene);scene.updateMatrixWorld(true);

test('keyboard supports correction and exact sheep entry; unrelated keys cannot unlock',()=>{
 let text='';for(const k of 'shex')text=typeStudyKey(text,k);
 text=typeStudyKey(text,'Backspace');for(const k of 'ep')text=typeStudyKey(text,k);
 assert.equal(text,'sheep');assert.equal(canEnterStudy(text),true);
 assert.equal(canEnterStudy('sheepx'),false);assert.equal(typeStudyKey(text,'Enter'),text);
 assert.equal(typeStudyKey(text,'ArrowLeft'),text);assert.equal(typeStudyKey(text,'Escape'),'');
 assert.equal(typeStudyKey('abcdefghijklmnop','z'),'abcdefghijklmnop');
});
test('all desk keys can be raycast from the seated viewpoint without monitor obstruction',()=>{
 for(const aspect of [16/10,390/844,844/390]){
 const camera=new THREE.PerspectiveCamera(aspect<.8?70:55,aspect,.035,65);camera.position.fromArray(deskPosition);camera.lookAt(new THREE.Vector3(...deskTarget));camera.updateMatrixWorld();
 for(const key of room.keys){
  const target=key.getWorldPosition(new THREE.Vector3());target.y+=.019;
  const projected=target.clone().project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,key.name+' is outside the view');
  const ray=new THREE.Raycaster(camera.position.clone(),target.sub(camera.position).normalize());
  const hits=ray.intersectObjects(scene.children,true).filter(h=>h.object.isMesh);
  const hit=hits[0]?.object;assert.ok(hit===key||hit?.parent===key,`${key.name} blocked by ${hit?.name}`);
 }
 }
});
test('room has all enclosing surfaces and start camera sits inside them',()=>{
 for(const name of ['Floor','Back wall','Left wall','Front wall','Ceiling','Window wall below','Window wall above'])assert.ok(scene.getObjectByName(name),name);
 assert.ok(Math.abs(overviewPosition[0])<3&&Math.abs(overviewPosition[2])<2.8&&overviewPosition[1]<3.3);
 const camera=new THREE.PerspectiveCamera(76,16/10,.035,65);camera.position.fromArray(overviewPosition);camera.lookAt(new THREE.Vector3(...overviewTarget));camera.updateMatrixWorld();
 const point=new THREE.Vector3(...screenPosition).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,'Monitor visible in opening composition');
});
test('final screen fills viewport without changing its aspect ratio',()=>{
 for(const aspect of [390/844,4/3,16/9,21/9]){
  const distance=screenFillDistance(aspect,55);const viewH=2*distance*Math.tan(55*Math.PI/360),viewW=viewH*aspect;
  assert.ok(viewH<=screenSize[1]+1e-8&&viewW<=screenSize[0]+1e-8);
 }
});
test('camera remains inside free walking corridor',()=>{
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(...overviewPosition),new THREE.Vector3(1.35,1.85,1.2),new THREE.Vector3(.25,1.63,.75),new THREE.Vector3(...deskPosition)]);
 for(let i=0;i<=100;i++){const p=curve.getPointAt(i/100);assert.ok(p.x<2.9&&p.x>-.1&&p.y<3.1&&p.y>1.45&&p.z>0,'Path stays inside unobstructed right/centre aisle');}
});
let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
test('scene stays within a bounded geometry budget',()=>{assert.ok(triangles<200000);console.log(`Study geometry: ${meshes} meshes, ${Math.round(triangles)} triangles`);});
test('static batching reduces draw objects without merging interactive keys',async()=>{
 const {batchStatic}=await import('../lib/scene/batch-static.ts');
 batchStatic(scene,[room.screen,...room.keys,room.lampTarget,...room.prints,...room.curtains.map(c=>c.mesh)]);
 let count=0;scene.traverse(o=>{if(o.isMesh)count++;});
 console.log(`Batched study: ${count} draw objects`);assert.ok(count<220);
 for(const key of room.keys)assert.ok(key.parent);
});
