import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyStudyMaterials} from '../lib/scene/study-materials.ts';

test('failed optional material downloads never reject room startup',async()=>{
 const original=THREE.TextureLoader.prototype.loadAsync;
 THREE.TextureLoader.prototype.loadAsync=async()=>{throw Error('503 simulated texture failure');};
 globalThis.document={baseURI:'http://localhost/'};
 try{
  const scene=new THREE.Scene(),owned=new Set();
  const report=await assert.doesNotReject(()=>applyStudyMaterials(scene,{capabilities:{getMaxAnisotropy:()=>4}},owned,{signal:new AbortController().signal,load:async()=>{throw Error('503 simulated texture failure');}}));
 }finally{THREE.TextureLoader.prototype.loadAsync=original;}
});

const {prepareStudyMaterials}=await import('../lib/scene/study-materials.ts');
const {batchStatic}=await import('../lib/scene/batch-static.ts');
const renderer={capabilities:{getMaxAnisotropy:()=>4}};
function room(){
 const scene=new THREE.Scene();
 for(let i=0;i<2;i++){const floor=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());floor.name='Floor';floor.position.x=i;scene.add(floor);}
 return scene;
}

test('base materials and batching work while every download is still pending',async()=>{
 const scene=room(),plan=prepareStudyMaterials(scene),material=scene.children[0].material;
 batchStatic(scene,[]);assert.equal(scene.children.length,1);
 const releases=[],owned=new Set(),abort=new AbortController();
 const pending=applyStudyMaterials(scene,renderer,owned,{plan,signal:abort.signal,load:()=>new Promise(resolve=>releases.push(resolve))});
 assert.equal(releases.length,2,'only two upgrades can compete for bandwidth');
 assert.equal(scene.children[0].material,material);assert.equal(material.map,null);
 assert.equal(material.color.getHexString(),'8d7560');
 abort.abort();let disposed=0;
 releases.forEach(resolve=>{const t=new THREE.Texture();t.addEventListener('dispose',()=>disposed++);resolve(t);});
 await pending;assert.equal(disposed,2);assert.equal(owned.size,0);assert.equal(material.map,null);
});

test('one missing map does not stop other upgrades or replace batched material identities',async()=>{
 const scene=room(),plan=prepareStudyMaterials(scene),material=scene.children[0].material;
 batchStatic(scene,[]);const owned=new Set(),progress=[];
 const report=await applyStudyMaterials(scene,renderer,owned,{plan,onProgress:r=>progress.push(r.loaded),load:async path=>{
  if(path==='oak_veneer_02/normal.jpg')throw Error('missing map');return new THREE.Texture();
 }});
 assert.equal(report.failed,1);assert.equal(report.loaded,report.total-1);
 assert.ok(material.map);assert.equal(material.normalMap,null);assert.ok(material.roughnessMap);
 assert.equal(scene.children[0].material,material);assert.equal(material.color.getHexString(),'a19382');
 assert.ok(progress.some(n=>n>0&&n<report.loaded));assert.ok(scene.environment);
});

test('aborting before enhancement prevents all requests and progress callbacks',async()=>{
 const scene=room(),abort=new AbortController();abort.abort();let calls=0;
 const report=await applyStudyMaterials(scene,renderer,new Set(),{signal:abort.signal,load:async()=>{calls++;return new THREE.Texture();},onProgress:()=>{throw Error('late callback');}});
 assert.equal(calls,0);assert.equal(report.loaded,0);
});

test('unneeded plaster color is never requested',()=>{
 assert.ok(!prepareStudyMaterials(room()).some(task=>task.path==='white_plaster_02/color.jpg'));
});

test('HTTP errors cancel their response bodies instead of occupying download slots',async()=>{
 const original=globalThis.fetch;let cancelled=0;
 globalThis.fetch=async()=>({ok:false,status:503,body:{cancel:async()=>{cancelled++;}}});
 try{
  const report=await applyStudyMaterials(room(),renderer,new Set());
  assert.equal(report.failed,report.total);assert.equal(cancelled,report.total);assert.equal(report.loaded,0);
 }finally{globalThis.fetch=original;}
});
