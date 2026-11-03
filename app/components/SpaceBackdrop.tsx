"use client";
import {useEffect,useRef} from 'react';

// A decorative star field, not a map of named stars. Only bright stars twinkle.
export default function SpaceBackdrop(){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const surface=canvas.current;if(!surface)return;
    const ctx=surface.getContext('2d');if(!ctx)return;
    const backdrop=document.createElement('canvas'),base=backdrop.getContext('2d')!;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let width=0,height=0,ratio=1,raf=0,last=0;
    let stars:{x:number;y:number;r:number;phase:number;speed:number;warm:boolean}[]=[];
    const draw=(now:number)=>{
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(backdrop,0,0);
      ctx.setTransform(ratio,0,0,ratio,0,0);
      for(const star of stars){
        const glow=motion.matches?.65:.58+.24*Math.sin(now*.0003*star.speed+star.phase);
        const halo=ctx.createRadialGradient(star.x,star.y,0,star.x,star.y,star.r*5);
        halo.addColorStop(0,star.warm?`rgba(255,227,188,${glow})`:`rgba(211,230,255,${glow})`);
        halo.addColorStop(.2,`rgba(188,213,255,${glow*.4})`);halo.addColorStop(1,'rgba(120,167,230,0)');
        ctx.fillStyle=halo;ctx.fillRect(star.x-star.r*5,star.y-star.r*5,star.r*10,star.r*10);
        ctx.fillStyle=`rgba(241,247,255,${glow})`;ctx.beginPath();ctx.arc(star.x,star.y,star.r*.45,0,Math.PI*2);ctx.fill();
      }
    };
    const resize=()=>{
      width=innerWidth;height=innerHeight;ratio=Math.min(devicePixelRatio,2,Math.sqrt(5000000/(width*height)));
      surface.width=backdrop.width=Math.round(width*ratio);surface.height=backdrop.height=Math.round(height*ratio);
      base.setTransform(ratio,0,0,ratio,0,0);base.fillStyle='#02050b';base.fillRect(0,0,width,height);
      // Dim interstellar dust behind the globe; no heavy blur over the Earth itself.
      for(let i=0;i<9;i++){
        const x=width*(.25+i*.1),y=height*(.95-i*.1),r=Math.max(width,height)*.28;
        const dust=base.createRadialGradient(x,y,0,x,y,r);dust.addColorStop(0,'rgba(34,56,83,0.045)');dust.addColorStop(1,'rgba(2,5,11,0)');base.fillStyle=dust;base.fillRect(x-r,y-r,r*2,r*2);
      }
      let seed=31205;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
      const count=Math.min(1500,Math.max(500,Math.round(width*height/1200)));stars=[];
      for(let i=0;i<count;i++){
        const x=random()*width,y=random()*height,r=.25+Math.pow(random(),3)*.85;
        base.fillStyle=`rgba(193,213,240,${.15+random()*.5})`;base.beginPath();base.arc(x,y,r,0,Math.PI*2);base.fill();
        if(i%21===0)stars.push({x,y,r:1+random()*.6,phase:random()*Math.PI*2,speed:.6+random(),warm:random()>.8});
      }
      draw(0);
    };
    const frame=(now:number)=>{raf=requestAnimationFrame(frame);if(document.hidden||motion.matches||now-last<33)return;last=now;draw(now);};
    resize();raf=requestAnimationFrame(frame);window.addEventListener('resize',resize);motion.addEventListener('change',resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);motion.removeEventListener('change',resize);};
  },[]);
  return <canvas ref={canvas} className="space-backdrop" aria-hidden="true"/>;
}
