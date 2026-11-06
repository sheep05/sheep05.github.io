import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {screenFillDistance,overviewPosition,overviewTarget,screenPosition,screenSize} from '../lib/scene/study-state.ts';
// Native Node type stripping needs explicit extensions for these bundled-only imports.
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.match(/\.[a-z]+$/i))return next(specifier+'.ts',context);throw error;}}});
const {buildStudy}=await import('../lib/scene/study-room.ts');
const drawing=new Proxy({}, {get:(_t,k)=>k==='measureText'?s=>({width:s.length*12}):()=>{},set:()=>true});
// Geometry checks only: no browser or rendered appearance is simulated here.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const scene=new THREE.Scene(),room=buildStudy(scene);scene.updateMatrixWorld(true);

test('room has all enclosing surfaces and start camera sits inside them',()=>{
 for(const name of ['Floor','Back wall','Left wall','Front wall','Ceiling','Window wall below','Window wall above'])assert.ok(scene.getObjectByName(name),name);
 assert.ok(Math.abs(overviewPosition[0])<3&&Math.abs(overviewPosition[2])<2.8&&overviewPosition[1]<3.3);
 const camera=new THREE.PerspectiveCamera(70,16/10,.035,65);camera.position.fromArray(overviewPosition);camera.lookAt(new THREE.Vector3(...overviewTarget));camera.updateMatrixWorld();
 const point=new THREE.Vector3(...screenPosition).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,'Monitor visible in opening composition');
});
test('final screen fills viewport without changing its aspect ratio',()=>{
 for(const aspect of [390/844,4/3,16/9,21/9]){
  const distance=screenFillDistance(aspect,55);const viewH=2*distance*Math.tan(55*Math.PI/360),viewW=viewH*aspect;
  assert.ok(viewH<=screenSize[1]+1e-8&&viewW<=screenSize[0]+1e-8);
 }
});
test('lamp crown is level with the monitor and the chair turns in place toward it',()=>{
 const shade=new THREE.Box3().setFromObject(scene.getObjectByName('Lamp shade'));
 const monitor=new THREE.Box3().setFromObject(scene.getObjectByName('Monitor frame'));
 assert.ok(Math.abs(shade.max.y-monitor.max.y)<.001);
 assert.ok(shade.max.x<monitor.min.x,'Lamp stays beside the monitor without covering its screen');
 const chair=scene.getObjectByName('Desk chair');assert.deepEqual(chair.position.toArray(),[-1.1,0,-.65]);
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(chair.quaternion);
 const direction=new THREE.Vector3(screenPosition[0]-chair.position.x,0,screenPosition[2]-chair.position.z).normalize();
 assert.ok(forward.dot(direction)>.99999);
});
test('monitor, X-T5, lamp, and window are hit-testable from the opening camera',()=>{
 const camera=new THREE.PerspectiveCamera(70,16/10,.035,65);camera.position.fromArray(overviewPosition);camera.lookAt(new THREE.Vector3(...overviewTarget));camera.updateMatrixWorld();
 const targets=[room.screen,room.cameraTarget,room.lampTarget,room.windowTarget];
 for(const target of [room.screen,room.cameraTarget,scene.getObjectByName('Lamp shade'),scene.getObjectByName('Lamp base'),room.windowTarget]){
  const position=target.getWorldPosition(new THREE.Vector3());
  const projected=position.clone().project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,target.name+' is outside the opening view');
  const ray=new THREE.Raycaster(camera.position.clone(),position.sub(camera.position).normalize());
  const hit=ray.intersectObjects(targets,true)[0];assert.ok(hit,'Object should be clickable');
  if(target===room.screen||target===room.cameraTarget||target===room.windowTarget) assert.equal(hit.object,target);
  else assert.ok(room.lampTarget.children.includes(hit.object));
 }
});

let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
test('scene stays within a bounded geometry budget',()=>{assert.ok(triangles<200000);console.log(`Study geometry: ${meshes} meshes, ${Math.round(triangles)} triangles`);});
test('static batching reduces draw objects without losing keyboard detail',async()=>{
 const {batchStatic}=await import('../lib/scene/batch-static.ts');
 batchStatic(scene,[room.screen,room.cameraTarget,...room.keys,room.lampTarget,room.windowTarget,...room.prints,...room.curtains.map(c=>c.mesh)]);
 let count=0;scene.traverse(o=>{if(o.isMesh)count++;});
 console.log(`Batched study: ${count} draw objects`);assert.ok(count<220);
 for(const key of room.keys)assert.ok(key.parent);
});

const {galleryProjection,monitorContentSize}=await import('../lib/scene/gallery-projection.ts');
test('projected live gallery matches monitor corners throughout the approach',()=>{
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const camera=new THREE.PerspectiveCamera(55,width/height,.035,65);
  const [w,h]=monitorContentSize(width/height);
  const screen=new THREE.Vector3(...screenPosition);
  for(let i=0;i<=20;i++){
   const p=i/20;camera.position.lerpVectors(new THREE.Vector3(...overviewPosition),screen.clone().add(new THREE.Vector3(0,0,screenFillDistance(width/height,55))),p);
   camera.lookAt(new THREE.Vector3(...overviewTarget).lerp(screen,p));
   const matrix=galleryProjection(camera,width,height);assert.ok(Math.abs(matrix.determinant())>1e-10);
   for(const [x,y] of [[0,0],[width,0],[width,height],[0,height],[width/2,height/2]]){
    const actual=new THREE.Vector3(x,y,0).applyMatrix4(matrix);
    const expected=new THREE.Vector3(screen.x+(x/width-.5)*w,screen.y+(.5-y/height)*h,screen.z).project(camera);
    assert.ok(Math.abs(actual.x-(expected.x+1)*width/2)<1e-6);
    assert.ok(Math.abs(actual.y-(1-expected.y)*height/2)<1e-6);
   }
  }
 }
});
test('last animated frame equals the untransformed gallery viewport exactly',()=>{
 for(const [width,height] of [[1440,900],[390,844],[844,390],[2560,1080]]){
  const camera=new THREE.PerspectiveCamera(55,width/height,.035,65);
  camera.position.fromArray(screenPosition);camera.position.z+=screenFillDistance(width/height,55);camera.lookAt(new THREE.Vector3(...screenPosition));
  const matrix=galleryProjection(camera,width,height);
  for(const [x,y] of [[0,0],[width,0],[width,height],[0,height],[width*.3,height*.7]]){
   const point=new THREE.Vector3(x,y,0).applyMatrix4(matrix);
   assert.ok(Math.abs(point.x-x)<1e-6&&Math.abs(point.y-y)<1e-6,'No translation, scale or crop jump at handoff');
  }
 }
});
