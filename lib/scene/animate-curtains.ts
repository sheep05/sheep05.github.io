import type {Mesh} from 'three';
export function animateCurtains(curtains:{mesh:Mesh;base:Float32Array}[],now:number){
  curtains.forEach(({mesh,base},index)=>{
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=base[i*3],y=base[i*3+1],time=now*.001;
      // Float32 top-edge coordinates can exceed .93 by a few nanometres.
      const free=Math.pow(Math.max(0,Math.min(1,(.93-y)/1.86)),1.5);
      // Broad, slow billow plus a smaller travelling ripple. The rod stays fixed;
      // the breeze pushes the free hem inward, with a slight sideways drift.
      const gust=.5+.5*Math.sin(time*.42+index*.65);
      const billow=(.045+gust*.065)*Math.sin(time*.8+y*1.8+index*.5);
      const ripple=.012*Math.sin(time*1.7+y*5+x*9+index);
      p.setZ(i,base[i*3+2]+(billow+ripple)*free);
      p.setX(i,x+Math.sin(time*.55+y*1.2+index)*.018*free);
    }
    p.needsUpdate=true;mesh.geometry.computeVertexNormals();
  });
}
