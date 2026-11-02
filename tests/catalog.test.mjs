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
