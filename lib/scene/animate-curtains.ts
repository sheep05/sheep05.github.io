import type {Mesh} from 'three';
export function animateCurtains(curtains:{mesh:Mesh;base:Float32Array}[],now:number){
  curtains.forEach(({mesh,base},index)=>{
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const y=base[i*3+1];
      // Float32 top-edge coordinates can exceed .93 by a few nanometres.
      const free=Math.pow(Math.max(0,Math.min(1,(.93-y)/1.86)),1.5);
      p.setZ(i,base[i*3+2]+Math.sin(now*.0007+y*2+index)*.07*free);
    }
    p.needsUpdate=true;mesh.geometry.computeVertexNormals();
  });
}
