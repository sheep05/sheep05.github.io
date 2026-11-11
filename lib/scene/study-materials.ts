import * as THREE from 'three';

// One tile is measured in metres, so grain and weave do not stretch with furniture.
export function physicalUV(mesh: THREE.Mesh, tileU: number, tileV: number) {
  const geometry=mesh.geometry;
  const position=geometry.getAttribute('position'), normal=geometry.getAttribute('normal');
  const uv=new THREE.Float32BufferAttribute(position.count*2,2);
  for(let i=0;i<position.count;i++) {
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
    if(ny>=nx&&ny>=nz) uv.setXY(i,x/tileU,z/tileV);
    else if(nx>=nz) uv.setXY(i,z/tileU,y/tileV);
    else uv.setXY(i,x/tileU,y/tileV);
  }
  geometry.setAttribute('uv',uv);
}

type Slot = 'map' | 'normalMap' | 'roughnessMap';
type Task = {path:string; color?:boolean; apply:(texture:THREE.Texture)=>void};
export type MaterialPlan = Task[];
export type MaterialReport = {loaded:number; failed:number; total:number};
type Options = {
  plan?: MaterialPlan;
  signal?: AbortSignal;
  load?: (path:string,signal:AbortSignal)=>Promise<THREE.Texture>;
  onProgress?: (report:MaterialReport)=>void;
};

export function prepareStudyMaterials(scene:THREE.Scene):MaterialPlan {
  const wood=new THREE.MeshStandardMaterial({color:'#8d7560',roughness:.82,normalScale:new THREE.Vector2(.2,.2)});
  const plaster=new THREE.MeshStandardMaterial({color:'#b9b2a6',roughness:1,normalScale:new THREE.Vector2(.14,.14)});
  const fabric=new THREE.MeshStandardMaterial({color:'#8e8b81',roughness:1,normalScale:new THREE.Vector2(.28,.28)});
  const rug=new THREE.MeshStandardMaterial({color:'#918575',roughness:1,normalScale:new THREE.Vector2(.35,.35)});
  const cream=fabric.clone();cream.color.set('#d4caba');cream.normalScale.setScalar(.2);cream.side=THREE.DoubleSide;
  const exteriorWood=new Set<THREE.MeshStandardMaterial>(),exteriorPlaster=new Set<THREE.MeshStandardMaterial>(),stones=new Set<THREE.MeshStandardMaterial>();
  scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;const n=o.name;
    if(n==='Stone lane'){const m=o.material as THREE.MeshStandardMaterial;stones.add(m);m.normalScale.setScalar(.45);physicalUV(o,3,3);}
    else if(/Dark timber frontage|Shoji lattice|Shoji cross rail|Garden trunk/.test(n)){
      const m=o.material as THREE.MeshStandardMaterial;exteriorWood.add(m);m.normalScale.setScalar(.15);physicalUV(o,1.25,.75);
    }else if(/Machiya plaster|Sloping ceramic roof|Pagoda eave/.test(n)){
      const m=o.material as THREE.MeshStandardMaterial;exteriorPlaster.add(m);m.normalScale.setScalar(.18);physicalUV(o,1.5,1.5);
    }else if(/Floor$|walnut desktop|Chair back|Archive shelf|Closed door|Photograph frame|Window.*(frame|sill)|Skirting/i.test(n)){o.material=wood;physicalUV(o,1.25,.75);}
    else if(/wall|Ceiling/.test(n)){o.material=plaster;physicalUV(o,1.5,1.5);}
    else if(/rug/i.test(n)){o.material=rug;physicalUV(o,.45,.45);}
    else if(/cushion|Curtain/i.test(n)){o.material=cream;physicalUV(o,.4,.4);}
    else if(/sofa|Chair seat/i.test(n)){o.material=fabric;physicalUV(o,.4,.4);}
  });
  const tasks:Task[]=[];
  const filenames:Record<Slot,string>={map:'color',normalMap:'normal',roughnessMap:'roughness'};
  const map=(id:string,slot:Slot,materials:THREE.MeshStandardMaterial[],tint?:{material:THREE.MeshStandardMaterial;color:string})=>tasks.push({
    path:id+'/'+filenames[slot]+'.jpg',color:slot==='map',apply(texture){
      for(const m of materials){m[slot]=texture;m.needsUpdate=true;}
      if(tint)tint.material.color.set(tint.color);
    }
  });
  map('oak_veneer_02','map',[wood,...exteriorWood],{material:wood,color:'#a19382'});
  map('rough_linen','map',[fabric],{material:fabric,color:'#b6b3aa'});
  map('hessian_230','map',[rug],{material:rug,color:'#ded1b7'});
  tasks.push({path:'lythwood_room_1k.hdr',apply(texture){texture.mapping=THREE.EquirectangularReflectionMapping;scene.environment=texture;scene.environmentRotation.y=Math.PI/2;}});
  map('oak_veneer_02','normalMap',[wood,...exteriorWood]);
  map('rough_linen','normalMap',[fabric,cream]);
  map('white_plaster_02','normalMap',[plaster,...exteriorPlaster]);
  map('hessian_230','normalMap',[rug]);
  map('oak_veneer_02','roughnessMap',[wood]);
  map('rough_linen','roughnessMap',[fabric,cream]);
  map('white_plaster_02','roughnessMap',[plaster]);
  map('hessian_230','roughnessMap',[rug]);
  map('cobblestone_floor_08','map',[...stones]);
  map('cobblestone_floor_08','normalMap',[...stones]);
  return tasks;
}

