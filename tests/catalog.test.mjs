import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { normalizeAssignment, readAssignment, inChapter, atRegion, globePoint, regions } from '../lib/catalog.ts';
import { Quaternion, Euler, Vector3 } from 'three';

test('collections can move between chapters and belong to multiple countries without guessing',()=>{
  assert.deepEqual(normalizeAssignment({}),{chapters:[],regions:[]});
  const assignment=normalizeAssignment({chapters:['scenes','street','scenes'],regions:['JP','SG','JP']});
  assert.deepEqual(assignment,{chapters:['scenes','street'],regions:['JP','SG']});
  assert.equal(inChapter(assignment,'street'),true);
  assert.equal(atRegion(assignment,'JP'),true);
  assert.equal(atRegion({...assignment,chapters:['portraits']},'JP'),false);
  assert.deepEqual(readAssignment(JSON.stringify(assignment.chapters),JSON.stringify(assignment.regions)),assignment);
  assert.deepEqual(normalizeAssignment({chapters:[],regions:[]}),{chapters:[],regions:[]});
});
test('unknown future countries are retained and invalid assignments are rejected',()=>{
  assert.deepEqual(normalizeAssignment({regions:['FR']}),{chapters:[],regions:['FR']});
  for (const value of [{chapters:['typo']},{chapters:'scenes'},{regions:['Japan']},{regions:['jp']},{regions:null}]) assert.throws(()=>normalizeAssignment(value));
});
test('the additive migration preserves old albums and accepts JSON assignments in plain SQLite',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE albums(id TEXT PRIMARY KEY,title TEXT); INSERT INTO albums VALUES('a','Old album')");
    db.exec(readFileSync(new URL('../db/migrations/0002_gallery_chapters.sql',import.meta.url),'utf8'));
    const old=db.prepare('SELECT * FROM albums').get();
    assert.equal(old.title,'Old album'); assert.equal(old.chapters,'[]'); assert.equal(old.regions,'[]');
    db.prepare('UPDATE albums SET chapters=?,regions=? WHERE id=?').run('["scenes","street"]','["JP","CN"]','a');
    const saved=db.prepare('SELECT * FROM albums').get();
    assert.equal(atRegion(readAssignment(saved.chapters,saved.regions),'CN'),true);
  } finally {db.close();}
});
test('coordinates match the Earth texture and each country rotates to the visible centre',()=>{
  assert.deepEqual(globePoint(0,0),[1,0,-0]);
  assert.ok(new Vector3(...globePoint(0,90)).distanceTo(new Vector3(0,0,-1))<1e-10);
  for(const r of regions) {
    const q=new Quaternion().setFromEuler(new Euler(r.lat*Math.PI/180,-r.lon*Math.PI/180-Math.PI/2,0,'XYZ'));
    const point=new Vector3(...globePoint(r.lat,r.lon)).applyQuaternion(q);
    assert.ok(point.distanceTo(new Vector3(0,0,1))<1e-10,r.name);
  }
});

const {atlasPixelRatio}=await import('../lib/atlas-quality.ts');
test('Atlas shares one compact texture request across repeat visits and retries failures',async()=>{
 const {loadAtlasTexture}=await import('../lib/atlas-assets.ts');
 const original=globalThis.fetch,calls=[];
 try {
  globalThis.fetch=async url=>{calls.push(url);return new Response('texture');};
  const first=loadAtlasTexture('/cache-test/');
  assert.equal(loadAtlasTexture('/cache-test/'),first);
  await first;
  await loadAtlasTexture('/cache-test/');
  assert.deepEqual(calls,['/cache-test/atlas/earth-day-4k.jpg']);
  assert.ok(readFileSync(new URL('../public/atlas/earth-day-4k.jpg',import.meta.url)).length<600000);
  globalThis.fetch=async()=>new Response('',{status:503});
  await assert.rejects(loadAtlasTexture('/retry-test/'));
  globalThis.fetch=async()=>new Response('recovered');
  assert.equal(await (await loadAtlasTexture('/retry-test/')).text(),'recovered');
 } finally {globalThis.fetch=original;}
});
test('the globe drag circle matches its visible silhouette at every zoom and viewport',async()=>{
 const {globeDiameter}=await import('../lib/atlas-quality.ts');
 const {PerspectiveCamera,Raycaster,Vector2,Sphere}=await import('three');
 for(const [width,height] of [[759,590],[350,430],[1100,590]]) {
  for(const distance of [3.5,4.6,6.5]) {
   const fov=width/height<.85?48:40;
   const camera=new PerspectiveCamera(fov,width/height,.1,50);
   camera.position.z=distance;camera.updateMatrixWorld();
   const diameter=globeDiameter(height,fov,distance,1.25);
   const ray=new Raycaster(),sphere=new Sphere(new Vector3(),1.25);
   for(const factor of [.99,1.01]) {
    ray.setFromCamera(new Vector2(diameter/width*factor,0),camera);
    assert.equal(ray.ray.intersectsSphere(sphere),factor<1);
   }
  }
 }
});
test('Earth rendering preserves sharp high-density rendering within a pixel budget',()=>{
 assert.equal(atlasPixelRatio(800,600,2),2);
 assert.ok(atlasPixelRatio(2000,1500,3)**2*2000*1500<=6000001);
});


test('country previews follow their labels and stay inside desktop and mobile stages',async()=>{
 const {atlasPreviewPosition}=await import('../lib/atlas-preview.ts');
 for(const width of [350,760]) {
  const card={width:230,height:90},bounds={width,height:500};
  for(const label of [{x:10,y:20,width:70,height:36},{x:width-85,y:400,width:70,height:36},{x:width/2-35,y:230,width:70,height:36}]) {
   const p=atlasPreviewPosition(label,card,bounds);
   assert.ok(p);
   assert.ok(p.x>=8 && p.x+card.width<=width-8);
   assert.ok(p.y>=8 && p.y+card.height<=492);
   assert.ok(p.x>=label.x+label.width || p.x+card.width<=label.x || p.y>=label.y+label.height || p.y+card.height<=label.y);
  }
 }
 const card={width:230,height:90},bounds={width:760,height:500};
 const label={x:100,y:100,width:70,height:36};
 const first=atlasPreviewPosition(label,card,bounds),next=atlasPreviewPosition({...label,x:140,y:140},card,bounds);
 assert.ok(first && next);
 assert.notDeepEqual(next,first);
});


test('Malaysia preview avoids Singapore, other pins, labels, and controls',async()=>{
 const {atlasPreviewPosition}=await import('../lib/atlas-preview.ts');
 const intersects=(p,size,r)=>p.x<r.x+r.width && p.x+size.width>r.x && p.y<r.y+r.height && p.y+size.height>r.y;
 for(const width of [350,760]) {
  const bounds={width,height:500},card={width:220,height:88};
  const label={x:width*.2,y:270,width:90,height:38};
  const obstacles=[label,{x:width*.45,y:315,width:100,height:38},{x:width*.55,y:260,width:20,height:20},{x:width*.58,y:285,width:20,height:20},{x:width-125,y:450,width:120,height:42},{x:width*.15,y:90,width:70,height:38},{x:width*.65,y:95,width:70,height:38}];
  const p=atlasPreviewPosition(label,card,bounds,obstacles);
  assert.ok(p);
  for(const r of obstacles)assert.equal(intersects(p,card,r),false);
 }
 assert.equal(atlasPreviewPosition({x:0,y:0,width:350,height:500},{width:220,height:88},{width:350,height:500}),null);
});
