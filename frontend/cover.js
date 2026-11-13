import markup from './cover.html?raw';
import './cover.css';
import { coverPhoto } from '../lib/cover-assets';
import { installSiteCursor } from '../lib/site-cursor';
import { warmAtlas } from '../lib/atlas-assets';

const base = import.meta.env.BASE_URL;
const photo = coverPhoto(base);
const design = 'c';
document.body.classList.add('design-c');
document.querySelector('#root').innerHTML = markup;
const cursor = installSiteCursor();
const hidePointer = cursor.hide;
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
if (design === 'c') {
  document.title = 'Sheep’s Photography';
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
    </div>
    <a class="menu-credits" href="${base}atlas/README.md">Image credits</a>`;
  const atlasLink = panel.querySelector('a[href$="?view=scenes"]');
  for (const event of ['pointerenter', 'focus', 'touchstart']) atlasLink.addEventListener(event, () => warmAtlas(base), {once:true, passive:true});
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

  toggle.querySelector('i').setAttribute('data-collection-magnet','');
  if(location.hash === '#collections') setMenu(true);

}
