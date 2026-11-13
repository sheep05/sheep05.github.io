import markup from './cover.html?raw';
import './cover.css';
import { coverPhoto } from '../lib/cover-assets';

const base = import.meta.env.BASE_URL;
const photo = coverPhoto(base);
const design = 'c';
document.body.classList.add('design-c');
document.querySelector('#root').innerHTML = markup;
const cover = document.querySelector('#cover');
cover.innerHTML=`<section class="about-intro" aria-labelledby="about-title"><h1 id="about-title" class="sr-only">About Sheep</h1><p class="about-roles">Student / Photographer / Engineer</p><a class="about-action" href="mailto:speedsheep55@gmail.com">Contact me</a><a class="about-action" href="${base}?view=studio">Visit my workshop</a></section><figure class="about-photo"><img src="${photo.src}" srcset="${photo.srcset}" sizes="${photo.sizes}" width="5709" height="3811" alt="Sheep holding a camera beneath a sunlit canopy of trees" fetchpriority="high" decoding="async"></figure>`;
const toggle=document.querySelector('.menu-toggle'),panel=document.querySelector('.menu-panel'),sheet=document.querySelector('.sheet'),dismiss=document.querySelector('.menu-dismiss');
let menuCloseTimer;
function setMenu(open,focusFirst=false){
 clearTimeout(menuCloseTimer);
 if(design==='c'){
  const url=new URL(location.href);
  url.hash=open?'collections':'';
  history.replaceState(null,'',url);
 }
 document.body.classList.toggle('menu-closing',!open);
 document.body.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('span').textContent=open?'Close':design==='c'?'Collections':'Menu';toggle.setAttribute('aria-label',open?'Close menu':design==='c'?'Open collections':'Open menu');panel.hidden=!open&&design!=='c';panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));sheet.inert=open;dismiss.hidden=!open;
 menuCloseTimer=setTimeout(()=>document.body.classList.remove('menu-closing'),850);
 if(open){if(focusFirst)panel.querySelector('a').focus({preventScroll:true});}else toggle.focus({preventScroll:true});
 hidePointer();
}
toggle.setAttribute('aria-label','Open menu');toggle.addEventListener('click',event=>setMenu(toggle.getAttribute('aria-expanded')!=='true',event.detail===0));dismiss.addEventListener('click',()=>setMenu(false));
document.addEventListener('keydown',e=>{
 if(e.key==='Tab')hidePointer();
 if(toggle.getAttribute('aria-expanded')!=='true')return;
 if(e.key==='Escape'){e.preventDefault();setMenu(false);}
 if(e.key==='Tab'){
  const links=[...panel.querySelectorAll('a'),toggle],first=links[0],last=links[links.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
const stage=document.querySelector('.stage'),dot=document.querySelector('.cursor'),label=document.querySelector('.cursor-label');
const fine=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
let x=0,y=0,lx=0,ly=0,dx=0,dy=0,paintTime=0,raf=0,visible=false;
function hidePointer(){document.body.classList.remove('pointer-on','pointer-control');visible=false;cancelAnimationFrame(raf);raf=0;paintTime=0;}
function paint(now){
 raf=0;
 const dt=paintTime?Math.min(now-paintTime,50):1000/60;
 paintTime=now;
 // A short, frame-rate-independent ease lets the dot trail the real pointer.
 const follow=design==='c'?1-Math.exp(-dt/65):1;
 dx+=(x-dx)*follow;dy+=(y-dy)*follow;
 lx+=(x-lx)*.2;ly+=(y-ly)*.2;
 const moving=Math.hypot(x-dx,y-dy)>.1||Math.hypot(x-lx,y-ly)>.1;
 if(!moving){dx=lx=x;dy=ly=y;}
 const width=label.offsetWidth;
 dot.style.transform=`translate(${dx}px,${dy}px)`;
 label.style.transform=`translate(${Math.max(12,Math.min(lx+24,innerWidth-width-12))}px,${Math.max(12,Math.min(ly-10,innerHeight-70))}px)`;
 if(visible&&moving)raf=requestAnimationFrame(paint);else paintTime=0;
}
stage.addEventListener('pointermove',e=>{
 if(!fine.matches||e.pointerType!=='mouse'){hidePointer();return;}
 x=e.clientX;y=e.clientY;if(!visible){dx=lx=x;dy=ly=y;paintTime=0;}visible=true;
 const target=document.elementFromPoint(x,y);label.textContent=target?.closest('[data-label]')?.dataset.label||'';document.body.classList.add('pointer-on');document.body.classList.toggle('pointer-control',!!target?.closest('a,button'));if(!raf)raf=requestAnimationFrame(paint);
});
stage.addEventListener('pointerleave',hidePointer);window.addEventListener('blur',hidePointer);window.addEventListener('scroll',hidePointer,{passive:true});fine.addEventListener('change',hidePointer);

if (design === 'c') {
  document.title = 'About Sheep — Photography';
  toggle.setAttribute('aria-label','Open collections');
  toggle.querySelector('span').textContent = 'Collections';
  panel.innerHTML = `
    <div class="menu-primary">
      <div class="menu-row" style="--row:0"><div class="menu-line"><a href="${base}?view=scenes"><span data-roll>Atlas</span></a></div></div>
      <div class="menu-row" style="--row:1"><div class="menu-line"><a href="${base}?view=portraits"><span data-roll>Portraits</span></a></div></div>
      <div class="menu-row" style="--row:2"><div class="menu-line"><a href="${base}?view=street"><span data-roll>Street</span></a></div></div>
    </div>
    <div class="menu-secondary">
      <a href="#cover" data-return-about>About</a>
      <a href="${base}?view=all"><span data-roll>All albums</span></a>
    </div>`;
  panel.hidden = false;
  panel.setAttribute('aria-hidden','true');
  panel.querySelector('[data-return-about]').addEventListener('click',event=>{
    event.preventDefault();
    setMenu(false);
    sheet.scrollTop = 0;
    cover.focus({preventScroll:true});
  });
  // Three copies of each character allow adjacent letters to roll in opposite directions.
  // Screen readers receive one normal link name, never the decorative copies.
  const letters = panel.querySelectorAll('.menu-primary [data-roll]');
  for (const word of letters) {
    const text = word.textContent;
    word.closest('a').setAttribute('aria-label', text);
    word.classList.add('roll-word');
    word.setAttribute('aria-hidden','true');
    word.replaceChildren(...Array.from(text, letter=>{
      const span=document.createElement('span');
      span.className='roll-char';
      span.textContent=letter===' '?'\u00a0':letter;
      span.dataset.letter=span.textContent;
      return span;
    }));
  }

  const menuDot = toggle.querySelector('i');
  const magnetRadius = 80, maxTravel = 6;
  let centerX=0, centerY=0, targetX=0, targetY=0;
  let offsetX=0, offsetY=0, speedX=0, speedY=0, magnetFrame=0, previousTime=0;
  function measureAnchor() {
    const rect=toggle.getBoundingClientRect();
    centerX=rect.left+rect.width/2;
    centerY=rect.top+rect.height/2;
  }
  function animateMagnet(time) {
    const dt=Math.min(2,(time-previousTime)/(1000/60))||1;
    previousTime=time;
    const damping=Math.pow(.6,dt);
    speedX=(speedX+(targetX-offsetX)*.1*dt)*damping;
    speedY=(speedY+(targetY-offsetY)*.1*dt)*damping;
    offsetX+=speedX*dt;
    offsetY+=speedY*dt;
    const travel=Math.hypot(offsetX,offsetY);
    if(travel>maxTravel){offsetX*=maxTravel/travel;offsetY*=maxTravel/travel;}
    menuDot.style.transform=`translate3d(${offsetX}px,${offsetY}px,0)`;
    if(Math.hypot(targetX-offsetX,targetY-offsetY,speedX,speedY)>.03){magnetFrame=requestAnimationFrame(animateMagnet);}
    else {menuDot.style.transform=`translate3d(${targetX}px,${targetY}px,0)`;magnetFrame=0;}
  }
  function moveMagnet(tx,ty) {
    targetX=tx;targetY=ty;
    if(!magnetFrame){previousTime=performance.now();magnetFrame=requestAnimationFrame(animateMagnet);}
  }
  function clearProximity() {
    document.body.classList.remove('pointer-near-collection');
    dot.style.removeProperty('--proximity-scale');
  }
  function restMagnet() { clearProximity(); moveMagnet(0,0); }
  function stopMagnet() {
    clearProximity();
    cancelAnimationFrame(magnetFrame);magnetFrame=0;
    offsetX=offsetY=targetX=targetY=speedX=speedY=0;
    menuDot.style.transform='translate3d(0,0,0)';
  }
  measureAnchor();
  stage.addEventListener('pointerenter',measureAnchor);
  stage.addEventListener('pointermove',event=>{
    if(!fine.matches||event.pointerType!=='mouse'){stopMagnet();return;}
    const dx=event.clientX-centerX,dy=event.clientY-centerY;
    const distance=Math.hypot(dx,dy);
    if(distance>=magnetRadius){restMagnet();return;}
    document.body.classList.add('pointer-near-collection');
    dot.style.setProperty('--proximity-scale', String(1 + 3.5 * (1 - Math.pow(distance / magnetRadius, 2))));
    const attraction=Math.min(maxTravel,distance*.12)*(1-Math.pow(distance/magnetRadius,4));
    moveMagnet(distance?dx/distance*attraction:0,distance?dy/distance*attraction:0);
  });
  stage.addEventListener('pointerleave',restMagnet);
  window.addEventListener('blur',stopMagnet);
  window.addEventListener('resize',()=>{stopMagnet();measureAnchor();});
  window.addEventListener('scroll',()=>{stopMagnet();measureAnchor();},{passive:true});
  window.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key==='Escape')stopMagnet();});
  fine.addEventListener('change',stopMagnet);
  if(location.hash === '#collections') setMenu(true);

}
