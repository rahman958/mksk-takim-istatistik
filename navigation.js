// Section navigation stays inside the signed-in app; it never uses browser.back().
(() => {
  const stacks = new Map(), current = new Map(), baseline = new WeakMap();
  const serialize = f => JSON.stringify(Array.from(f.elements).filter(x => x.name && !x.disabled).map(x => [x.name, x.type === 'checkbox' || x.type === 'radio' ? x.checked : x.value]));
  const key = b => ['data-page','data-player-page','data-directory','data-directory-player','data-club-tool','data-lineup'].map(a => b.hasAttribute(a) ? '['+a+'="'+b.getAttribute(a)+'"]' : '').join('');
  function dirty(root) { return Array.from(root.querySelectorAll('form')).some(f => f.getClientRects().length && baseline.has(f) && baseline.get(f) !== serialize(f)); }
  document.addEventListener('focusin', e => { const f=e.target.closest('form'); if(f&&!baseline.has(f))baseline.set(f,serialize(f)); });
  document.addEventListener('reset',e=>{if(e.target.tagName==='FORM')setTimeout(()=>baseline.set(e.target,serialize(e.target)),0);});
  document.addEventListener('click',e=>{
    const b=e.target.closest('#dashboard-nav button,#player-nav button');
    if(!b||!e.isTrusted)return;
    const root=b.closest('#admin-view,#player-view'),nav=b.closest('#dashboard-nav,#player-nav'),k=key(b);
    if(!k)return;
    if(dirty(root)&&!confirm('KAYDEDİLMEMİŞ DEĞİŞİKLİKLER OLABİLİR. BU BÖLÜMDEN AYRILMAK İSTİYOR MUSUN?')){e.preventDefault();e.stopImmediatePropagation();return;}
    const old=current.get(nav.id);if(old&&old!==k)stacks.get(nav.id).push(old);current.set(nav.id,k);
  },true);
  function setup(){
    for(const id of ['dashboard-nav','player-nav']){
      const nav=document.getElementById(id);if(!nav||document.getElementById(id+'-backbar'))continue;
      const home=id==='dashboard-nav'?'[data-page="roster"]':'[data-player-page="stats"]';
      stacks.set(id,[]);current.set(id,home);
      const bar=document.createElement('div');bar.id=id+'-backbar';bar.className='club-backbar';
      bar.innerHTML='<button type="button" class="club-back">← GERİ</button><button type="button" class="club-home">⌂ ANA SAYFA</button>';
      nav.before(bar);
      function go(isHome){
        const root=nav.closest('#admin-view,#player-view');
        if(dirty(root)&&!confirm('KAYDEDİLMEMİŞ DEĞİŞİKLİKLER OLABİLİR. DEVAM EDİLSİN Mİ?'))return;
        const stack=stacks.get(id);let dest=isHome?home:stack.pop()||home;
        let target=nav.querySelector(dest);if(!target){dest=home;target=nav.querySelector(home);}
        if(isHome)stack.length=0;current.set(id,dest);target?.click();bar.scrollIntoView({behavior:'smooth',block:'start'});
      }
      bar.querySelector('.club-back').onclick=()=>go(false);bar.querySelector('.club-home').onclick=()=>go(true);
    }
  }
  const style=document.createElement('style');style.textContent='.club-backbar{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;position:relative;z-index:2}.club-backbar button{min-height:46px;padding:12px 20px;border:1px solid #b7a4ff;border-radius:14px;background:linear-gradient(135deg,#7252d6,#413090);color:#fff!important;font-weight:800;box-shadow:0 4px 12px #46328c30;cursor:pointer}.club-backbar .club-home{background:linear-gradient(135deg,#146fa1,#133c70);border-color:#6cbbe2}.club-backbar button:focus-visible{outline:3px solid #f5cd45;outline-offset:3px}@media(max-width:520px){.club-backbar button{flex:1;padding:12px 10px}}';document.head.appendChild(style);
  new MutationObserver(setup).observe(document.body,{childList:true,subtree:true});setup();
})();
