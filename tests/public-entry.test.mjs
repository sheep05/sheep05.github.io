import test from 'node:test';
import assert from 'node:assert/strict';
import { publicEntry } from '../lib/public-entry.ts';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { coverPhoto } from '../lib/cover-assets.ts';

test('cover images and font stay within their delivery budgets',()=>{
  const root=new URL('../public/',import.meta.url);
  assert.ok(statSync(new URL('cover/sheep-icon-small.webp',root)).size<8000);
  assert.ok(statSync(new URL('cover/WorkSans-Variable.woff2',root)).size<150000);
  for(const source of coverPhoto('').srcset.split(', ')) {
    const [path,width]=source.split(' ');
    const budget={1200:300000,2000:600000,3200:1100000,4800:1800000}[parseInt(width)];
    assert.ok(statSync(new URL(path,root)).size<budget, path);
  }
});

test('the first gallery render uses the requested route, including album context',async()=>{
  const {galleryRoute}=await import('../lib/public-entry.ts');
  for(const view of ['scenes','portraits','street','all','studio']) {
    assert.equal(galleryRoute(`?view=${view}`).view,view);
  }
  assert.deepEqual(galleryRoute('?album=japan&from=scenes&region=JP'),{
    view:'album',album:'japan',region:'JP',from:'scenes'
  });
  assert.equal(galleryRoute('?view=scenes&region=SG').region,'SG');
  assert.equal(galleryRoute('?album=cars&from=bad').from,'collection');
});

test('home and old About links open the lightweight cover', () => {
  for (const query of ['', '?view=about', '?view=unknown', '?design=c']) {
    assert.equal(publicEntry(query), 'cover', query);
  }
});
test('the old collection entrance opens the shared black menu', () => {
  assert.equal(publicEntry('?view=collection'), 'collections');
});
test('workshop, globe, categories, and existing album deep links remain reachable', () => {
  for (const view of ['studio', 'scenes', 'portraits', 'street', 'all']) {
    assert.equal(publicEntry(`?view=${view}`), 'gallery');
  }
  assert.equal(publicEntry('?album=japan&from=scenes&region=jp'), 'gallery');
  assert.equal(publicEntry('?album=japan&view=about'), 'gallery');
});

test('collection HTML renders its requested content immediately without a workshop or loading interstitial',async()=>{
  const {registerHooks}=await import('node:module');
  const {transpileModule,JsxEmit,ModuleKind}=await import('typescript');
  const hooks=registerHooks({
    resolve(specifier,context,next) {
      if(specifier.startsWith('@/'))specifier=new URL('../'+specifier.slice(2),import.meta.url).href;
      try{return next(specifier,context);}catch(error){
        if(specifier.startsWith('.')||specifier.startsWith('file:')) {
          for(const extension of ['.ts','.tsx']) {
            const url=new URL(specifier+extension,context.parentURL);
            if(existsSync(url))return next(url.href,context);
          }
        }
        throw error;
      }
    },
    load(url,context,next) {
      if(url.startsWith('file:')&&url.endsWith('.json'))return {format:'module',shortCircuit:true,source:'export default '+readFileSync(new URL(url),'utf8')};
      if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:JsxEmit.ReactJSX,module:ModuleKind.ESNext}}).outputText};
      return next(url,context);
    },
  });
  try {
    const {createElement}=await import('react');
    const {renderToString}=await import('react-dom/server');
    const {default:Portfolio}=await import('../app/components/Portfolio.tsx');
    const {galleryRoute}=await import('../lib/public-entry.ts');
    const {collection}=JSON.parse(readFileSync(new URL('../public/published/collection.json',import.meta.url),'utf8'));
    for(const [view,title] of [['scenes','A personal'],['portraits','Portraits'],['street','Street']]) {
      const html=renderToString(createElement(Portfolio,{initial:collection,initialRoute:galleryRoute(`?view=${view}`),coverUrl:'/'}));
      assert.ok(html.includes(title));
      assert.ok(!html.includes('Opening the atlas'));
      assert.ok(!html.includes('programmer-entrance'));
      assert.ok(!html.includes('Opening the study'));
      if(view==='scenes') assert.ok(!html.includes('Across the atlas'));
    }
    const atlas=renderToString(createElement(Portfolio,{initial:collection,initialRoute:galleryRoute('?view=scenes&region=JP'),coverUrl:'/'}));
    assert.match(atlas, /<button class="atlas-selection"[^>]*aria-label="Explore 1 collection in Japan"/);
    assert.ok(!atlas.includes('atlas-collections'));
    const country=renderToString(createElement(Portfolio,{initial:collection,initialRoute:galleryRoute('?view=all&region=JP'),coverUrl:'/'}));
    assert.ok(country.includes('Back to the atlas'));
    assert.ok(country.includes('Love scences in Japan'));
    assert.ok(!country.includes('Modern, clear and pleasant'));
  } finally {hooks.deregister();}
});
