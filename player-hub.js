import {prioritizeClubPlayers,clubPlayerPriority} from './roster-export.js?v=20261119-player-order-1';
import { formatClubDate } from './club-date.js?v=20261114-date-format-1';
import {rosterGroup,sortRosterPlayers} from './roster-export.js?v=20261026-player-hub-2';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'—';
const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function modal(title){const d=document.createElement('dialog');d.className='player-hub-dialog';d.innerHTML='<header><h2>'+esc(title)+'</h2><button type="button" class="hub-close">KAPAT ×</button></header><div class="hub-content"></div>';d.querySelector('.hub-close').onclick=()=>d.close();d.onclose=()=>d.remove();document.body.appendChild(d);d.showModal();return d;}
const fields=(items)=>'<div class="hub-fields">'+items.map(([name,value])=>'<div><small>'+esc(name)+'</small><strong>'+esc(value??'—')+'</strong></div>').join('')+'</div>';
export function initPlayerHub(api){
 const db=api.db;let saving=false;
 const check=()=>!document.getElementById('admin-view')?.classList.contains('hidden');
 const allowed=area=>check()&&api.can(area);
 async function people(){const all=[];for(let n=0;;n+=500){const r=await db.from('players').select('id,full_name,jersey_number,position').is('archived_at',null).order('id').range(n,n+499);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<500)return prioritizeClubPlayers(all);}}
 async function dossier(id){
  if(!allowed('roster'))return;
  const d=modal('OYUNCU YÖNETİMİ'),box=d.querySelector('.hub-content');box.textContent='YÜKLENİYOR…';
  try{const r=await db.from('players').select('id,full_name,jersey_number,position,group_name,status,management_role,birth_date,joined_at,join_year,performance_label,development_goal,responsible_manager,team_left_on,access_disabled').eq('id',id).is('archived_at',null).single();if(r.error)throw r.error;if(!d.isConnected||!allowed('roster'))return d.close();const p=r.data;
   d.classList.add('hub-dossier');
   d.querySelector('h2').textContent='Oyuncu dosyası';
   const back=d.querySelector('.hub-close');back.textContent='‹ LİSTEYE DÖN';
   box.innerHTML=`<div class="hub-dossier-identity">
     <img src="güncel logo.jfif" alt="MKSK logosu" width="48" height="48"><h3>${esc(p.full_name)}</h3>
     <p>${[p.jersey_number,p.position?.toLocaleUpperCase('tr-TR')].filter(value=>value!=null&&value!=='').map(esc).join(' · ')}</p>
   </div>
   <section class="hub-season-overview">
     <label>Sezon<select class="hub-season"></select></label>
     <h3>Sezon özeti</h3><div class="hub-season-data" aria-live="polite"></div>
     <h3>Son 5 maçın puanı</h3><div class="hub-season-chart" aria-live="polite"></div>
     <h3>Maç geçmişi</h3><div class="hub-season-matches" aria-live="polite"></div>
   </section>
   <details open class="hub-profile-details" id="hub-info"><summary>Oyuncu bilgileri</summary>
     ${fields([['OYUNCU GRUBU',p.group_name],['PERFORMANS DURUMU',p.performance_label],['SORUMLU YÖNETİCİ',p.responsible_manager],['UYGULAMA ERİŞİMİ',p.access_disabled?'Kapalı':'Açık'],['DURUM',p.status],['YÖNETİM GÖREVİ',p.management_role],['DOĞUM TARİHİ',formatClubDate(p.birth_date)],['TAKIMA GİRİŞ',p.joined_at?formatClubDate(p.joined_at):p.join_year]])}
   </details>
   <div class="hub-actions"><button type="button" class="hub-edit">BİLGİLERİ DÜZENLE</button></div>
   <div class="hub-extras">
     <details open class="hub-stats-group"><summary>İstatistik ayrıntıları ve düzenleme</summary><div class="hub-actions"></div><div class="hub-season-detail"></div></details>
     <details open class="hub-invite-group"><summary>Davet ve Hesap</summary><div class="hub-actions"></div></details>
     <details open class="hub-discipline-group"><summary>İzin ve Disiplin</summary><div class="hub-actions"></div></details>
   </div>`;
   const actions=box.querySelector('.hub-actions');for(const [key,label,area] of [['match','İstatistik ve Puanı Düzenle','statistics'],['penalties','Ceza / Uyarı Ekle','penalties'],['discipline','Disiplin Sevki','penalties'],['leave','İzin Ver','leaves'],['messages','Mesaj Gönder','messages']]){if(!(allowed(area)||(key==='match'&&allowed('matches'))))continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.hubAction=key;b.onclick=async()=>{b.disabled=true;try{await api.action?.(key,id,p.full_name);}catch(error){alert('İşlem açılamadı: '+error.message);}finally{b.disabled=false;}};const group=key==='match'?'.hub-stats-group':['penalties','discipline','leave'].includes(key)?'.hub-discipline-group':null;(group?box.querySelector(group+' .hub-actions'):actions).appendChild(b);}
   const invite=box.querySelector('.hub-invite-group'),discipline=box.querySelector('.hub-discipline-group');
   invite.hidden=!(allowed('roster')||allowed('links'));
   if(allowed('roster')||allowed('links'))api.mountInvite?.(invite.querySelector('.hub-actions'),id);
   discipline.hidden=!allowed('leaves')&&!allowed('penalties');
   box.querySelector('.hub-edit').onclick=async()=>{if(await api.edit(id)){d.close();void dossier(id);}};
   const monthly=document.createElement('button');monthly.type='button';monthly.textContent='AYLIK RAPORLARI';monthly.hidden=!allowed('analytics');monthly.onclick=()=>api.monthly?.(id);actions.append(monthly);
   const reports=document.createElement('button');reports.type='button';reports.textContent='RAPOR / HEDEF YAZ';reports.hidden=!allowed('reports');reports.onclick=async()=>{if(await api.edit(id,'reports')){d.close();void dossier(id);}};actions.append(reports);
   const training=document.createElement('button');training.type='button';training.textContent='ANTRENMANI DÜZENLE';training.hidden=!allowed('training');training.onclick=()=>api.action?.('training',id,p.full_name);actions.append(training);
   const reload=document.createElement('button');reload.type='button';reload.textContent='DOSYAYI YENİLE';reload.onclick=()=>{d.close();void dossier(id);};actions.append(reload);
   const note=document.createElement('p');note.className='hub-context-note';note.textContent='Bütün işlemler '+p.full_name+' için açılır. Alt pencereden dönünce bu dosya açık kalır.';actions.before(note);
   const danger=document.createElement('section');danger.className='hub-danger';danger.innerHTML='<h3>Takımdan çıkarma</h3><p>Oyuncu aktif listeden kaldırılır; geçmiş kayıtları korunur.</p><button type="button">TAKIMDAN ÇIKAR</button><p role="status"></p>';danger.hidden=!allowed('roster');box.append(danger);
   danger.querySelector('button').onclick=async event=>{if(!confirm(p.full_name+' takımdan çıkarılsın mı? Aktif listelerde görünmez. Silinen Oyuncular bölümünden geri alınabilir.'))return;const b=event.currentTarget;b.disabled=true;try{if(!allowed('roster'))throw Error('Oyuncu yönetimi yetkin kapalı.');const q=await db.rpc('club_archive_player',{target_player:id,restore_player:false});if(q.error)throw q.error;await api.changed?.();d.close();document.dispatchEvent(new Event('mksk-player-directory-refresh'));}catch(error){danger.querySelector('[role=status]').textContent='Çıkarılamadı: '+error.message;b.disabled=false;}};
   const overview=box.querySelector('.hub-season-overview');
   const detail=box.querySelector('.hub-season-detail');
   overview.hidden=!allowed('statistics');
   detail.closest('details').hidden=!allowed('statistics')&&!allowed('matches');
   if(allowed('statistics')){
     const season=overview.querySelector('select');
     const totals=overview.querySelector('.hub-season-data');
     const chart=overview.querySelector('.hub-season-chart');
     const history=overview.querySelector('.hub-season-matches');
     season.disabled=true;
     totals.textContent='Sezon istatistikleri yükleniyor…';
     try{
       const q=await db.from('player_season_stats')
         .select('season,matches,goals,assists,goals_conceded,man_of_match,points,attendance_matches,attendance_goals,attendance_points')
         .eq('player_id',id);
       if(q.error)throw q.error;
       const bySeason=new Map((q.data||[]).map(row=>[row.season,row]));
       const current=api.season();
       const seasons=[...new Set([current,...bySeason.keys()])].filter(Boolean).sort().reverse();
       season.replaceChildren(...seasons.map(value=>new Option(value+(value===current?' · Güncel sezon':''),value)));
       season.value=current;
       season.disabled=false;
       let request=0;
       async function drawSeason(){
         const version=++request,selected=season.value;
         const row=bySeason.get(selected);
         let overview=null;try{const o=await db.rpc('club_dashboard_totals',{p_season:selected});if(!o.error)overview=o.data;}catch{}if(version!==request||!d.open)return;
         const rating=overview?.players?.[id],avg=rating?.rated_matches?Number(rating.rated_points)/Number(rating.rated_matches):null;
         totals.innerHTML=row?fields([['Maç',row.matches],['Gol',row.goals],['Asist',row.assists],['Ortalama puan',avg==null?'—':avg.toLocaleString('tr-TR',{maximumFractionDigits:1})+' / 10'],['Başarı',rating?.percent==null?'—':rating.percent+'%'],['Kaçırdığı maç',overview?Math.max(0,Number(overview.matches||0)-Number(row.matches||0)):'—']]):'<p>Bu sezonda istatistik kaydı yok.</p>';
         detail.innerHTML=row?fields([['Yediği gol',row.goals_conceded],['Maçın adamı',row.man_of_match],['Antrenman',row.attendance_matches],['Antrenman golü',row.attendance_goals],['Antrenman puanı',row.attendance_points]]):'';
         chart.textContent='Puan grafiği yükleniyor…';
         history.textContent='Maç geçmişi yükleniyor…';
         try{
           const cards=await db.from('club_match_entries')
             .select('match_date,opponent,our_score,opponent_score,player_entries')
             .eq('season',selected).is('cancelled_at',null)
             .order('match_date',{ascending:false});
           if(cards.error)throw cards.error;
           if(version!==request||!d.open||!allowed('statistics'))return;
           const matches=[];
           for(const match of cards.data||[]){
             const entry=Array.isArray(match.player_entries)&&match.player_entries.find(item=>item?.player_id===id&&item.played!==false);
             if(entry)matches.push({match,entry});
           }
           history.innerHTML=matches.length?matches.map(({match,entry})=>`<article class="hub-season-match" tabindex="-1">
             <div class="hub-season-match-head">
               <div><strong>${esc(match.opponent)}</strong><small>${esc(formatClubDate(match.match_date))} · Oynadı</small></div>
               <strong class="hub-season-match-score" aria-label="Takım skoru ${esc(match.our_score)}–${esc(match.opponent_score)}">${esc(match.our_score)}–${esc(match.opponent_score)}</strong>
             </div>
             <dl class="hub-match-performance">
               <div><dt>Gol</dt><dd>${esc(entry.goals)}</dd></div>
               <div><dt>Asist</dt><dd>${esc(entry.assists)}</dd></div>
               <div><dt>Puan</dt><dd>${entry.points==null||entry.points===''?'—':esc(entry.points)+' / 10'}</dd></div>
             </dl>
           </article>`).join(''):'<p>Bu sezonda oyuncuya ait maç kartı yok.</p>';
           if(matches.length){
             const recent=matches.slice(0,5).reverse();
             chart.innerHTML='<div class="hub-chart-scale" aria-hidden="true"><span>10</span><span>5</span><span>0</span></div><div class="hub-chart-bars">'+recent.map(({match,entry},index)=>{
               const score=entry.points==null||entry.points===''?NaN:Number(entry.points);
               const rated=Number.isFinite(score)&&score>=0&&score<=10;
               const date=formatClubDate(match.match_date);
               const detail=rated?score.toLocaleString('tr-TR')+' / 10':'Puan girilmedi';
               return `<button type="button" data-match-index="${recent.length-1-index}" aria-label="${esc(match.opponent)} · ${esc(date)} · ${esc(detail)}">
                 <span class="hub-chart-track" aria-hidden="true">${rated?`<span class="hub-chart-bar" style="height:${score*10}%"></span>`:''}</span>
                 <span class="hub-chart-value">${rated?esc(score.toLocaleString('tr-TR')):'—'}</span>
                 <span class="hub-chart-date">${esc(date.slice(0,5))}</span>
               </button>`;
             }).join('')+'</div>';
             const cards=history.querySelectorAll('.hub-season-match');
             chart.querySelectorAll('button').forEach(button=>button.onclick=()=>{
               const card=cards[Number(button.dataset.matchIndex)];
               card.focus({preventScroll:true});
               card.scrollIntoView({block:'center'});
             });
           }else{
             chart.textContent='Bu sezonda grafik için maç kaydı yok.';
           }
         }catch(error){
           if(version===request&&d.open){
             chart.textContent='Puan grafiği yüklenemedi.';
             history.textContent='Maç geçmişi yüklenemedi.';
           }
         }
       }
       season.onchange=drawSeason;
       void drawSeason();
     }catch(error){
       totals.textContent='Sezon istatistikleri yüklenemedi.';
       chart.textContent='Puan grafiği yüklenemedi.';
     }
   }
   const extra=box.querySelector('.hub-extras');
   async function section(title,area,load,render){if(!allowed(area))return;const part=document.createElement('details');part.innerHTML='<summary>'+esc(title)+'</summary><div>Yükleniyor…</div>';((area==='leaves'||area==='penalties')?discipline:extra).appendChild(part);part.ontoggle=async()=>{if(!part.open||part.dataset.loaded)return;part.dataset.loaded='1';try{if(!allowed(area))throw Error('Bu alanın yetkisi kapalı.');const data=await load();if(!d.isConnected||!allowed(area))return;part.querySelector('div').innerHTML=render(data)||'<p>Kayıt yok.</p>';}catch(e){part.dataset.loaded='';part.querySelector('div').textContent='Açılamadı: '+e.message;}};part.open=true;}
   await section('GELİŞİM / YÖNETİM RAPORLARI','reports',async()=>{const q=await db.from('player_report_history').select('body,created_at,author_name').eq('player_id',id).is('deleted_at',null).order('created_at',{ascending:false}).limit(100);if(q.error)throw q.error;return q.data;},rows=>'<p>GELİŞİM HEDEFİ: '+esc(p.development_goal)+'</p>'+rows.map(x=>'<article><small>'+esc(date(x.created_at))+' · '+esc(x.author_name)+'</small><p>'+esc(x.body)+'</p></article>').join(''));
   await section('CEZA GEÇMİŞİ','penalties',async()=>{const q=await db.from('player_penalties').select('season,reason,given_on,total_matches,served_matches').eq('player_id',id).eq('cancelled',false).order('given_on',{ascending:false});if(q.error)throw q.error;return q.data;},rows=>rows.map(x=>'<article><strong>'+esc(x.season)+' · '+esc(x.reason)+'</strong><p>'+esc(formatClubDate(x.given_on))+' · KALAN: '+Math.max(0,x.total_matches-(x.served_matches||[]).length)+' MAÇ</p></article>').join(''));
   await section('İZİN GEÇMİŞİ','leaves',async()=>{const q=await db.from('club_leave_periods').select('person_name,starts_on,ends_on,public_reason,enabled');if(q.error)throw q.error;return q.data.filter(x=>norm(x.person_name)===norm(p.full_name));},rows=>rows.map(x=>'<article><strong>'+esc(formatClubDate(x.starts_on))+' — '+esc(formatClubDate(x.ends_on))+'</strong><p>'+esc(x.public_reason||'İzin nedeni belirtilmedi')+'</p></article>').join(''));
   await section('UYARILAR','penalties',async()=>{const q=await db.rpc('club_warnings',{p_action:'list',p_data:{season:api.season(),player_id:id}});if(q.error)throw q.error;return(q.data.items||[]).filter(x=>x.player_id===id);},rows=>rows.map(x=>'<article><strong>'+esc(formatClubDate(x.given_on))+'</strong><p>'+esc(x.reason)+'</p></article>').join(''));
   // The award RPC enforces its own access rules and returns explicit player identities.
   await section('BAŞARILAR / SEZON ÖDÜLLERİ','archives',async()=>{const q=await db.rpc('club_read_season_awards',{p_player:id});if(q.error)throw q.error;return (q.data.awards||[]).filter(a=>a.mine===true);},rows=>rows.map(x=>'<article><strong>'+esc(x.season)+'</strong><p>'+esc(x.category||x.title||x.award_name)+'</p></article>').join(''));
  }catch(e){if(d.isConnected)box.textContent='DOSYA AÇILAMADI: '+e.message;}
 }
 async function openDirectory(initial='active'){
  if(!allowed('roster'))return;
  const existing=document.querySelector('.hub-player-center[open]');if(existing)return existing.focus();
  const d=modal('OYUNCU YÖNETİMİ'),box=d.querySelector('.hub-content');d.classList.add('hub-player-center');
  box.innerHTML='<p>Oyuncuların tamamı aşağıda. Bir oyuncuyu seç, bütün işlemlerini dosyasından aç.</p><div class="hub-center-toolbar"><label>İsim / forma numarası ara<input class="hub-center-search" type="search" placeholder="Ad soyad veya forma no" autocomplete="off"></label><button type="button" class="hub-center-refresh">YENİLE</button></div><nav class="hub-center-tabs" aria-label="Oyuncu listesi"><button type="button" data-center="active">OYUNCULAR</button>'+(api.owner()?'<button type="button" data-center="archived">SİLİNEN OYUNCULAR</button>':'')+'</nav><p class="hub-center-status" role="status"></p><div class="hub-person-list"></div>';
  let rows=[],mode=initial==='archived'&&api.owner()?'archived':'active',request=0;
  const status=box.querySelector('.hub-center-status'),search=box.querySelector('input'),list=box.querySelector('.hub-person-list');
  async function load(){
   const token=++request;status.textContent='Oyuncular yükleniyor…';list.replaceChildren();
   try{
    if(!allowed('roster')||mode==='archived'&&!api.owner())throw Error('Bu liste için yetkin yok.');
    const all=[];for(let n=0;;n+=500){
     let q=db.from('players').select('id,full_name,jersey_number,position,group_name,status,archived_at,access_disabled'+(allowed('statistics')?',player_season_stats(season,matches,goals,assists)':''));
     q=mode==='archived'?q.not('archived_at','is',null):q.is('archived_at',null);
     const r=await q.order('id').range(n,n+499);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<500)break;
    }
    if(token!==request||!d.open)return;rows=prioritizeClubPlayers(all);draw();
   }catch(error){if(token===request&&d.open)status.textContent='Liste açılamadı: '+error.message;}
  }
  function draw(){
   const term=norm(search.value).trim(),shown=rows.filter(p=>norm(p.full_name+' '+(p.jersey_number??'')).includes(term));
   box.querySelectorAll('[data-center]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.center===mode)));
   status.textContent=shown.length+' / '+rows.length+' OYUNCU';
   list.innerHTML=shown.map(p=>{const stats=(p.player_season_stats||[]).find(s=>s.season===api.season());return '<article class="hub-center-person"><button type="button" class="hub-center-open" data-person="'+esc(p.id)+'" '+(mode==='archived'?'disabled':'')+'><span class="hub-center-jersey">'+esc(p.jersey_number??'—')+'</span><span><strong>'+esc(p.full_name)+'</strong><small>'+esc((p.position||'Mevki belirtilmedi').toLocaleUpperCase('tr-TR'))+' · '+esc(p.group_name||'Grup belirtilmedi')+'</small><small>'+esc(p.status||'Durum belirtilmedi')+(p.access_disabled?' · Erişim kapalı':'')+'</small>'+(stats?'<small>'+esc(stats.matches??0)+' maç · '+esc(stats.goals??0)+' gol · '+esc(stats.assists??0)+' asist</small>':'')+'</span>'+(mode==='active'?'<b aria-hidden="true">›</b>':'')+'</button>'+(mode==='archived'?'<p>Silinme: '+esc(date(p.archived_at))+'</p><button type="button" data-restore="'+esc(p.id)+'">GERİ AL</button>':'')+'</article>';}).join('')||'<p>Bu aramaya uygun oyuncu yok.</p>';
   list.querySelectorAll('[data-person]:not([disabled])').forEach(b=>b.onclick=()=>dossier(b.dataset.person));
   list.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{const p=rows.find(x=>x.id===b.dataset.restore);if(!confirm(p.full_name+' geri alınsın mı? Yönetici yetkileri otomatik açılmaz.'))return;b.disabled=true;try{if(!api.owner())throw Error('Ana yönetici yetkisi gerekiyor.');const r=await db.rpc('club_archive_player',{target_player:p.id,restore_player:true});if(r.error)throw r.error;await api.changed?.();await load();}catch(error){status.textContent='Geri alınamadı: '+error.message;b.disabled=false;}});
  }
  search.oninput=draw;box.querySelector('.hub-center-refresh').onclick=load;box.querySelectorAll('[data-center]').forEach(b=>b.onclick=()=>{mode=b.dataset.center;void load();});
  const refresh=()=>{if(d.open)void load();};document.addEventListener('mksk-player-directory-refresh',refresh);
  d.addEventListener('close',()=>{request++;document.removeEventListener('mksk-player-directory-refresh',refresh);},{once:true});
  await load();
 }
 async function orderDialog(){if(!check()||!api.owner())return;const d=modal('TAKIM LİSTESİNİN SIRASI'),box=d.querySelector('.hub-content');box.textContent='YÜKLENİYOR…';try{const response=await db.rpc('club_roster_order',{p_action:'get'});if(response.error)throw response.error;let revision=response.data.revision;let rows=sortRosterPlayers(await people(),response.data.ids||[]),dirty=false;
   const draw=()=>{box.innerHTML='<p>RAHMAN İSMAİL BENEK EN ÜSTTE SABİT. OYUNCULARI KENDİ MEVKİ GRUPLARINDA TAŞI.</p><div class="hub-order-list">'+rows.map((p,i)=>{const fixed=norm(p.full_name)==='rahman ismail benek',up=i>0&&rosterGroup(rows[i-1])===rosterGroup(p)&&norm(rows[i-1].full_name)!=='rahman ismail benek',down=i<rows.length-1&&rosterGroup(rows[i+1])===rosterGroup(p);return '<article><strong>'+esc(p.full_name)+'</strong><small>'+esc(rosterGroup(p))+'</small>'+(!fixed?'<button type="button" data-move="-1" data-index="'+i+'" '+(!up?'disabled':'')+' aria-label="'+esc(p.full_name)+' yukarı">↑ YUKARI</button><button type="button" data-move="1" data-index="'+i+'" '+(!down?'disabled':'')+' aria-label="'+esc(p.full_name)+' aşağı">↓ AŞAĞI</button>':'<small>SABİT</small>')+'</article>';}).join('')+'</div><footer><button type="button" class="hub-save" '+(!dirty?'disabled':'')+'>SIRALAMAYI KAYDET</button><p role="status">'+(dirty?'DEĞİŞİKLİKLER HENÜZ KAYDEDİLMEDİ':'')+'</p></footer>';
   box.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.index),j=i+Number(b.dataset.move);[rows[i],rows[j]]=[rows[j],rows[i]];dirty=true;draw();});box.querySelector('.hub-save').onclick=async e=>{if(saving)return;e.target.disabled=true;saving=true;try{if(!api.owner())throw Error('Sıralama yetkin kapatıldı.');const r=await db.rpc('club_roster_order',{p_action:'save',p_ids:rows.map(p=>p.id),p_revision:revision});if(r.error)throw r.error;revision=r.data.revision;dirty=false;box.querySelector('[role=status]').textContent='SIRALAMA KAYDEDİLDİ. YENİ PAYLAŞILAN LİSTEDE KULLANILACAK.';}catch(err){box.querySelector('[role=status]').textContent='KAYDEDİLEMEDİ: '+err.message;e.target.disabled=false;}finally{saving=false;}};};
   d.oncancel=e=>{if(saving||dirty&&!confirm('Kaydedilmemiş sıralama değişikliklerinden vazgeçilsin mi?'))e.preventDefault();};d.querySelector('.hub-close').onclick=()=>{if(!saving&&(!dirty||confirm('Kaydetmeden kapatılsın mı?')))d.close();};draw();
  }catch(e){box.textContent='SIRALAMA AÇILAMADI: '+e.message;}}
 async function readers(batch){if(!allowed('messages'))return;const d=modal('KİM OKUDU?'),box=d.querySelector('.hub-content');box.textContent='YÜKLENİYOR…';try{const r=await db.rpc('club_message_readers',{p_batch:batch});if(r.error)throw r.error;if(!d.isConnected||!allowed('messages'))return d.close();const rows=r.data.rows||[];box.innerHTML='<p>Mesajın gönderildiği alıcılar gösterilir. Sonradan eklenen oyuncular bu listeye eklenmez.</p><label>AD ARA<input type="search"></label><div class="hub-reader-lists"></div><button type="button" class="hub-refresh">YENİLE</button>';const draw=()=>{const q=norm(box.querySelector('input').value),all=rows.filter(x=>norm(x.name).includes(q));box.querySelector('.hub-reader-lists').innerHTML=[true,false].map(read=>'<section><h3>'+(read?'OKUYANLAR':'HENÜZ OKUMAYANLAR')+' · '+rows.filter(x=>!!x.read_at===read).length+' KİŞİ</h3>'+all.filter(x=>!!x.read_at===read).map(x=>'<article><strong>'+esc(x.name)+'</strong><small>'+esc(x.read_at?date(x.read_at):'Henüz OKUDUM demedi')+'</small></article>').join('')+'</section>').join('');};box.querySelector('input').oninput=draw;box.querySelector('.hub-refresh').onclick=()=>{d.close();readers(batch);};draw();}catch(e){box.textContent='OKUNMA LİSTESİ AÇILAMADI: '+e.message;}}

 async function matches(){if(!allowed('matches')&&!allowed('statistics'))return;const d=modal('MAÇ KARTLARI'),box=d.querySelector('.hub-content');box.textContent='YÜKLENİYOR…';try{const r=await db.from('club_match_entries').select('id,match_date,opponent,our_score,opponent_score,player_entries,cancelled_at').eq('season',api.season()).is('cancelled_at',null).order('match_date',{ascending:false}).limit(100);if(r.error)throw r.error;const players=await people(),names=new Map(players.map(p=>[p.id,p.full_name]));if(!d.isConnected)return;box.innerHTML='<p>'+esc(api.season())+' · SON 100 KAYITLI MAÇ. SEZON TOPLAMLARININ AYRI MAÇ DETAYI OLMAYABİLİR.</p>'+r.data.map(m=>'<details class="hub-match-card"><summary>'+esc(formatClubDate(m.match_date))+' · '+esc(m.opponent)+' · '+m.our_score+'–'+m.opponent_score+'</summary><p>'+ (m.our_score>m.opponent_score?'GALİBİYET':m.our_score<m.opponent_score?'MAĞLUBİYET':'BERABERLİK')+'</p>'+(m.player_entries||[]).map(p=>'<article><strong>'+esc(names.get(p.player_id)||'ARŞİVLENMİŞ OYUNCU')+'</strong><p>GOL: '+esc(p.goals??0)+' · ASİST: '+esc(p.assists??0)+' · PUAN: '+esc(p.points??'GİRİLMEDİ')+'</p></article>').join('')+'</details>').join('');if(!r.data.length)box.innerHTML+='<p>BU SEZONDA AYRI MAÇ KAYDI YOK.</p>';}catch(e){box.textContent='AÇILAMADI: '+e.message;}}
 function setup(){const nav=document.getElementById('dashboard-nav');if(!nav)return;let launch=nav.querySelector('.hub-directory');if(!launch){launch=document.createElement('button');launch.type='button';launch.className='hub-directory';launch.dataset.page='player_files';launch.textContent='OYUNCU YÖNETİMİ';launch.onclick=openDirectory;nav.appendChild(launch);}launch.hidden=!allowed('roster');let order=nav.querySelector('.hub-order');if(!order){order=document.createElement('button');order.type='button';order.className='hub-order';order.dataset.page='roster_order';order.textContent='LİSTE SIRALAMASI';order.onclick=orderDialog;nav.appendChild(order);}order.hidden=!check()||!api.owner();
  let cards=nav.querySelector('.hub-matches');if(!cards){cards=document.createElement('button');cards.type='button';cards.className='hub-matches';cards.dataset.page='match_cards';cards.textContent='MAÇ KARTLARI';cards.onclick=matches;nav.appendChild(cards);}cards.hidden=!allowed('matches')&&!allowed('statistics');
  const home=document.getElementById('simple-admin-menu');if(home&&!home.querySelector('.hub-home-matches')&&(allowed('matches')||allowed('statistics'))){const b=document.createElement('button');b.type='button';b.className='hub-home-matches';b.textContent='MAÇ KARTLARI / DETAYLAR';b.onclick=matches;home.appendChild(b);}
  document.querySelectorAll('#roster-list .name-row[data-player]').forEach(row=>{if(row.querySelector('.hub-file-button'))return;const b=document.createElement('button');b.type='button';b.className='hub-file-button';b.textContent='OYUNCU DOSYASI';b.onclick=e=>{e.stopPropagation();dossier(row.dataset.player);};(row.querySelector('.name-actions')||row).appendChild(b);});
  document.querySelectorAll('[data-recall]').forEach(recall=>{if(recall.parentElement.querySelector('.hub-readers'))return;const b=document.createElement('button');b.type='button';b.className='hub-readers';b.textContent='KİM OKUDU?';b.onclick=()=>readers(recall.dataset.recall);recall.after(b);});
 }
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;setup();});}}).observe(document.body,{childList:true,subtree:true});setup();
 return {dossier,orderDialog,readers,matches,openDirectory};
}
