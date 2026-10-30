document.querySelectorAll('.club-backbar').forEach(b=>b.remove());
(()=>{if(document.getElementById('club-clock'))return;const b=document.createElement('aside');b.id='club-clock';b.setAttribute('aria-label','Türkiye tarih ve saati');b.innerHTML='<time></time><small>TÜRKİYE SAATİ</small>';(document.querySelector('main')||document.body).prepend(b);const f=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'long',year:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});function tick(){const n=new Date(),t=b.querySelector('time');t.dateTime=n.toISOString();t.textContent=f.format(n).toLocaleUpperCase('tr-TR');}tick();setInterval(()=>{if(!document.hidden)tick();},1000);document.addEventListener('visibilitychange',tick);const s=document.createElement('style');s.textContent='#club-clock{width:fit-content;max-width:100%;margin:0 0 14px auto;padding:10px 16px;box-sizing:border-box;border:1px solid #8172c6;border-radius:14px;background:linear-gradient(120deg,#283b83,#59418d);color:#fff;box-shadow:0 4px 14px #18244f24;text-align:right;font-size:13px;font-weight:800}#club-clock time{display:block;color:#fff}#club-clock small{display:block;color:#ffe587;font-size:10px;margin-top:4px}@media(max-width:520px){#club-clock{font-size:11px;padding:9px 12px}}';document.head.appendChild(s);})();

(()=>{const s=document.createElement('style');s.id='club-menu-arrangement';s.textContent=`
#dashboard-nav button{order:30}
#dashboard-nav [data-page="roster"]{order:0;background:linear-gradient(120deg,#17457c,#286b9d)!important;color:#fff!important}
#dashboard-nav [data-page="statistics"]{order:1;background:linear-gradient(120deg,#6541a6,#3b60ae)!important;color:#fff!important}
#dashboard-nav [data-page="messages"]{order:2;background:linear-gradient(120deg,#9d3c88,#6644a0)!important;color:#fff!important}
#dashboard-nav .form-launch{order:3}
#dashboard-nav [data-page="lineups"]{order:4;background:linear-gradient(120deg,#a9368c,#663dae)!important;color:#fff!important}
#dashboard-nav [data-page="penalties"]{order:6}
#dashboard-nav [data-page="player_info"]{order:7}
#dashboard-nav [data-page="visits"]{background:linear-gradient(120deg,#176c84,#334e99)!important;color:#fff!important}
#dashboard-nav [data-page="settings"]{order:99;background:linear-gradient(120deg,#4c567b,#343957)!important;color:#fff!important}
#dashboard-nav button.club-bulk-first{order:5}
#dashboard-nav button:focus-visible{outline:3px solid #efc94e;outline-offset:3px}
`;document.head.appendChild(s);function mark(){document.querySelectorAll('#dashboard-nav button').forEach(b=>{if(b.textContent.trim().toLocaleUpperCase('tr-TR')==='MAÇI TOPLU İŞLE'&&!b.classList.contains('club-bulk-first'))b.classList.add('club-bulk-first');});}mark();new MutationObserver(mark).observe(document.body,{childList:true,subtree:true});})();

// Contextual section navigation: in-flow, never a fixed screen control.
(()=>{if(document.getElementById('club-section-back-style'))return;const style=document.createElement('style');style.id='club-section-back-style';style.textContent=`
.club-section-return{display:flex;align-items:center;gap:14px;justify-content:space-between;margin:18px 0;padding:14px 16px;border:1px solid #aa98d4;border-radius:16px;background:linear-gradient(120deg,#ede7ff,#e5efff);box-shadow:0 5px 16px #28376612;scroll-margin-top:16px}
.club-section-return[hidden]{display:none!important}.club-section-return button{flex-shrink:0;min-height:44px;padding:11px 20px;border:0;border-radius:12px;background:linear-gradient(120deg,#6845a3,#345c9a);color:white;font:inherit;font-weight:800;cursor:pointer}.club-section-return button:focus-visible{outline:3px solid #d6ad2e;outline-offset:3px}.club-section-return span{font-size:12px;font-weight:800;color:#344b79;text-align:right}.club-section-return button::before{content:'←';margin-right:9px}
[data-theme="dark"] .club-section-return{background:linear-gradient(120deg,#30254c,#203653);border-color:#72639b}[data-theme="dark"] .club-section-return span{color:#ece6ff}
`;document.head.appendChild(style);const bars=new Map();let ticket=0;function openSection(nav,source){const root=nav.closest('#admin-view,#player-view');if(!root||!nav.getClientRects().length)return;let bar=bars.get(nav);if(!bar||!bar.isConnected){bar=document.createElement('div');bar.className='club-section-return';bar.innerHTML='<button type="button" aria-label="Bölümler menüsüne geri dön">GERİ</button><span></span>';root.appendChild(bar);bars.set(nav,bar);new MutationObserver(()=>{if(bar.isConnected&&root.lastElementChild!==bar)root.appendChild(bar);}).observe(root,{childList:true});bar.querySelector('button').addEventListener('click',()=>{ticket++;bar.hidden=true;nav.scrollIntoView({block:'start',behavior:'auto'});const target=bar._source;if(target&&target.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});});}bar._source=source;bar.querySelector('span').textContent=source.textContent.trim().toLocaleUpperCase('tr-TR');bar.hidden=false;if(root.lastElementChild!==bar)root.appendChild(bar);}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const nav=button.closest('#dashboard-nav,#player-nav');if(!nav)return;const current=++ticket;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(current===ticket&&!document.querySelector('dialog[open]'))openSection(nav,button);}));},true);
})();


// When a section tab is selected, bring that section into view automatically.
(()=>{if(window.__mkskAutoSectionScroll)return;window.__mkskAutoSectionScroll=true;
const adminTargets={roster:'roster-list',statistics:'share-actions',messages:'admin-inbox',visits:'visit-panel',settings:'season-controls',penalties:'admin-penalties',jerseys:'jersey-panel',player_info:'player-info-panel'};
const playerTargets={stats:'player-stat-order',reports:'player-report',message:'player-message-box',penalties:'player-penalties',form_graph:'player-form-graph',self_growth:'player-self-growth',my_lineup:'player-my-lineup'};
function visible(el){return !!(el&&el.isConnected&&!el.hidden&&el.getClientRects().length);}
document.addEventListener('click',event=>{const button=event.target.closest('#dashboard-nav button[data-page],#player-nav button[data-player-page]');if(!button)return;
const isPlayer=button.hasAttribute('data-player-page'),key=isPlayer?button.dataset.playerPage:button.dataset.page;
requestAnimationFrame(()=>requestAnimationFrame(()=>{
const root=document.getElementById(isPlayer?'player-view':'admin-view');if(!root)return;
let target=root.querySelector('#'+(isPlayer?playerTargets[key]:adminTargets[key]));
if(!visible(target)){
const nav=root.querySelector(isPlayer?'#player-nav':'#dashboard-nav');
target=Array.from(root.querySelectorAll('section,article,.card,[id]')).find(node=>visible(node)&&(!nav||node.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_PRECEDING));
}
if(target&&visible(target)){target.style.scrollMarginTop='14px';target.scrollIntoView({behavior:'smooth',block:'start'});}
}));});
})();
