import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.env.TEST_BUILD || 'outputs/github-pages');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.json':'application/json'};
http.createServer(async(req,res)=>{
 const mode=await readFile('work/entrance-mode','utf8').then(x=>x.trim()).catch(()=> 'hang');
 const url=new URL(req.url,'http://127.0.0.1:5180');
 if(url.pathname==='/api/public') {
   if(mode==='hang')return;
   if(mode==='error'){res.writeHead(503);return res.end('unavailable');}
   const fixture={settings:{name:'Quiet Studio',tagline:'A space for seeing slowly.',bio:'Fixture',email:'',showSamples:true},albums:[],photos:[],isOwner:false,signedIn:false};
   res.setHeader('content-type','application/json');res.end(JSON.stringify(fixture));return;
 }
 try{
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error();
  if(file.endsWith('.glb')&&mode==='hang-room')return;
  if(file.endsWith('.glb')&&mode==='slow-room')await new Promise(r=>setTimeout(r,20000));
  if(file.endsWith('.glb')&&mode==='broken-room'){res.writeHead(404);return res.end();}
  let bytes=await readFile(file);
  if(file.endsWith('.html')&&mode==='reduced-motion')bytes=Buffer.from(bytes.toString().replace('<head>', `<head><script>const nativeMatchMedia=window.matchMedia.bind(window);window.matchMedia=(query)=>query==='(prefers-reduced-motion: reduce)'?{matches:true}:nativeMatchMedia(query);</script>`));
  if(file.endsWith('.js'))bytes=Buffer.from(bytes.toString().replaceAll('https://quiet-studio-backend.sheep05.workers.dev','http://127.0.0.1:5180'));
  res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(bytes);
 }catch{res.writeHead(404);res.end();}
}).listen(5180,'127.0.0.1',()=>console.log('Regression fixture http://127.0.0.1:5180'));
