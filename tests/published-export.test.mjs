import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncPublished, publicCollection, ORIGIN} from '../scripts/sync-published.mjs';
const jpeg=Buffer.from([255,216,255,224,0,0,255,217]);
const fixture=()=>({settings:{name:'My studio',tagline:'My opening',bio:'My work',email:'private-contact@example.test',showSamples:false},
  albums:[{id:'album',title:'Tokyo',description:'Night',position:0,published:true,coverId:'photo',photoIds:['photo']}],
  photos:[{id:'photo',title:'A street',caption:'After rain',alt:'Street lights',width:200,height:100,url:'/api/media/photo',thumb:'/api/media/photo?size=small',albumIds:['album','private-album']}],isOwner:false,signedIn:false});
async function setup(t) {
  const dir=await mkdtemp(join(tmpdir(),'published-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  return join(dir,'published');
}
function service(feed, failMedia=false) {
  return async (url, options)=>{
    assert.equal(options.credentials,'omit');
    assert.equal(options.redirect,'error');
    if(url===ORIGIN+'/api/public')return Response.json(feed);
    return failMedia?new Response('unavailable',{status:503}):new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}});
  };
}
test('exports complete public text and both local JPEG sizes with no private relations',async t=>{
  const directory=await setup(t);
  const result=await syncPublished({directory,fetcher:service(fixture())});
  assert.equal(result.photos,1);
  const s=JSON.parse(await readFile(join(directory,'collection.json')));
  assert.equal(s.collection.settings.name,'My studio');
  assert.equal(s.collection.settings.email,'');
  assert.equal(JSON.stringify(s).includes('private-contact@example.test'),false);
  assert.deepEqual(s.collection.photos[0].albumIds,['album']);
  for(const key of ['url','thumb']) {
    const path=s.collection.photos[0][key];
    assert.match(path,/^\/published\/media\/[a-f0-9]{64}\.jpg$/);
    assert.deepEqual(await readFile(join(directory,path.replace('/published/',''))),jpeg);
  }
});
test('unchanged runs reuse immutable images and do not change the publication timestamp',async t=>{
  const directory=await setup(t);
  await syncPublished({directory,fetcher:service(fixture())});
  const before=await readFile(join(directory,'collection.json'),'utf8');
  const result=await syncPublished({directory,fetcher:async url=>{
    assert.equal(url,ORIGIN+'/api/public');return Response.json(fixture());
  }});
  assert.equal(result.changed,false);
  assert.equal(await readFile(join(directory,'collection.json'),'utf8'),before);
});
test('failed new image leaves the previous complete snapshot untouched',async t=>{
  const directory=await setup(t);
  await syncPublished({directory,fetcher:service(fixture())});
  const before=await readFile(join(directory,'collection.json'),'utf8');
  const changed=fixture(); changed.photos[0].url='/api/media/replacement';
  await assert.rejects(syncPublished({directory,fetcher:service(changed,true)}),/download failed/);
  assert.equal(await readFile(join(directory,'collection.json'),'utf8'),before);
});
test('unpublishing removes photos from the next public copy',async t=>{
  const directory=await setup(t);
  await syncPublished({directory,fetcher:service(fixture())});
  const empty=fixture();empty.albums=[];empty.photos=[];
  await syncPublished({directory,fetcher:service(empty)});
  assert.deepEqual(await readdir(join(directory,'media')),[]);
});
test('rejects authenticated feeds, drafts, unfiled photos, missing references and external media',()=>{
  for(const change of [f=>f.isOwner=true,f=>f.signedIn=true,f=>f.albums[0].published=false,
    f=>f.albums=[],f=>f.photos=[],f=>f.photos[0].url='https://unrelated.example/photo.jpg',
    f=>f.photos[0].thumb='/api/media/photo?private=true']) {
    const f=fixture();change(f);assert.throws(()=>publicCollection(f));
  }
});
test('a concurrent edit stops publication instead of mixing revisions',async t=>{
  const directory=await setup(t);let reads=0;
  await assert.rejects(syncPublished({directory,fetcher:async url=>{
    if(url===ORIGIN+'/api/public'){const f=fixture();if(reads++)f.settings.name='Changed';return Response.json(f);}
    return new Response(jpeg);
  }}),/changed during export/);
  await assert.rejects(readFile(join(directory,'collection.json')),{code:'ENOENT'});
});
