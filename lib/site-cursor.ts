import { installLoadingProgress } from './loading-progress';
// Shared by the cover, galleries, workshop, and full-screen photograph viewer.
export function installSiteCursor() {
  installLoadingProgress();
  const fine = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  const baseRadius = 7.5;
  const halfSurface = 36; // Includes the fully expanded circle and its antialiased edge.
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const dot = document.createElementNS(svgNamespace, 'svg');
  dot.classList.add('site-cursor');
  dot.setAttribute('aria-hidden', 'true');
  dot.setAttribute('focusable', 'false');
  dot.setAttribute('width', String(halfSurface * 2));
  dot.setAttribute('height', String(halfSurface * 2));
  const circle = document.createElementNS(svgNamespace, 'circle');
  circle.setAttribute('r', String(baseRadius));
  dot.appendChild(circle);
  document.body.appendChild(dot);
  let x=0, y=0, dx=0, dy=0, frame=0, last=0, visible=false;
  let radius = baseRadius, targetRadius = baseRadius;
  let pointerTarget: Element | null = null, pointerMoved = false;
  let magnet: HTMLElement | null=null;
  let ox=0, oy=0, tx=0, ty=0, vx=0, vy=0;
  function resetMagnet() {
    if (magnet) magnet.style.transform = '';
    magnet=null; ox=oy=tx=ty=vx=vy=0;
  }
  function hide() {
    visible=false; dot.classList.remove('is-visible');
    cancelAnimationFrame(frame); frame=0; last=0; resetMagnet();
  }
  function updateTargets() {
    let scale = pointerTarget?.closest('a,button,summary,[role="button"]') ? 2.15 : 1;
    const next=document.querySelector<HTMLElement>('[data-collection-magnet]');
    if(next!==magnet){resetMagnet();magnet=next;}
    if(magnet) {
      const rect=magnet.getBoundingClientRect();
      const mx=x-(rect.left+rect.width/2-ox), my=y-(rect.top+rect.height/2-oy);
      const distance=Math.hypot(mx,my);
      if(distance<80) {
        scale=Math.max(scale, 1+3.5*(1-(distance/80)**2));
        const attraction=Math.min(6,distance*.12)*(1-(distance/80)**4);
        tx=distance?mx/distance*attraction:0;ty=distance?my/distance*attraction:0;
      } else tx=ty=0;
    }
    targetRadius = baseRadius * scale;
  }
  function paint(now: number) {
    frame=0;
    if (pointerMoved) {
      updateTargets();
      pointerMoved = false;
    }
    const dt=last?Math.min(now-last,50):1000/60;
    last=now;
    const follow=1-Math.exp(-dt/65);
    dx+=(x-dx)*follow; dy+=(y-dy)*follow;
    // Place the composited surface on physical pixels. Draw the fractional
    // position inside it so a moving edge is antialiased only once.
    const dpr = window.devicePixelRatio || 1;
    const left = Math.round((dx - halfSurface) * dpr) / dpr;
    const top = Math.round((dy - halfSurface) * dpr) / dpr;
    dot.style.transform = `translate(${left}px,${top}px)`;
    circle.setAttribute('cx', String(dx - left));
    circle.setAttribute('cy', String(dy - top));
    if (radius !== targetRadius) {
      radius += (targetRadius - radius) * follow;
      if (Math.abs(targetRadius - radius) < .01) radius = targetRadius;
      circle.setAttribute('r', String(radius));
    }
    dot.classList.add('is-visible');
    if (magnet) {
      const step=Math.min(2,dt/(1000/60)), damping=Math.pow(.6,step);
      vx=(vx+(tx-ox)*.1*step)*damping; vy=(vy+(ty-oy)*.1*step)*damping;
      ox+=vx*step; oy+=vy*step;
      const travel=Math.hypot(ox,oy);
      if(travel>6){ox*=6/travel;oy*=6/travel;}
      magnet.style.transform=`translate3d(${ox}px,${oy}px,0)`;
    }
    if(visible && (radius !== targetRadius || Math.hypot(x-dx,y-dy)>.1 || Math.hypot(tx-ox,ty-oy,vx,vy)>.03)) frame=requestAnimationFrame(paint);
    else last=0;
  }
  function move(event: PointerEvent) {
    if(!fine.matches || event.pointerType!=='mouse'){hide();return;}
    x=event.clientX; y=event.clientY;
    if(!visible){
      dx=x; dy=y; radius=baseRadius;
      circle.setAttribute('r', String(radius));
    }
    visible=true;
    pointerTarget = event.target instanceof Element ? event.target : null;
    pointerMoved = true;
    if(!frame)frame=requestAnimationFrame(paint);
  }
  function key(event: KeyboardEvent){if(event.key==='Tab'||event.key==='Escape')hide();}
  // Modal dialogs paint above the document. Keep the follower in that same layer.
  function placeInLayer() {
    const host=document.querySelector('dialog[open]') || document.body;
    if(dot.parentElement!==host){hide();host.appendChild(dot);}
  }
  const observer=new MutationObserver(placeInLayer);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  placeInLayer();
  document.addEventListener('pointermove',move);
  document.documentElement.addEventListener('pointerleave',hide);
  document.addEventListener('scroll',hide,{passive:true,capture:true});
  document.addEventListener('keydown',key);
  window.addEventListener('blur',hide);
  window.addEventListener('resize',hide);
  fine.addEventListener('change',hide);
  return { hide, destroy() {
    hide();observer.disconnect();dot.remove();
    document.removeEventListener('pointermove',move);
    document.documentElement.removeEventListener('pointerleave',hide);
    document.removeEventListener('scroll',hide,true);
    document.removeEventListener('keydown',key);
    window.removeEventListener('blur',hide);window.removeEventListener('resize',hide);
    fine.removeEventListener('change',hide);
  }};
}
