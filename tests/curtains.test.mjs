import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {animateCurtains} from '../lib/scene/animate-curtains.ts';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!s.match(/\.[a-z]+$/i))return next(s+'.ts',c);throw e;}}});
const drawing=new Proxy({}, {get:(_t,k)=>k==='measureText'?s=>({width:s.length*12}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const {buildStudy}=await import('../lib/scene/study-room.ts');
test('curtains retain finite positions, normals, and bounds across their sway cycle',()=>{
 const room=buildStudy(new THREE.Scene());
 for(const now of [0,1000,3000,10000,60000]){
  animateCurtains(room.curtains,now);
  for(const {mesh} of room.curtains){
   for(const attribute of ['position','normal'])assert.ok(Array.from(mesh.geometry.attributes[attribute].array).every(Number.isFinite));
   mesh.geometry.computeBoundingSphere();assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));
  }
 }
});

test('breeze keeps the rod pinned and the hem within a gentle movement envelope',()=>{
 const {curtains}=buildStudy(new THREE.Scene());let displacement=0;
 for(let time=0;time<24000;time+=400){
  animateCurtains(curtains,time);
  for(const {mesh,base} of curtains){const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    const moved=Math.hypot(p.getX(i)-base[i*3],p.getZ(i)-base[i*3+2]);
    if(base[i*3+1]>.92)assert.ok(moved<1e-7,'top stays attached to the curtain rod');
    assert.ok(moved<.125,'no gust can intersect the desk or window wall');displacement=Math.max(displacement,moved);
   }
  }
 }
 assert.ok(displacement>.06,'the free hem visibly moves');
});
