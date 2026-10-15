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
