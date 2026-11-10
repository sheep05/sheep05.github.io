import * as THREE from 'three';

// One tile is measured in metres, so grain and weave do not stretch with furniture.
export function physicalUV(mesh: THREE.Mesh, tileU: number, tileV: number) {
  const geometry=mesh.geometry.clone(); mesh.geometry=geometry;
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

export async function applyStudyMaterials(scene: THREE.Scene, renderer: THREE.WebGLRenderer, owned: Set<THREE.Texture>) {
  const loader=new THREE.TextureLoader(),root=new URL('materials/poly-haven/',document.baseURI).href;
  const load=async(path:string,color=false)=>{
    const t=await loader.loadAsync(root+path);owned.add(t);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
  };
  const make=async(id:string,color:string,strength:number,roughness=1)=>{
    const [map,normalMap,roughnessMap]=await Promise.all([load(id+'/color.jpg',true),load(id+'/normal.jpg'),load(id+'/roughness.jpg')]);
    return new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,color,roughness,normalScale:new THREE.Vector2(strength,strength)});
  };
  const [wood,plaster,fabric,rug]=await Promise.all([
    make('oak_veneer_02','#a19382',.2,.82),make('white_plaster_02','#fff8ed',.14),
    make('rough_linen','#b6b3aa',.28),make('hessian_230','#ded1b7',.35)
  ]);
  // The scan's dark stains are unsuitable for this maintained room. Keep its surface relief and roughness.
  plaster.map=null;plaster.color.set('#b9b2a6');
  const cream=fabric.clone();cream.map=null;cream.color.set('#d4caba');cream.normalScale.setScalar(.2);cream.side=THREE.DoubleSide;
  scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;const n=o.name;
    if(/Floor$|walnut desktop|Chair back|Archive shelf|Closed door|Photograph frame|Window.*(frame|sill)|Skirting/i.test(n)){o.material=wood;physicalUV(o,1.25,.75);}
    else if(/wall|Ceiling/.test(n)){o.material=plaster;physicalUV(o,1.5,1.5);}
    else if(/rug/i.test(n)){o.material=rug;physicalUV(o,.45,.45);}
    else if(/cushion|Curtain/i.test(n)){o.material=cream;physicalUV(o,.4,.4);}
    else if(/sofa|Chair seat/i.test(n)){o.material=fabric;physicalUV(o,.4,.4);}
  });
  const {HDRLoader}=await import('three/addons/loaders/HDRLoader.js');
  const hdr=await new HDRLoader().loadAsync(root+'lythwood_room_1k.hdr');owned.add(hdr);
  hdr.mapping=THREE.EquirectangularReflectionMapping;scene.environment=hdr;
  scene.environmentRotation.y=Math.PI/2;
}
