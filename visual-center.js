
const club='MECİDİYE KARAHİSAR SPOR KULÜBÜ',up=v=>String(v??'').toLocaleUpperCase('tr-TR'),n=v=>Number(v)||0;
const kinds=[['match','Maç Sonucu','visual_match'],['player','Oyuncu Kartı','visual_player'],['monthly','Aylık Rapor','visual_monthly'],['leaders','Gol / Asist Krallığı','visual_leaders'],['roster','Takım Listesi','visual_roster'],['transfer','Yeni Transfer','visual_transfer']];
const image=path=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Kulüp logosu veya forma yüklenemedi. Yeniden dene.'));i.src=new URL(path,import.meta.url).href;});
function label(g,s,x,y,w,size=32,align='left',color='#12345a'){g.textAlign=align;g.fillStyle=color;s=up(s);g.font='bold '+size+'px Arial';while(g.measureText(s).width>w&&size>15)g.font='bold '+(--size)+'px Arial';g.fillText(s,x,y,w);}
function box(g,x,y,w,h,fill='#fff'){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,18);g.fill();}
export function renderVisual({kind,data,playerId,gameId,month,metric='goals',logo,kit}){
 const players=data.players||[],byId=new Map(players.map(p=>[p.id,p])),player=byId.get(playerId)||players[0];
 const game=(data.games||[]).find(m=>m.id===gameId),games=(data.games||[]).filter(m=>m.match_date?.startsWith(month||'~'));
 let rows=[],title=kinds.find(k=>k[0]===kind)?.[1]||'Görsel';
 if(kind==='leaders')rows=players.filter(p=>n(p.stats?.[metric])>0).sort((a,b)=>n(b.stats[metric])-n(a.stats[metric])||a.full_name.localeCompare(b.full_name,'tr'));
 if(kind==='roster')rows=players;
 if(kind==='match'&&game)rows=(game.player_entries||[]).filter(e=>byId.has(e.player_id)&&n(e.goals)>0);
 const c=document.createElement('canvas');c.width=1080;c.height=Math.max(1390,kind==='roster'||kind==='leaders'?510+rows.length*96:kind==='match'?1050+rows.length*80:1390);
 const g=c.getContext('2d');g.fillStyle='#eaf4fc';g.fillRect(0,0,c.width,c.height);box(g,26,24,1028,227);g.drawImage(logo,52,48,138,138);
 label(g,'MECİDİYE KARAHİSAR',218,95,800,43);label(g,'SPOR KULÜBÜ',218,145,800,43);label(g,'MKSK 2008 · '+data.season,218,200,800,26,'left','#4d6881');
 box(g,36,278,1008,76,'#173d67');label(g,title,540,328,960,40,'center','#fff');
 function shirt(y){g.save();g.translate(365,y);g.scale(350/120,420/146);g.beginPath();g.moveTo(45,0);g.lineTo(27,7);g.lineTo(12,22);g.lineTo(0,59);g.lineTo(24,66);g.lineTo(27,46);g.lineTo(27,142);g.quadraticCurveTo(60,148,95,142);g.lineTo(95,46);g.lineTo(99,66);g.lineTo(120,59);g.lineTo(111,23);g.lineTo(94,8);g.lineTo(76,0);g.quadraticCurveTo(60,20,45,0);g.closePath();g.clip();g.drawImage(kit,14,0,267,325,0,0,120,146);g.restore();}
 function tiles(items,y){const w=984/items.length;items.forEach(([value,key],i)=>{box(g,48+i*w,y,w-14,140);label(g,value,48+i*w+(w-14)/2,y+67,w-30,47,'center');label(g,key,48+i*w+(w-14)/2,y+113,w-30,24,'center','#47657f');});}
 if(kind==='player'||kind==='transfer'){
  if(!player)throw Error('Görsel için oyuncu bulunamadı.');
  shirt(390);label(g,player.full_name,540,900,990,48,'center');
  label(g,'FORMA '+(player.jersey_number??'—')+' · '+(player.position||'MEVKİ BELİRTİLMEDİ'),540,951,970,29,'center');
  if(kind==='player'){tiles([[n(player.stats?.matches),'MAÇ'],[n(player.stats?.goals),'GOL'],[n(player.stats?.assists),'ASİST']],1000);tiles([[n(player.stats?.man_of_match),'MAÇIN ADAMI'],[n(player.stats?.goals_conceded),'YENİLEN GOL']],1162);}
  else{box(g,48,1020,984,180,'#167383');label(g,'ARAMIZA HOŞ GELDİN',540,1120,950,48,'center','#fff');}
 }
 if(kind==='match'){
  if(!game)throw Error('Önce kayıtlı maç seç.');
  label(g,'MKSK — '+game.opponent,540,423,980,35,'center');label(g,n(game.our_score)+' — '+n(game.opponent_score),540,590,980,130,'center');
  label(g,game.match_date?.split('-').reverse().join('.')||'TARİH YOK',540,650,980,29,'center');label(g,game.match_time||'SAAT BELİRTİLMEDİ',540,696,980,27,'center');
  label(g,'GOLLERİMİZ',52,770,980,34);
  rows.forEach((e,i)=>{box(g,48,805+i*80,984,68);label(g,byId.get(e.player_id).full_name,69,850+i*80,820,30);label(g,n(e.goals),998,850+i*80,100,36,'right');});
  if(!rows.length)label(g,'OYUNCU BAZINDA GOL KAYDI YOK',52,850,980,25);
  const names=(game.player_entries||[]).filter(e=>n(e.man_of_match)>0&&byId.has(e.player_id)).map(e=>byId.get(e.player_id).full_name);
  label(g,'MAÇIN ADAMI',52,c.height-160,980,28);
  const winners=names.length&&names.length===(game.player_entries||[]).length?'TÜM TAKIM':names.join(' · ')||'SEÇİLMEDİ';
  label(g,winners,52,c.height-110,980,30);
 }
 if(kind==='monthly'){
  const wins=games.filter(m=>n(m.our_score)>n(m.opponent_score)).length,losses=games.filter(m=>n(m.our_score)<n(m.opponent_score)).length;
  label(g,month||'AY SEÇ',540,430,980,54,'center');tiles([[games.length,'MAÇ'],[wins,'GALİBİYET'],[losses,'MAĞLUBİYET']],490);
  const goals=games.reduce((a,m)=>a+n(m.our_score),0),conceded=games.reduce((a,m)=>a+n(m.opponent_score),0);
  tiles([[goals,'ATILAN GOL'],[conceded,'YENİLEN GOL'],[games.length-wins-losses,'BERABERLİK']],664);
  box(g,48,860,984,345);label(g,'AYIN ÖZETİ',82,920,910,39);label(g,games.length+' MAÇTA '+wins+' GALİBİYET',82,1000,910,36);label(g,goals+' GOL ATILDI · '+conceded+' GOL YENİLDİ',82,1065,910,34);label(g,'TARİHLİ MAÇ KAYITLARI ESAS ALINIR',82,1158,910,23);
 }
 if(kind==='leaders'||kind==='roster'){
  label(g,kind==='leaders'?(metric==='goals'?'GOL KRALLIĞI':'ASİST KRALLIĞI'):'GÜNCEL OYUNCULAR',48,414,984,31);
  rows.forEach((p,i)=>{const y=448+i*96;box(g,48,y,984,82);label(g,kind==='leaders'?i+1:'#'+(p.jersey_number??'—'),98,y+51,83,30,'center');label(g,p.full_name,160,y+35,730,30);
   label(g,kind==='leaders'?(metric==='goals'?'GOL':'ASİST'):(p.position||'—')+' · '+n(p.stats?.matches)+' MAÇ · '+n(p.stats?.goals)+' GOL · '+n(p.stats?.assists)+' ASİST',160,y+66,760,21);
   if(kind==='leaders')label(g,n(p.stats?.[metric]),1005,y+53,110,36,'right');
  });if(!rows.length)label(g,'BU SEZON İÇİN KAYIT BULUNMADI',48,510,984,30);
 }
 label(g,'ŞEREFİNLE OYNA, ŞEREFİNLE KAZAN',540,c.height-27,1000,25,'center');
 return c;
}
export async function openVisualCenter({db,season,can}){
 if(!can('visual_center'))return;
 if(document.querySelector('.visual-center[open]'))return;
 const d=document.createElement('dialog');d.className='visual-center';
 d.innerHTML='<header><div><small>MKSK 2008</small><h2>GÖRSEL MERKEZİ</h2></div><button type="button" data-close>KAPAT ×</button></header><p>MECİDİYE KARAHİSAR SPOR KULÜBÜ</p><div class="visual-types"></div><section class="visual-filters"><label data-player-label>OYUNCU<select data-player></select></label><label data-game-label>MAÇ<select data-game></select></label><label data-month-label>RAPOR AYI<select data-month></select></label><label data-metric-label>SIRALAMA<select data-metric><option value="goals">GOL KRALLIĞI</option><option value="assists">ASİST KRALLIĞI</option></select></label></section><p data-status role="status"></p><button type="button" data-retry hidden>YENİDEN DENE</button><div class="visual-preview"></div><footer><button type="button" data-download>GÖRSELİ İNDİR</button><button type="button" data-share>PAYLAŞ</button></footer>';
 const style=document.createElement('style');style.textContent='.visual-center{font-family:Arial,sans-serif;width:min(94vw,900px);max-height:90dvh;overflow:auto;border:0;border-radius:18px;padding:20px;background:#f1f7fd;color:#173859}.visual-center header{display:flex;align-items:center;justify-content:space-between;background:#173d67;color:white;padding:16px;border-radius:14px}.visual-center header h2{font-size:24px;margin:4px 0;color:white}.visual-types{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.visual-center button{min-height:48px;padding:12px;background:#173d67!important;color:white!important;-webkit-text-fill-color:white!important;border:0;border-radius:10px;font-weight:700}.visual-types button[aria-pressed=true]{background:#147986!important;outline:3px solid #9fd9e0}.visual-center button:disabled{opacity:.5}.visual-filters label{display:block;margin:12px 0;font-weight:700}.visual-filters select{width:100%;min-height:48px;background:white!important;color:#173859!important;-webkit-text-fill-color:#173859!important}.visual-preview canvas{display:block;width:100%;max-width:540px;height:auto;margin:12px auto}.visual-center footer{display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:-20px;background:#f1f7fd;padding:12px 0}.visual-center [hidden]{display:none!important}';d.append(style);
 const q=s=>d.querySelector(s),status=t=>q('[data-status]').textContent=t;
 let kind='',data=null,canvas=null,ticket=0,closed=false,busy=false;const assets=Promise.all([image('güncel logo.jfif'),image('forma.jpg')]);assets.catch(()=>{});
 const allowed=key=>can('visual_center')&&can(key)&&(key!=='visual_monthly'||can('analytics'));
 function types(){const root=q('.visual-types');root.replaceChildren();kinds.filter(k=>allowed(k[2])).forEach(([key,name,area])=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(key===kind));b.onclick=()=>load(key);root.append(b);});}
 function buttons(){const ok=canvas&&can('visual_export')&&!busy;q('[data-download]').disabled=!ok;q('[data-share]').disabled=!ok;}
 async function load(key){
  const own=++ticket;kind=key;canvas=null;data=null;buttons();types();q('.visual-preview').replaceChildren();status('Görsel verileri yükleniyor…');q('[data-retry]').hidden=true;
  try{const response=await db.rpc('club_visual_data',{p_kind:key,p_season:season(),p_export:false});if(response.error)throw response.error;const [logo,kit]=await assets;if(closed||ticket!==own)return;data=response.data;d._assets={logo,kit};
   q('[data-player]').replaceChildren(...data.players.map(p=>new Option(p.full_name,p.id)));
   q('[data-game]').replaceChildren(...data.games.map(m=>new Option((m.match_date||'TARİH YOK').split('-').reverse().join('.')+' · '+m.opponent,m.id)));
   const months=[...new Set(data.games.filter(m=>m.match_date).map(m=>m.match_date.slice(0,7)))].sort().reverse();q('[data-month]').replaceChildren(...months.map(m=>new Option(new Date(m+'-01T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}),m)));
   ['player','game','month','metric'].forEach(name=>q('[data-'+name+'-label]').hidden=!({player:['player','transfer'],game:['match'],month:['monthly'],metric:['leaders']}[name].includes(key)));
   render();
  }catch(e){if(closed||ticket!==own)return;status('Açılamadı: '+e.message);q('[data-retry]').hidden=false;}
 }
 function render(){if(!data||closed)return;try{canvas=renderVisual({kind,data,playerId:q('[data-player]').value,gameId:q('[data-game]').value,month:q('[data-month]').value,metric:q('[data-metric]').value,...d._assets});q('.visual-preview').replaceChildren(canvas);status(can('visual_export')?'Önizleme hazır. İndirebilir veya paylaşabilirsin.':'Önizleme hazır. İndirme ve paylaşma yetkin kapalı.');}catch(e){canvas=null;q('.visual-preview').replaceChildren();status(e.message);}buttons();}
 async function output(share){
  if(busy||!canvas)return;const captured={canvas,kind,season:season(),ticket};busy=true;buttons();status('Görsel hazırlanıyor…');
  try{const r=await db.rpc('club_visual_data',{p_kind:captured.kind,p_season:captured.season,p_export:true});if(r.error)throw r.error;if(closed||captured.ticket!==ticket||captured.canvas!==canvas)return;
   const blob=await new Promise(resolve=>captured.canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Görsel oluşturulamadı.');if(closed||captured.ticket!==ticket||captured.canvas!==canvas)return;const file=new File([blob],'mksk-'+captured.kind+'-'+captured.season+'.png',{type:'image/png'});
   if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:club});status('Paylaşıldı.');}
   else{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;d.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Görsel indirildi. Dosyayı paylaşabilirsin.');}
  }catch(e){if(e.name!=='AbortError')status('Tamamlanamadı: '+e.message);}finally{busy=false;buttons();}
 }
 q('[data-close]').onclick=()=>d.close();q('[data-retry]').onclick=()=>load(kind);['player','game','month','metric'].forEach(key=>q('[data-'+key+']').onchange=render);
 q('[data-download]').onclick=()=>output(false);q('[data-share]').onclick=()=>output(true);
 const watch=setInterval(()=>{if(!can('visual_center')||kind&&!allowed(kinds.find(k=>k[0]===kind)[2])){d.close();return;}types();buttons();},5000);
 d.onclose=()=>{closed=true;ticket++;clearInterval(watch);d.remove();};document.body.append(d);types();buttons();d.showModal();const first=kinds.find(k=>allowed(k[2]));if(first)await load(first[0]);else status('Bu merkezde henüz açık görsel yetkin yok.');
}
