
const club='MECİDİYE KARAHİSAR SPOR KULÜBÜ',up=v=>String(v??'').toLocaleUpperCase('tr-TR'),n=v=>Number(v)||0;
const kinds=[['match','Maç Sonucu','visual_match'],['player','Oyuncu Kartı','visual_player'],['monthly','Aylık Rapor','visual_monthly'],['leaders','Gol / Asist Krallığı','visual_leaders'],['roster','Takım Listesi','visual_roster'],['transfer','Yeni Transfer','visual_transfer']];
const image=path=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Kulüp logosu veya forma yüklenemedi. Yeniden dene.'));i.src=new URL(path,import.meta.url).href;});
function label(g,s,x,y,w,size=32,align='left',color='#12345a'){g.textAlign=align;g.fillStyle=color;s=up(s);g.font='bold '+size+'px Arial';while(g.measureText(s).width>w&&size>15)g.font='bold '+(--size)+'px Arial';g.fillText(s,x,y,w);}
function box(g,x,y,w,h,fill='#fff'){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,18);g.fill();}

export function renderVisual({kind,data,playerId,gameId,month,metric='goals',logo,kit}){
 const players=data.players||[],byId=new Map(players.map(p=>[p.id,p])),player=byId.get(playerId)||players[0],seasonScope=month==='season';
 const game=(data.games||[]).find(m=>m.id===gameId),games=(data.games||[]).filter(m=>seasonScope||m.match_date?.startsWith(month||'~'));
 let rows=[],title=kinds.find(k=>k[0]===kind)?.[1]||'Görsel';
 if(kind==='leaders'){title=metric==='goals'?'GOL KRALLIĞI':'ASİST KRALLIĞI';rows=players.filter(p=>n(p.stats?.[metric])>0).sort((a,b)=>n(b.stats[metric])-n(a.stats[metric])||a.full_name.localeCompare(b.full_name,'tr'));}
 if(kind==='roster')rows=players;
 if(kind==='match'&&game)rows=(game.player_entries||[]).filter(e=>byId.has(e.player_id)&&n(e.goals)>0);
 if(kind==='monthly'&&seasonScope)title='SEZONUN GENEL RAPORU';
 const c=document.createElement('canvas');c.width=1080;c.height=kind==='match'?1440+Math.max(1,rows.length)*90:Math.max(1600,kind==='roster'||kind==='leaders'?580+rows.length*96:1600);
 const g=c.getContext('2d'),ink='#102d51',teal='#148598';
 const gradient=g.createLinearGradient(0,0,1080,c.height);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.5,'#e9f4fc');gradient.addColorStop(1,'#f8fbff');g.fillStyle=gradient;g.fillRect(0,0,c.width,c.height);
 function slash(x,y,w,h,fill){g.fillStyle=fill;g.beginPath();g.moveTo(x+30,y);g.lineTo(x+w,y);g.lineTo(x+w-30,y+h);g.lineTo(x,y+h);g.closePath();g.fill();}
 slash(775,0,360,30,'#b4dceb');slash(925,34,210,18,teal);slash(-40,c.height-36,370,22,'#c0d9ed');slash(-80,c.height-16,250,16,teal);

 if(kind==='match'){
  g.save();g.beginPath();g.arc(540,147,100,0,Math.PI*2);g.clip();const crop=Math.min(logo.width,logo.height)*.79;g.drawImage(logo,(logo.width-crop)/2,(logo.height-crop)/2,crop,crop,440,47,200,200);g.restore();
  label(g,'MECİDİYE KARAHİSAR',540,309,990,49,'center');label(g,'SPOR KULÜBÜ',540,365,990,49,'center');
  slash(102,402,876,76,'#d6eaf6');slash(74,402,28,76,teal);slash(976,402,28,76,teal);label(g,'MAÇ SONUCU',540,457,820,53,'center');
 }else{
 // Club badge and full name remain the same in every graphic.
 g.save();g.beginPath();g.arc(136,119,76,0,Math.PI*2);g.clip();const crop=Math.min(logo.width,logo.height)*.79;g.drawImage(logo,(logo.width-crop)/2,(logo.height-crop)/2,crop,crop,60,43,152,152);g.restore();
 label(g,'MECİDİYE KARAHİSAR',242,90,795,44);label(g,'SPOR KULÜBÜ',242,143,795,44);label(g,'MKSK 2008 · '+data.season,242,198,795,27,'left','#4f6c86');
 slash(45,259,990,92,ink);slash(23,259,33,92,teal);slash(1020,259,40,92,'#a1d8e3');label(g,title,540,321,915,45,'center','#fff');

 }
 function shirt(y){g.save();g.translate(365,y);g.scale(350/120,420/146);g.beginPath();g.moveTo(45,0);g.lineTo(27,7);g.lineTo(12,22);g.lineTo(0,59);g.lineTo(24,66);g.lineTo(27,46);g.lineTo(27,142);g.quadraticCurveTo(60,148,95,142);g.lineTo(95,46);g.lineTo(99,66);g.lineTo(120,59);g.lineTo(111,23);g.lineTo(94,8);g.lineTo(76,0);g.quadraticCurveTo(60,20,45,0);g.closePath();g.clip();g.drawImage(kit,14,0,267,325,0,0,120,146);g.restore();}
 function tiles(items,y,h=150){const w=984/items.length;items.forEach(([value,key],i)=>{box(g,48+i*w,y,w-14,h);g.strokeStyle='#c6ddea';g.lineWidth=2;g.strokeRect(48+i*w+10,y+h-2,w-34,1);label(g,value,48+i*w+(w-14)/2,y+72,w-30,57,'center');label(g,key,48+i*w+(w-14)/2,y+120,w-30,25,'center','#486681');});}
 if(kind==='player'||kind==='transfer'){
  if(!player)throw Error('Görsel için oyuncu bulunamadı.');
  const glow=g.createRadialGradient(540,606,5,540,606,330);glow.addColorStop(0,'#c9e4f5');glow.addColorStop(1,'#ffffff00');g.fillStyle=glow;g.fillRect(180,360,720,500);shirt(395);
  slash(46,835,990,77,'#d6eaf5');label(g,player.full_name,540,890,940,49,'center');
  label(g,'FORMA '+(player.jersey_number??'—')+' · '+(player.position||'MEVKİ BELİRTİLMEDİ'),540,953,970,27,'center');
  if(kind==='player'){
   tiles([[n(player.stats?.matches),'MAÇ'],[n(player.stats?.goals),'GOL'],[n(player.stats?.assists),'ASİST']],992);
   box(g,48,1182,246,247,teal);label(g,player.stats?.success==null?'—':Number(player.stats.success).toLocaleString('tr-TR'),171,1282,220,60,'center','#fff');label(g,'GENEL BAŞARI',171,1331,223,24,'center','#fff');label(g,'100 ÜZERİNDEN',171,1378,223,21,'center','#fff');
   const form=(player.form||[]).filter(x=>Number.isFinite(Number(x.points))&&x.points!=null).slice(-5);
   box(g,322,1182,710,247);label(g,'SON '+form.length+' PUANLI MAÇ',355,1224,650,25);
   const left=368,top=1252,w=610,h=118;g.strokeStyle='#cbddea';g.lineWidth=1;
   for(let i=0;i<=2;i++){const y=top+i*h/2;g.beginPath();g.moveTo(left,y);g.lineTo(left+w,y);g.stroke();}
   if(form.length){g.strokeStyle=teal;g.lineWidth=5;g.beginPath();form.forEach((v,i)=>{const x=left+(form.length===1?w/2:i*w/(form.length-1)),y=top+h*(1-Math.max(0,Math.min(10,n(v.points)))/10);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();form.forEach((v,i)=>{const x=left+(form.length===1?w/2:i*w/(form.length-1)),y=top+h*(1-n(v.points)/10);g.fillStyle=teal;g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.fill();label(g,v.points,x,top+h+29,90,19,'center');});}else label(g,'PUAN KAYDI YOK',677,1332,610,26,'center');
   label(g,n(player.stats?.man_of_match)+' MAÇIN ADAMI · '+n(player.stats?.goals_conceded)+' YENİLEN GOL',540,1500,984,27,'center');
  }else{box(g,48,1060,984,240,teal);label(g,'ARAMIZA HOŞ GELDİN',540,1172,950,53,'center','#fff');label(g,'MECİDİYE KARAHİSAR SPOR KULÜBÜ',540,1238,940,29,'center','#fff');}
 }

 if(kind==='match'){
  if(!game)throw Error('Önce kayıtlı maç seç.');
  const scoreGradient=g.createLinearGradient(0,520,0,770);scoreGradient.addColorStop(0,'#193f6a');scoreGradient.addColorStop(1,'#101e40');
  box(g,75,524,365,260,scoreGradient);box(g,640,524,365,260,scoreGradient);
  label(g,n(game.our_score),257,724,335,190,'center','#fff');label(g,n(game.opponent_score),822,724,335,190,'center','#fff');
  slash(477,617,126,84,'#13a9a6');label(g,'—',540,679,105,71,'center','#fff');
  box(g,75,797,365,72,'#cde5f6');box(g,640,797,365,72,'#cde5f6');
  label(g,'MKSK',257,848,335,42,'center');label(g,game.opponent||'RAKİP',822,848,335,39,'center');
  label(g,(game.match_date?.split('-').reverse().join('.')||'TARİH YOK')+' · '+(game.match_time||'SAAT BELİRTİLMEDİ'),540,939,980,31,'center');
  const count=Math.max(1,rows.length),containerY=1010,containerH=65+count*90;
  g.save();g.shadowColor='#93b2ce55';g.shadowBlur=18;g.shadowOffsetY=5;box(g,60,containerY,960,containerH,'#ffffff');g.restore();g.strokeStyle='#bad4e6';g.lineWidth=2;g.beginPath();g.roundRect(60,containerY,960,containerH,18);g.stroke();
  slash(284,982,512,69,'#129a9b');label(g,'GOLLERİMİZ',540,1030,455,37,'center','#fff');
  rows.forEach((e,i)=>{
   const y=1070+i*90;box(g,88,y,904,76,'#f1f7fc');g.strokeStyle='#d1e3ef';g.lineWidth=1;g.beginPath();g.roundRect(88,y,904,76,18);g.stroke();
   label(g,byId.get(e.player_id).full_name,117,y+51,744,35);
   g.fillStyle='#109c98';g.beginPath();g.arc(942,y+38,29,0,Math.PI*2);g.fill();label(g,n(e.goals),942,y+51,51,38,'center','#fff');
  });if(!rows.length)label(g,'OYUNCU BAZINDA GOL KAYDI YOK',540,1122,870,30,'center');
  const entries=game.player_entries||[],names=entries.filter(e=>n(e.man_of_match)>0&&byId.has(e.player_id)).map(e=>byId.get(e.player_id).full_name);
  const winners=names.length&&names.length===entries.length?'TÜM TAKIM':names.join(' · ')||'SEÇİLMEDİ';
  const awardTop=1130+count*90;box(g,60,awardTop,960,168,'#119d99');slash(300,awardTop-29,480,66,ink);label(g,'MAÇIN ADAMI',540,awardTop+18,425,37,'center','#fff');
  const winnerRows=[''];g.font='bold 42px Arial';for(const word of up(winners).split(' ')){const i=winnerRows.length-1,next=(winnerRows[i]+' '+word).trim();if(g.measureText(next).width>875&&winnerRows[i])winnerRows.push(word);else winnerRows[i]=next;}
  if(winnerRows.length===1)label(g,winners,540,awardTop+117,900,winners==='TÜM TAKIM'?74:54,'center','#fff');
  else winnerRows.forEach((line,i)=>label(g,line,540,awardTop+65+i*33,900,31,'center','#fff'));
 }
 if(kind==='monthly'){
  const overview=data.overview;if(seasonScope&&!overview)throw Error('Sezon özeti yüklenemedi. Yeniden dene.');
  const matches=seasonScope?n(overview.matches):games.length,wins=seasonScope?n(overview.wins):games.filter(m=>n(m.our_score)>n(m.opponent_score)).length,losses=seasonScope?n(overview.losses):games.filter(m=>n(m.our_score)<n(m.opponent_score)).length,draws=seasonScope?n(overview.draws):games.length-wins-losses;
  const goals=seasonScope?n(overview.goals):games.reduce((a,m)=>a+n(m.our_score),0),conceded=seasonScope?n(overview.conceded):games.reduce((a,m)=>a+n(m.opponent_score),0);
  const period=seasonScope?data.season+' · SEZON GENELİ':month?new Date(month+'-01T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}):'AY SEÇ';
  label(g,period,540,418,980,43,'center');tiles([[matches,'MAÇ'],[wins,'GALİBİYET'],[losses,'MAĞLUBİYET']],465);
  box(g,48,655,984,435);label(g,'GOL DAĞILIMI',83,706,920,30);
  const max=Math.max(1,goals,conceded),chartTop=765,chartHeight=250,baseline=chartTop+chartHeight;
  [0,1,2].forEach(i=>{g.strokeStyle='#d5e4ef';g.lineWidth=2;g.beginPath();g.moveTo(120,chartTop+i*chartHeight/2);g.lineTo(960,chartTop+i*chartHeight/2);g.stroke();});
  [[goals,'ATILAN GOL',ink],[conceded,'YENİLEN GOL',teal]].forEach(([v,t,color],i)=>{const x=215+i*425,h=v/max*chartHeight;box(g,x,baseline-h,230,Math.max(1,h),color);label(g,v,x+115,baseline-h-15,230,37,'center');label(g,t,x+115,baseline+49,340,27,'center');});
  box(g,48,1130,984,337);label(g,seasonScope?'SEZONUN ÖZETİ':'AYIN ÖZETİ',84,1192,910,37);
  label(g,matches+' MAÇ · '+wins+' GALİBİYET · '+draws+' BERABERLİK · '+losses+' MAĞLUBİYET',84,1265,910,31);
  label(g,goals+' GOL ATILDI · '+conceded+' GOL YENİLDİ',84,1331,910,34);
  label(g,seasonScope?'TAKIM GENEL DURUMU ESAS ALINIR':'TARİHLİ MAÇ KAYITLARI ESAS ALINIR',84,1408,910,23);
  if(seasonScope&&n(overview.unknown_results))label(g,n(overview.unknown_results)+' MAÇIN SONUCU BELİRTİLMEMİŞ',84,1447,910,22);
 }
 if(kind==='leaders'||kind==='roster'){
  label(g,kind==='leaders'?'SEZON SIRALAMASI':'GÜNCEL OYUNCULAR',48,421,984,31);
  rows.forEach((p,i)=>{const y=468+i*96;box(g,48,y,984,82);box(g,58,y+9,84,64,i<3&&kind==='leaders'?teal:ink);label(g,kind==='leaders'?i+1:'#'+(p.jersey_number??'—'),100,y+53,77,31,'center','#fff');label(g,p.full_name,160,y+35,730,30);label(g,kind==='leaders'?(metric==='goals'?'GOL':'ASİST'):(p.position||'—')+' · '+n(p.stats?.matches)+' MAÇ · '+n(p.stats?.goals)+' GOL · '+n(p.stats?.assists)+' ASİST',160,y+66,760,21);if(kind==='leaders')label(g,n(p.stats?.[metric]),1005,y+53,110,36,'right');});if(!rows.length)label(g,'BU SEZON İÇİN KAYIT BULUNMADI',48,530,984,30);
 }
 label(g,'ŞEREFİNLE OYNA, ŞEREFİNLE KAZAN',540,c.height-39,1000,24,'center');
 return c;
}

export async function openVisualCenter({db,season,can}){
 if(!can('visual_center'))return;
 if(document.querySelector('.visual-center[open]'))return;
 const d=document.createElement('dialog');d.className='visual-center';
 d.innerHTML='<header><div><small>MKSK 2008</small><h2>GÖRSEL MERKEZİ</h2></div><button type="button" data-close>KAPAT ×</button></header><p>MECİDİYE KARAHİSAR SPOR KULÜBÜ</p><div class="visual-types"></div><section class="visual-filters"><label data-player-label>OYUNCU<select data-player></select></label><label data-game-label>MAÇ<select data-game></select></label><label data-month-label>RAPOR DÖNEMİ<span class="visual-period"><select data-month></select><button type="button" data-season>SEZON GENELİ</button></span></label><label data-metric-label>SIRALAMA<select data-metric><option value="goals">GOL KRALLIĞI</option><option value="assists">ASİST KRALLIĞI</option></select></label></section><p data-status role="status"></p><button type="button" data-retry hidden>YENİDEN DENE</button><div class="visual-preview"></div><footer><button type="button" data-download>GÖRSELİ İNDİR</button><button type="button" data-share>PAYLAŞ</button></footer>';
 const style=document.createElement('style');style.textContent='.visual-center{font-family:Arial,sans-serif;width:min(94vw,900px);max-height:90dvh;overflow:auto;border:0;border-radius:18px;padding:20px;background:#f1f7fd;color:#173859}.visual-center header{display:flex;align-items:center;justify-content:space-between;background:#173d67;color:white;padding:16px;border-radius:14px}.visual-center header h2{font-size:24px;margin:4px 0;color:white}.visual-types{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.visual-center button{min-height:48px;padding:12px;background:#173d67!important;color:white!important;-webkit-text-fill-color:white!important;border:0;border-radius:10px;font-weight:700}.visual-types button[aria-pressed=true]{background:#147986!important;outline:3px solid #9fd9e0}.visual-center button:disabled{opacity:.5}.visual-filters label{display:block;margin:12px 0;font-weight:700}.visual-filters select{width:100%;min-height:48px;background:white!important;color:#173859!important;-webkit-text-fill-color:#173859!important}.visual-preview canvas{display:block;width:100%;max-width:540px;height:auto;margin:12px auto}.visual-period{display:flex;gap:10px;align-items:center}.visual-period select{min-width:0;flex:1}.visual-period button{flex-shrink:0;font-size:12px}.visual-center footer{display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:-20px;background:#f1f7fd;padding:12px 0}.visual-center [hidden]{display:none!important}';d.append(style);
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
   const months=[...new Set(data.games.filter(m=>m.match_date).map(m=>m.match_date.slice(0,7)))].sort().reverse();q('[data-month]').replaceChildren(new Option('SEZON GENELİ','season'),...months.map(m=>new Option(new Date(m+'-01T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}),m)));
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
 q('[data-season]').onclick=()=>{q('[data-month]').value='season';render();};
 q('[data-close]').onclick=()=>d.close();q('[data-retry]').onclick=()=>load(kind);['player','game','month','metric'].forEach(key=>q('[data-'+key+']').onchange=render);
 q('[data-download]').onclick=()=>output(false);q('[data-share]').onclick=()=>output(true);
 const watch=setInterval(()=>{if(!can('visual_center')||kind&&!allowed(kinds.find(k=>k[0]===kind)[2])){d.close();return;}types();buttons();},5000);
 const scrollBody=document.createElement('div');scrollBody.className='visual-scroll-body';[...d.children].filter(n=>!['HEADER','FOOTER','STYLE'].includes(n.tagName)).forEach(n=>scrollBody.append(n));d.querySelector('footer').before(scrollBody);
 const mobileStyle=document.createElement('style');mobileStyle.textContent='.visual-center[open]{display:flex;flex-direction:column;width:min(94vw,900px);max-height:92dvh;overflow:hidden!important;box-sizing:border-box;padding:12px}.visual-center>header,.visual-center>footer{flex:0 0 auto;position:static}.visual-scroll-body{overflow:auto;min-height:0;min-width:0;overscroll-behavior:contain}.visual-center header h2{font-size:clamp(16px,4vw,24px)}.visual-center header{gap:8px;padding:12px}.visual-center button{font-size:13px}.visual-center footer{margin:0;padding:8px 0}.visual-center .visual-period{flex-wrap:wrap}.visual-period>*{max-width:100%;box-sizing:border-box}.visual-center .visual-preview{min-width:0}.visual-center .visual-types button{overflow-wrap:anywhere}';d.append(mobileStyle);
 d.onclose=()=>{closed=true;ticket++;clearInterval(watch);d.remove();};document.body.append(d);types();buttons();d.showModal();const first=kinds.find(k=>allowed(k[2]));if(first)await load(first[0]);else status('Bu merkezde henüz açık görsel yetkin yok.');
}
