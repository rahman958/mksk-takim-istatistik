
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper=v=>String(v||'').toLocaleUpperCase('tr-TR'),num=v=>Number.isFinite(Number(v))?Number(v):0;
const keeper=p=>/^(GK|KL|KALECİ|KALECI|KALE)$/.test(upper(p.position).trim());
let assets;
function images(){return assets??=Promise.all(['forma.jpg','güncel logo.jfif'].map(path=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Forma yüklenemedi'));i.src=new URL(path,import.meta.url).href;}))).catch(e=>{assets=null;throw e;});}
export async function paintCardShirts(root){
 try{const [kit,logo]=await images();if(!root.isConnected)return;
 root.querySelectorAll('canvas[data-card-shirt]').forEach(c=>{
  const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.scale(2,2);
  g.beginPath();g.moveTo(45,0);g.lineTo(27,7);g.lineTo(12,22);g.lineTo(0,59);g.lineTo(24,66);g.lineTo(27,46);g.lineTo(27,142);g.quadraticCurveTo(60,148,95,142);g.lineTo(95,46);g.lineTo(99,66);g.lineTo(120,59);g.lineTo(111,23);g.lineTo(94,8);g.lineTo(76,0);g.quadraticCurveTo(60,20,45,0);g.closePath();g.clip();
  if(c.dataset.keeper==='true'){g.fillStyle='#f6d32d';g.fillRect(0,0,120,146);g.drawImage(logo,76,26,17,17);}else g.drawImage(kit,14,0,267,325,0,0,120,146);
  g.restore();c.setAttribute('aria-label',c.dataset.keeper==='true'?'Kaleci forması':'Kulüp forması');
 });}catch{root.querySelectorAll('[data-card-shirt]').forEach(c=>{c.setAttribute('aria-label','MKSK forması yüklenemedi');const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.font='bold 24px Arial';g.fillStyle='#173d67';g.fillText('MKSK',20,70);});}
}
export function playerCardHtml(p,stats={},overview=null,{actions=true}={}){
 const rating=overview?.players?.[p.id]?.percent,missed=overview?Math.max(0,num(overview.matches)-num(stats.matches)):null;

 const score=rating==null?'—':num(rating).toLocaleString('tr-TR');const metrics=keeper(p)?[['MAÇ',num(stats.matches),'matches'],['YENİLEN GOL',num(stats.goals_conceded),'conceded'],['PUAN',score,'success']]:[['MAÇ',num(stats.matches),'matches'],['GOL',num(stats.goals),'goals'],['ASİST',num(stats.assists),'assists'],['PUAN',score,'success']];
 const extra=[['KAÇIRDIĞI MAÇ',missed==null?'—':missed,'missed'],['MAÇIN ADAMI',num(stats.man_of_match),'awards']];if(keeper(p)){if(num(stats.goals))extra.push(['GOL',num(stats.goals),'goals']);if(num(stats.assists))extra.push(['ASİST',num(stats.assists),'assists']);}
 return '<div class="pc-identity"><canvas width="240" height="292" data-card-shirt data-keeper="'+keeper(p)+'" role="img" aria-label="MKSK forması"></canvas><div><h3>'+esc(upper(p.full_name))+'</h3><p class="pc-position">#'+esc(p.jersey_number??'—')+' · '+esc(({F:'FORVET',GK:'KALECİ',KL:'KALECİ',STP:'SAVUNMA',OS:'ORTA SAHA'})[upper(p.position)]||upper(p.position||'MEVKİ BELİRTİLMEDİ'))+'</p></div>'+(actions?'<button type="button" class="pc-actions" aria-haspopup="dialog">İŞLEMLER ⋮</button>':'')+'</div><dl class="pc-metrics '+(keeper(p)?'pc-keeper-metrics':'')+'">'+metrics.map(([label,value,key])=>'<div data-pc-stat="'+key+'"><dd>'+esc(value)+'</dd><dt>'+esc(label)+'</dt></div>').join('')+'</dl><dl class="pc-additional">'+extra.map(([label,value,key])=>'<div data-pc-stat="'+key+'"><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl><small class="pc-season-caption">'+esc(stats.season||'')+(overview?' · TAKIM '+num(overview.matches)+' MAÇ':'')+'</small>';

}
const fields=items=>'<div class="pc-info">'+items.map(([label,value])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value??'—')+'</strong></div>').join('')+'</div>';
const date=v=>v&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10).split('-').reverse().join('.'):'—';
export function initSelfPlayerCard(api){
 let root=null,ticket=0,dispose=null;
 function clear(){ticket++;dispose?.();dispose=null;root?.remove();root=null;}
 async function refresh(){
  const p=api.record(),season=api.season(),parent=document.getElementById('player-view');if(!p?.id||!parent)return;
  clear();const version=ticket;
  root=document.createElement('article');root.className='pc-card self-player-card';root.dataset.playerId=p.id;
  const shell=document.getElementById('simple-player-menu');shell?shell.after(root):parent.prepend(root);
  parent.classList.add('player-card-enabled');const own=root;own.innerHTML='<p role="status">Oyuncu kartın hazırlanıyor…</p>';visibility(api.page());
  let overview=null;try{const r=await api.db.rpc('club_dashboard_totals',{p_season:season});if(!r.error)overview=r.data;}catch{}
  if(version!==ticket||!own.isConnected||api.record()?.id!==p.id)return;
  const stats=(p.player_season_stats||[]).find(s=>s.season===season)||{season,matches:0,goals:0,assists:0,man_of_match:0};
  own.innerHTML=playerCardHtml(p,stats,overview,{actions:false})+'<details class="pc-details"><summary>DETAYLARI GÖSTER</summary><div class="pc-self-details"><h4>SON MAÇLAR</h4><div class="pc-self-history" role="status"></div><details class="pc-self-report"><summary><span class="pc-report-heading">▥ AYLIK RAPORLARIM</span><span class="pc-report-month">SEZON GENELİ ›</span></summary><div class="pc-self-monthly"></div></details><h4>OYUNCU BİLGİLERİ</h4>'+fields([['DOĞUM TARİHİ',date(p.birth_date)],['TAKIMA GİRİŞ',p.joined_at?date(p.joined_at):p.join_year],['DURUM',p.status],['OYUNCU GRUBU',p.group_name],['YÖNETİM GÖREVİ',p.management_role||'YOK']])+'<details class="pc-own-coach"><summary>YÖNETİCİ RAPORUM / GELİŞİM HEDEFİM</summary><div></div></details><h4>DİSİPLİN VE CEZA</h4><div class="pc-self-penalties" role="status"></div></div></details>';
  void paintCardShirts(own);
  const detail=own.querySelector('.pc-details'),report=own.querySelector('.pc-self-report'),reportRoot=own.querySelector('.pc-self-monthly');let loaded=false;
  dispose=()=>reportRoot.querySelector('.monthly-inline')?.close();
  report.ontoggle=()=>{if(report.open&&!reportRoot.children.length)void api.monthly(reportRoot,report.dataset.month||null);else if(!report.open)reportRoot.querySelector('.monthly-inline')?.close();};
  own.querySelector('.pc-own-coach').ontoggle=()=>{
   const node=own.querySelector('.pc-own-coach');if(!node.open)return;const original=document.getElementById('player-report');const container=node.querySelector('div');
   if(original){const clone=original.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));clone.querySelectorAll('button,input,textarea,select,form').forEach(n=>n.remove());container.replaceChildren(clone);}else container.innerHTML=fields([['GELİŞİM HEDEFİ',p.development_goal],['YÖNETİCİ RAPORU',p.player_note||'Henüz rapor yazılmadı.']]);
  };
  detail.ontoggle=async()=>{
   detail.querySelector('summary').textContent=detail.open?'DETAYLARI GİZLE':'DETAYLARI GÖSTER';if(!detail.open||loaded)return;loaded=true;
   const history=own.querySelector('.pc-self-history'),penalties=own.querySelector('.pc-self-penalties');history.textContent='Maçların yükleniyor…';penalties.textContent='Ceza durumu yükleniyor…';
   const results=await Promise.allSettled([api.db.rpc('club_player_match_status',{p_player:p.id,p_season:season}),api.db.from('player_penalties').select('reason,given_on,total_matches,served_matches').eq('player_id',p.id).eq('season',season).eq('cancelled',false)]);
   if(version!==ticket||!own.isConnected||api.record()?.id!==p.id)return;
   const games=results[0].status==='fulfilled'?results[0].value:null,penalty=results[1].status==='fulfilled'?results[1].value:null;
   if(!games||games.error){history.textContent='Maç geçmişi yüklenemedi. Detayları kapatıp yeniden açabilirsin.';loaded=false;}
   else{
    const played=(games.data||[]).filter(m=>m.status==='OYNADI').sort((a,b)=>String(b.match_date).localeCompare(String(a.match_date)));
    const recent=played.slice(0,5).reverse();const lastMonth=played.map(m=>String(m.match_date||'').slice(0,7)).find(m=>/^\d{4}-\d{2}$/.test(m));if(lastMonth&&!report.open){report.dataset.month=lastMonth;report.querySelector('.pc-report-month').textContent=new Date(lastMonth+'-01T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).toLocaleUpperCase('tr-TR')+' ›';}

    const graph=document.createElement('details');graph.className='pc-own-form';graph.innerHTML='<summary>SON 5 MAÇIN PUAN GRAFİĞİ</summary>'+(recent.length?'<div class="pc-form">'+recent.map(m=>'<div><b>'+esc(m.points==null?'—':num(m.points))+'</b><small>'+esc(date(m.match_date))+'</small></div>').join('')+'</div><p class="pc-help">Maç puanları 10 üzerindendir.</p>':'<p>Puanlı maç kaydı yok.</p>');own.querySelector('.pc-own-form')?.remove();own.querySelector('.pc-self-details').append(graph);
    history.innerHTML=played.map(m=>'<article class="pc-history-row"><strong>'+esc(m.opponent)+' · '+esc(date(m.match_date))+'</strong><p>'+num(m.goals)+' GOL · '+num(m.assists)+' ASİST · '+(m.points==null?'PUAN GİRİLMEDİ':esc(m.points)+' / 10 PUAN')+'</p><small>MAÇIN ADAMI: '+(m.man_of_match===true||num(m.man_of_match)>0?'EVET':'HAYIR')+'</small></article>').join('')||'<p>Bu sezon için oynanmış maç kaydı yok.</p>';

   }
   if(!penalty||penalty.error)penalties.textContent='Ceza durumu yüklenemedi.';
   else{const active=(penalty.data||[]).filter(c=>num(c.total_matches)-(c.served_matches||[]).length>0);penalties.innerHTML=active.length?active.map(c=>'<p>'+esc(c.reason)+' · '+Math.max(0,num(c.total_matches)-(c.served_matches||[]).length)+' MAÇ KALDI</p>').join(''):'<p class="pc-clear">Devam eden maç cezası yok.</p>';}
  };
 }
 function visibility(page){if(root)root.hidden=page!=='hub_profile';}
 return {refresh,visibility,clear};
}
