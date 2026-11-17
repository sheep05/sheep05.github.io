import{n as e}from"./index-BETpE51s.js";import{t}from"./site-cursor-Cp3CWFsx.js";var n=`
  <div class="stage">
    <nav class="menu-panel" id="menu-panel" aria-label="Main navigation" inert hidden>
    </nav>
    <button class="menu-toggle" aria-controls="menu-panel" aria-expanded="false"><span>Menu</span><i aria-hidden="true"></i></button>
    <div class="sheet">
      <a class="skip-link" href="#cover">Skip to introduction</a>
      <header class="masthead"><div class="cover-identity"><img class="identity-icon" src="/cover/sheep-icon-small.webp" width="192" height="128" alt=""><div class="wordmark">Sheep’s<br>photography</div></div></header>
      <main id="cover" tabindex="-1"></main>

    </div>
    <button class="menu-dismiss" aria-label="Close menu" tabindex="-1" hidden></button>
  </div>
`,r=`/`,i=e(r),a=`c`;document.body.classList.add(`design-c`),document.querySelector(`#root`).innerHTML=n;var o=t().hide,s=document.querySelector(`#cover`);s.innerHTML=`<h1 id="about-title" class="sr-only">Sheep’s Photography</h1><figure class="about-photo"><img src="${i.src}" srcset="${i.srcset}" sizes="${i.sizes}" width="5709" height="3811" alt="Sheep holding a camera beneath a sunlit canopy of trees" fetchpriority="high" decoding="async"></figure>`;var c=document.querySelector(`.menu-toggle`),l=document.querySelector(`.menu-panel`),u=document.querySelector(`.sheet`),d=document.querySelector(`.menu-dismiss`),f;function p(){document.body.classList.contains(`menu-open`)||(clearTimeout(f),document.body.classList.remove(`menu-closing`))}u.addEventListener(`transitionend`,e=>{e.target===u&&e.propertyName===`transform`&&p()});function m(e,t=!1){if(clearTimeout(f),a===`c`){let t=new URL(location.href);t.hash=e?`collections`:``,history.replaceState(null,``,t)}document.body.classList.toggle(`menu-closing`,!e),document.body.classList.toggle(`menu-open`,e),c.setAttribute(`aria-expanded`,String(e)),c.querySelector(`span`).textContent=e?``:a===`c`?`Collections`:`Menu`,c.setAttribute(`aria-label`,e?`Close menu`:a===`c`?`Open collections`:`Open menu`),l.hidden=!e&&a!==`c`,l.inert=!e,l.setAttribute(`aria-hidden`,String(!e)),u.inert=e,d.hidden=!e,e||(matchMedia(`(prefers-reduced-motion:reduce)`).matches?p():f=setTimeout(p,900)),e?t&&l.querySelector(`a`).focus({preventScroll:!0}):c.focus({preventScroll:!0}),o()}if(c.setAttribute(`aria-label`,`Open menu`),c.addEventListener(`click`,e=>m(c.getAttribute(`aria-expanded`)!==`true`,e.detail===0)),d.addEventListener(`click`,()=>m(!1)),document.addEventListener(`keydown`,e=>{if(e.key===`Tab`&&o(),c.getAttribute(`aria-expanded`)===`true`&&(e.key===`Escape`&&(e.preventDefault(),m(!1)),e.key===`Tab`)){let t=[...l.querySelectorAll(`a`),c],n=t[0],r=t[t.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),r.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n.focus())}}),a===`c`){document.title=`Sheep’s Photography`,c.setAttribute(`aria-label`,`Open collections`),c.querySelector(`span`).textContent=`Collections`,l.innerHTML=`
    <div class="menu-actions">
      <a href="mailto:speedsheep55@gmail.com">Contact me</a>
      <a href="${r}?view=studio">Visit my workshop</a>
    </div>
    <div class="menu-primary">
      <div class="menu-row" style="--row:0"><div class="menu-line"><a href="${r}?view=scenes"><span data-roll>Atlas</span></a></div></div>
      <div class="menu-row" style="--row:1"><div class="menu-line"><a href="${r}?view=portraits"><span data-roll>Portraits</span></a></div></div>
      <div class="menu-row" style="--row:2"><div class="menu-line"><a href="${r}?view=street"><span data-roll>Street</span></a></div></div>
    </div>
    <a class="menu-credits" href="${r}atlas/README.md">Image credits</a>`,l.hidden=!1,l.setAttribute(`aria-hidden`,`true`);let e=l.querySelectorAll(`.menu-primary [data-roll]`);for(let t of e){let e=t.textContent;t.closest(`a`).setAttribute(`aria-label`,e),t.classList.add(`roll-word`),t.setAttribute(`aria-hidden`,`true`),t.replaceChildren(...Array.from(e,e=>{let t=document.createElement(`span`);return t.className=`roll-char`,t.textContent=e===` `?`\xA0`:e,t.dataset.letter=t.textContent,t}))}c.querySelector(`i`).setAttribute(`data-collection-magnet`,``),location.hash===`#collections`&&m(!0)}