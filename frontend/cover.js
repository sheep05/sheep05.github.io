import markup from './cover.html?raw';
import './cover.css';
import { installCoverSlideshow } from './cover-slideshow';
import { installSiteCursor } from '../lib/site-cursor';
import { scheduleCoverPreload } from '../lib/cover-preload';

const base = import.meta.env.BASE_URL;
document.body.classList.add('design-c');
document.querySelector('#root').innerHTML = markup;
const cursor = installSiteCursor();
const hidePointer = cursor.hide;
const slideshow = installCoverSlideshow(base);
const entrance = document.querySelector('.cover-enter');
const toggle=document.querySelector('.menu-toggle'),panel=document.querySelector('.menu-panel'),sheet=document.querySelector('.sheet'),dismiss=document.querySelector('.menu-dismiss');
let menuCloseTimer;
function finishMenuClose(){
 if(document.body.classList.contains('menu-open'))return;
 clearTimeout(menuCloseTimer);
 document.body.classList.remove('menu-closing');
}
sheet.addEventListener('transitionend',event=>{
 if(event.target===sheet&&event.propertyName==='transform')finishMenuClose();
});
function setMenu(open,focusFirst=false){
 clearTimeout(menuCloseTimer);
 const url=new URL(location.href);
 url.hash=open?'collections':'';
 history.replaceState(null,'',url);
 slideshow.setMenuOpen(open);
 document.body.classList.toggle('menu-closing',!open);
 document.body.classList.toggle('menu-open',open);
 entrance.setAttribute('aria-expanded',String(open));
 entrance.querySelector('i').toggleAttribute('data-collection-magnet',!open);
 toggle.querySelector('i').toggleAttribute('data-collection-magnet',open);
 toggle.hidden=!open;
 panel.inert=!open;
 panel.setAttribute('aria-hidden',String(!open));
 sheet.inert=open;
 dismiss.hidden=!open;
 if(!open){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)finishMenuClose();
  else menuCloseTimer=setTimeout(finishMenuClose,900);
 }
 if(open){(focusFirst ? panel.querySelector('.menu-primary a') : toggle).focus({preventScroll:true});}else entrance.focus({preventScroll:true});
 hidePointer();
}
entrance.addEventListener('click',event=>setMenu(true,event.detail===0));
toggle.addEventListener('click',()=>setMenu(false));
dismiss.addEventListener('click',()=>setMenu(false));
document.addEventListener('keydown',e=>{
 if(e.key==='Tab')hidePointer();
 if(toggle.hidden)return;
 if(e.key==='Escape'){e.preventDefault();setMenu(false);}
 if(e.key==='Tab'){
  const links=[...panel.querySelectorAll('a'),toggle],first=links[0],last=links[links.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
panel.innerHTML = `
  <div class="menu-actions">
    <a href="mailto:speedsheep55@gmail.com">Contact me</a>
    <a href="${base}?view=studio">Visit my workshop</a>
  </div>
  <div class="menu-primary">
    <div class="menu-row" style="--row:0"><div class="menu-line"><a href="${base}?view=scenes"><span data-roll>Atlas</span></a></div></div>
    <div class="menu-row" style="--row:1"><div class="menu-line"><a href="${base}?view=portraits"><span data-roll>Portraits</span></a></div></div>
    <div class="menu-row" style="--row:2"><div class="menu-line"><a href="${base}?view=street"><span data-roll>Street</span></a></div></div>
  </div>
  <a class="menu-credits" href="${base}atlas/README.md">Image credits</a>`;
panel.hidden = false;
panel.setAttribute('aria-hidden','true');
// Three copies of each character allow adjacent letters to roll in opposite directions.
// Screen readers receive one normal link name, never the decorative copies.
const letters = panel.querySelectorAll('.menu-primary [data-roll]');
for (const word of letters) {
  const text = word.textContent;
  const link = word.closest('a');
  link.setAttribute('aria-label', text);
  link.classList.add('collection-roll');
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

if(location.hash === '#collections') setMenu(true);

if (import.meta.env.PROD) scheduleCoverPreload(base);