async function loadStudyTexture(path:string,signal:AbortSignal):Promise<THREE.Texture> {
  const url=new URL('materials/poly-haven/'+path,document.baseURI);
  const response=await fetch(url,{signal});
  if(!response.ok){
    void response.body?.cancel().catch(()=>{});
    throw new Error('Optional texture HTTP '+response.status);
  }
  if(path.endsWith('.hdr')){
    const bytes=await response.arrayBuffer();
    const {HDRLoader}=await import('three/addons/loaders/HDRLoader.js');
    signal.throwIfAborted();
    const data=new HDRLoader().parse(bytes);
    const texture=new THREE.DataTexture(data.data,data.width,data.height,THREE.RGBAFormat,data.type);
    texture.colorSpace=THREE.LinearSRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.flipY=true;texture.needsUpdate=true;return texture;
  }
  const blob=await response.blob();signal.throwIfAborted();
  const objectURL=URL.createObjectURL(blob);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();
      const clean=()=>{signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;};
      const abort=()=>{clean();image.src='';reject(signal.reason);};
      image.onload=()=>{clean();resolve(image);};image.onerror=()=>{clean();reject(new Error('Optional texture decode failed'));};
      signal.addEventListener('abort',abort,{once:true});image.src=objectURL;
    });
    signal.throwIfAborted();const texture=new THREE.Texture(image);texture.needsUpdate=true;return texture;
  }finally{URL.revokeObjectURL(objectURL);}
}

export async function applyStudyMaterials(scene:THREE.Scene,renderer:THREE.WebGLRenderer,owned:Set<THREE.Texture>,options:Options={}):Promise<MaterialReport> {
  const tasks=options.plan??prepareStudyMaterials(scene),signal=options.signal??new AbortController().signal;
  const load=options.load??loadStudyTexture,report={loaded:0,failed:0,total:tasks.length};
  let next=0;
  const MATERIAL_UPGRADE_INTERVAL_MS=32;
  async function worker(){
    while(next<tasks.length&&!signal.aborted){
      const task=tasks[next++],request=new AbortController();
      const abort=()=>request.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});
      const timeout=setTimeout(()=>request.abort(new Error('Optional texture timeout')),20000);
      try{
        const texture=await load(task.path,request.signal);
        if(signal.aborted||request.signal.aborted){texture.dispose();continue;}
        if(!task.path.endsWith('.hdr')){
          texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
          texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
          if(task.color)texture.colorSpace=THREE.SRGBColorSpace;
        }
        owned.add(texture);task.apply(texture);report.loaded++;
      }catch{if(!signal.aborted)report.failed++;}
      finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
      if(!signal.aborted)options.onProgress?.({...report});
      if(!signal.aborted)await new Promise(resolve=>setTimeout(resolve,MATERIAL_UPGRADE_INTERVAL_MS));
    }
  }
  await Promise.all([worker(),worker()]);return report;
}
