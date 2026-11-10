import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {updateStudyLighting} from '../lib/scene/study-lighting.ts';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!s.match(/\.[a-z]+$/i))return next(s+'.ts',c);throw e;}}});
const drawing=new Proxy({}, {get:(_t,k)=>k==='measureText'?s=>({width:s.length*12}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const {buildStudy}=await import('../lib/scene/study-room.ts');
test('day has stronger direct-to-fill contrast; night lowers shadow contrast',()=>{
 const scene=new THREE.Scene(),room=buildStudy(scene);
 updateStudyLighting(scene,room,0,1);
 const nightRatio=room.sun.intensity/(room.hemi.intensity+scene.environmentIntensity);
 const nightShadow=room.sun.shadow.intensity,nightLampShadow=room.lamp.shadow.intensity;
 updateStudyLighting(scene,room,1,1);
 assert.ok(room.sun.intensity/(room.hemi.intensity+scene.environmentIntensity)>nightRatio*10);
 assert.ok(room.sun.shadow.intensity>nightShadow*3);
 assert.ok(room.lamp.shadow.intensity>nightLampShadow);
});
test('light transitions stay finite and switching the lamp off removes its warm bounce',()=>{
 const scene=new THREE.Scene(),room=buildStudy(scene);
 for(let i=0;i<=20;i++){updateStudyLighting(scene,room,i/20,1-i/20);
  for(const light of [room.sun,room.hemi,room.lamp,room.fill,room.windowFill])assert.ok(Number.isFinite(light.intensity)&&light.intensity>=0);
 }
 updateStudyLighting(scene,room,0,1);const litFill=room.fill.intensity;
 updateStudyLighting(scene,room,0,0);
 assert.equal(room.lamp.intensity,0);assert.equal(room.bulbMaterial.emissiveIntensity,0);
 assert.ok(room.fill.intensity<litFill/3);
});
