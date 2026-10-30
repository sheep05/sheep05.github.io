// Export only the anonymous public library; no Studio credentials are used.
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, rename, rm, mkdtemp} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const ORIGIN = 'https://quiet-studio-backend.sheep05.workers.dev';
const hash = value => createHash('sha256').update(value).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const text = value => { check(typeof value === 'string', 'Invalid public text'); return value; };
const id = value => { check(typeof value === 'string' && /^[\w-]{1,100}$/.test(value), 'Invalid public ID'); return value; };
export function publicCollection(feed) {
  check(feed && feed.isOwner === false && feed.signedIn === false, 'Refusing an authenticated feed');
  check(Array.isArray(feed.albums) && Array.isArray(feed.photos), 'Invalid public library');
  const s = feed.settings;
  check(s && typeof s.showSamples === 'boolean', 'Invalid public settings');
  const settings = Object.fromEntries(['name','tagline','bio'].map(key => [key,text(s[key])]));
  // Contact details are excluded from the public repository by default.
  settings.email = '';
  settings.showSamples = s.showSamples;
  const albums = feed.albums.map(a => {
    check(a.published === true && Array.isArray(a.photoIds), 'Refusing draft or malformed album');
    check(Number.isFinite(a.position), 'Invalid album order');
    return {id:id(a.id), title:text(a.title), description:text(a.description), position:a.position,
      published:true, coverId:a.coverId === null ? null : id(a.coverId), photoIds:a.photoIds.map(id)};
  });
  check(new Set(albums.map(a => a.id)).size === albums.length, 'Duplicate album ID');
  const allowed = new Set(albums.flatMap(a => a.photoIds));
  const photos = feed.photos.map(p => {
    check(allowed.has(p.id), 'Refusing an unfiled/private photo');
    check(Number.isFinite(p.width) && p.width > 0 && Number.isFinite(p.height) && p.height > 0, 'Invalid image dimensions');
    return {id:id(p.id), title:text(p.title), caption:text(p.caption), alt:text(p.alt),
      width:p.width, height:p.height, url:mediaURL(p.url), thumb:mediaURL(p.thumb),
      albumIds:albums.filter(a => a.photoIds.includes(p.id)).map(a => a.id)};
  });
  const photoIDs = new Set(photos.map(p => p.id));
  check(photoIDs.size === photos.length, 'Duplicate photo ID');
  check([...allowed].every(p => photoIDs.has(p)), 'Album references a missing photo');
  check(albums.every(a => a.coverId === null || a.photoIds.includes(a.coverId)), 'Invalid cover');
  return {settings, albums, photos, isOwner:false, signedIn:false};
}
function mediaURL(value) {
  const u = new URL(text(value), ORIGIN);
  check(u.origin === ORIGIN && !u.username && !u.password && !u.hash &&
    /^\/api\/media\/[\w-]+$/.test(u.pathname) && ['', '?size=small'].includes(u.search), 'Unexpected media source');
  return u.href;
}
async function download(url, fetcher, limit) {
  const response = await fetcher(url, {credentials:'omit', cache:'no-store', redirect:'error', signal:AbortSignal.timeout(30000)});
  check(response.ok, `Public download failed (${response.status})`);
  check(Number(response.headers.get('content-length') || 0) <= limit, 'Download exceeds size limit');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('Download exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function syncPublished({directory = 'public/published', fetcher = fetch} = {}) {
  const target = resolve(directory);
  const raw = await download(`${ORIGIN}/api/public`, fetcher, 5 * 1024 * 1024);
  const collection = publicCollection(JSON.parse(raw));
  let previous;
  try { previous = JSON.parse(await readFile(join(target, 'collection.json'), 'utf8')); } catch {}
  await mkdir(dirname(target), {recursive:true});
  const stage = await mkdtemp(join(dirname(target), '.published-stage-'));
  let total = 0;
  try {
    await mkdir(join(stage, 'media'));
    for (const photo of collection.photos) {
      for (const key of ['url','thumb']) {
        // Uploaded image IDs are immutable; replacing an image creates a new ID.
        const filename = hash(photo[key]) + '.jpg';
        let bytes;
        try { bytes = await readFile(join(target, 'media', filename)); }
        catch { bytes = await download(photo[key], fetcher, 25 * 1024 * 1024); }
        check(bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff, 'Expected Studio JPEG web copy');
        total += bytes.length;
        check(total < 900 * 1024 * 1024, 'Published photographs exceed the site budget');
        await writeFile(join(stage, 'media', filename), bytes);
        photo[key] = '/published/media/' + filename;
      }
    }
    const after = publicCollection(JSON.parse(await download(`${ORIGIN}/api/public`, fetcher, 5 * 1024 * 1024)));
    check(JSON.stringify(publicCollection(JSON.parse(raw))) === JSON.stringify(after), 'Library changed during export; retry on the next run');
    const contentHash = hash(JSON.stringify(collection));
    const snapshot = {schemaVersion:1, contentHash,
      publishedAt:previous?.contentHash === contentHash ? previous.publishedAt : new Date().toISOString(), collection};
    await writeFile(join(stage, 'collection.json'), JSON.stringify(snapshot, null, 2) + '\n');
    const backup = stage + '-previous';
    let hadPrevious = false;
    try { await rename(target, backup); hadPrevious = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(stage, target); }
    catch (error) { if (hadPrevious) await rename(backup, target); throw error; }
    if (hadPrevious) await rm(backup, {recursive:true});
    return {changed:previous?.contentHash !== contentHash, photos:collection.photos.length, albums:collection.albums.length};
  } finally { await rm(stage, {recursive:true, force:true}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await syncPublished())); }
  catch (error) { console.error('Publication stopped; previous snapshot preserved:', error.message); process.exitCode = 1; }
}
