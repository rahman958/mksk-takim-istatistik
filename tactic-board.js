import {compileTactic} from './tactic-command.js?v=20261125-phase-plan-1';
import {readTacticDuty} from './tactic-duty.js?v=20261117-player-tactic-1';
const clubTacticOne="Hücuma kaleci beklere pas atarak çıkar. Savunma üçlenir, savunma çizgisi orta sahaya yaklaşır. Kanatlar dikine ve içeri doğru paslaşarak girer, gol aranır. Rakip atağında her oyuncu bir rakip oyuncusu alır; orta sahadaki oyuncu savunmaya geçer ve savunma dört olur. Forvetteki oyuncu orta sahaya geçer; yüksek pres ve önde baskı olur. Topu kazanınca ilk dizilişe geçilir.";
const storageKey='mksk-tactic-templates-v1';
const phases=['Top bizde','Top rakipte','Hücuma geçiş','Savunmaya geçiş','Duran toplarımız','Rakibin duran topları','Maç içi senaryolar'];
const colors={run:'#74dcf6',press:'#ff9bac',pass:'#e3f0ff',shot:'#ffd58b',dribble:'#b2f3be'};
const labels={run:'Koşu',press:'Pres',pass:'Pas',shot:'Şut',dribble:'Top sürme'};
const copy=value=>JSON.parse(JSON.stringify(value));
const blankStep=()=>({title:'',arrows:[],markers:[]});
function loadTemplates(){
  try{return JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}
  catch{return {};}
}
function shrink(ctx,value,width){
  let text=String(value);
  while(text.length>1&&ctx.measureText(text).width>width)text=text.slice(0,-2)+'…';
  return text;
}
export function openTactics(lineup,findPlayer,onDutyChange,options={}){
  if(document.querySelector('.mksk-tactics[open]'))return;
  const slots=lineup.positions.map(slot=>({...slot,player:findPlayer(slot.player_id)}));
  const initial=()=>slots.map(({x,y})=>({x,y}));
  const blankPhase=()=>({positions:initial(),steps:[blankStep()],note:''});
  let plan={phases:phases.map(blankPhase),notes:{}};
  function restorePlan(saved){
    const restored=copy(saved);
    restored.phases=phases.map((_,i)=>{
      const part=restored.phases[i]||blankPhase();
      part.steps.forEach(item=>{item.markers??=[];});
      return part;
    });
    return restored;
  }
  let phase=0,step=0,start=null,undo=[];
  const dlg=document.createElement('dialog');
  dlg.className='player-hub-dialog mksk-tactics';
  dlg.setAttribute('aria-labelledby','mksk-tactics-title');
  dlg.innerHTML=`<header><h2 id="mksk-tactics-title">Taktik Tahtası</h2><form method="dialog"><button>Kapat</button></form></header>
    <label>Plan adı<input data-field="name" maxlength="60" value="Maç planı"></label>
    <label>Oyun planı<select data-field="phase">${phases.map((name,i)=>'<option value="'+i+'">'+name+'</option>').join('')}</select></label>
    <details><summary>Bölümün maç planı</summary><label>Plan notu<textarea data-field="phase-note" maxlength="360" rows="3" placeholder="Diziliş, pres tetikleyicisi, oyuncu değişikliği veya duran top sırası"></textarea></label></details>
    <div class="tactics-row" hidden><label>Adım<select data-field="step"></select></label><button type="button" data-action="add">Adım ekle</button><button type="button" data-action="remove">Adımı sil</button></div>
    <label hidden>Adım açıklaması<input data-field="title" maxlength="80" placeholder="Örn. Arka direğe koşu"></label>
    <label>Sahada yapılacak işlem<select data-field="mode"><option value="run">Koşu oku çiz</option><option value="press">Pres oku çiz</option><option value="pass">Pas oku çiz</option><option value="shot">Şut oku çiz</option><option value="dribble">Top sürme oku çiz</option><option value="ball">Topu yerleştir</option><option value="opponent">Rakip oyuncu ekle</option><option value="zone">Alan işaretle</option><option value="move">Oyuncuyu taşı</option><option value="note">Oyuncu görevini aç</option></select></label>
    <div class="tactics-row"><button type="button" data-action="play">▶ Taktiği Oynat</button></div>
    <p class="tactics-hint"></p><p data-step-guide></p><canvas width="600" height="690" role="img" aria-label="Forma numaraları ve taktik okları"></canvas>
    <div class="tactics-row"><button type="button" data-action="undo">Geri al</button><button type="button" data-action="clear">Çizimleri temizle</button><button type="button" data-action="share">Görseli paylaş</button><button type="button" data-action="download">PNG indir</button></div>
    <details class="tactics-notes"><summary>Oyuncu görevleri</summary><label>Oyuncu<select data-field="player"></select></label><label>Görev notu<textarea data-field="note" maxlength="120" rows="2"></textarea></label><label>Oyuncu hareketi<select data-field="duty-arrow"></select></label><button type="button" data-action="assign">Oyuncunun kadro görevine ekle</button><button type="button" data-action="detach">Bu bölümün hareketini kaldır</button><p data-duty-status role="status"></p></details>
    <details><summary>Taktik şablonları</summary><label>Şablon seç<select data-field="template"></select></label><div class="tactics-row"><button type="button" data-action="load">Uygula</button><button type="button" data-action="save">Plan adıyla kaydet</button><button type="button" data-action="delete">Şablonu sil</button></div></details>
    <p role="status" class="tactics-status"></p>`;
  if(options.allowDuty===false)dlg.querySelector('.tactics-notes').hidden=true;
  const q=selector=>dlg.querySelector(selector);
  const field=name=>q('[data-field="'+name+'"]');
  const action=name=>q('[data-action="'+name+'"]');
  const canvas=q('canvas'),ctx=canvas.getContext('2d');

  let boardLogo=null,boardKit=null;
  const getAsset=path=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Kulüp logosu veya forma yüklenemedi. Tahtayı kapatıp yeniden aç.'));img.src=new URL(path,import.meta.url).href;});
  const assetsReady=Promise.all([getAsset('güncel logo.jfif'),getAsset('forma.jpg')]).then(([logo,kit])=>{boardLogo=logo;boardKit=kit;if(dlg.isConnected)draw();return true;});
  assetsReady.catch(e=>{if(dlg.isConnected)q('.tactics-status').textContent=e.message;});
  let fieldColor='white';try{fieldColor=localStorage.getItem('mksk-lineup-color-v1')||'white';}catch{}
  const boardThemes={navy:['#15375b','#193e65','#8badd1','#ffffff'],white:['#edf2f8','#e3eaf3','#7a93b1','#122755'],blue:['#d9efff','#c7e4f8','#688daf','#122755'],mint:['#dff3e7','#cee9db','#698d7e','#122755']};
  if(!boardThemes[fieldColor])fieldColor='white';
  function drawBoardShirt(g,x,y,keeper){
   g.save();g.translate(x-24,y-34);g.scale(.4,.4);g.beginPath();g.moveTo(45,0);g.lineTo(27,7);g.lineTo(12,22);g.lineTo(0,59);g.lineTo(24,66);g.lineTo(27,46);g.lineTo(27,142);g.quadraticCurveTo(60,148,95,142);g.lineTo(95,46);g.lineTo(99,66);g.lineTo(120,59);g.lineTo(111,23);g.lineTo(94,8);g.lineTo(76,0);g.quadraticCurveTo(60,20,45,0);g.closePath();g.clip();if(keeper){g.fillStyle='#f6d32d';g.fillRect(0,0,120,146);g.fillStyle='#173f72';g.fillRect(44,0,34,8);g.drawImage(boardLogo,74,30,18,18);}else g.drawImage(boardKit,14,0,267,325,0,0,120,146);g.restore();
  }


  const commandBox=document.createElement('section');commandBox.className='tactics-command';
  commandBox.innerHTML='<label>BÜTÜN TAKTİĞİNİ BURAYA YAZ<textarea rows="6" maxlength="6000" data-command placeholder="Top bizdeyken kanatlar açılsın, orta saha öne yaklaşsın. Top rakipteyken önde baskı yapalım, savunma çizgisi yükselsin. Baskı aşılırsa savunma geri çekilsin."></textarea></label><button type="button" data-build>TAKTİĞİ OLUŞTUR</button><p>Oyuncunun tam adını veya mevkisini yaz. Cümleleri noktayla ayır. Anlaşılmayan talimatları aşağıda göreceksin.</p><div data-command-result role="status"></div>';
  q('header').after(commandBox);
  const preset=document.createElement('button');preset.type='button';preset.textContent='TAKTİK 1 · KAYITLI PLANI AÇ';preset.dataset.clubPreset='';preset.onclick=()=>{field('template').value='TAKTİK 1';action('load').click();};commandBox.prepend(preset);

  const colorLabel=document.createElement('label');colorLabel.textContent='SAHA RENGİ';const colorSelect=document.createElement('select');colorSelect.setAttribute('data-board-color','');Object.entries({white:'BEYAZ',blue:'AÇIK MAVİ',mint:'AÇIK SAHA',navy:'LACİVERT'}).forEach(([key,label])=>colorSelect.add(new Option(label,key)));colorSelect.value=fieldColor;colorLabel.append(colorSelect);commandBox.append(colorLabel);colorSelect.onchange=()=>{fieldColor=colorSelect.value;draw();};
  const brand=document.createElement('img');brand.src=new URL('güncel logo.jfif',import.meta.url).href;brand.alt='MKSK kulüp logosu';brand.width=48;brand.height=48;brand.style.cssText='object-fit:cover;border-radius:50%;margin-right:10px;flex-shrink:0';q('header').prepend(brand);

  const advanced=document.createElement('details');advanced.innerHTML='<summary>ELLE DÜZENLE / KAYITLI PLANLAR</summary>';
  const playRow=action('play').closest('.tactics-row'),shareRow=action('share').closest('.tactics-row');
  [...dlg.children].forEach(n=>{if(n!==commandBox&&!n.matches('header,canvas,.tactics-status')&&n!==playRow&&n!==shareRow)advanced.append(n);});
  dlg.append(advanced);
  const style=document.createElement('style');style.textContent='.tactics-command textarea{width:100%;min-height:140px;background:white!important;color:#142e50!important;-webkit-text-fill-color:#142e50!important;padding:12px;border:1px solid #9eb4cc;border-radius:12px;line-height:1.5}.tactics-command button{width:100%;margin:10px 0;background:#126b79!important;color:white!important}.tactics-command p{font-size:14px;line-height:1.5;color:#183858!important}.mksk-tactics{max-height:92dvh;overflow:auto!important}.mksk-tactics button{min-height:44px}.mksk-tactics [hidden]{display:none!important}.mksk-tactics [data-command-result]{white-space:pre-wrap}';dlg.append(style);
  let generatedText='';
  q('[data-build]').onclick=()=>{
   const text=q('[data-command]').value.trim(),result=compileTactic(text,slots),out=q('[data-command-result]');
   if(result.issues.length){out.textContent='Şu talimatları netleştir:\n'+result.issues.join('\n');action('play').disabled=true;return;}
   checkpoint();plan.phases[0]={positions:initial(),note:'',steps:result.steps};phase=0;step=0;generatedText=text;plan.commandText=text;update();action('play').disabled=false;
   out.textContent='Uygulanacak plan:\n'+result.steps.map(s=>s.title+': '+s.note).join('\n');
  };
  q('[data-command]').oninput=()=>{if(q('[data-command]').value.trim()!==generatedText){action('play').disabled=true;q('[data-command-result]').textContent='Metin değişti. Taktiği yeniden oluştur.';}};
  action('play').disabled=true;

  const current=()=>plan.phases[phase];
  const frame=()=>current().steps[step];
  const positions=()=>frame().positions||current().positions;
  const point=({x,y})=>({x:30+x*5.4,y:30+y*6.3});
  const position=event=>{
    const r=canvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(100,((event.clientX-r.left)*600/r.width-30)/5.4)),
      y:Math.max(0,Math.min(100,((event.clientY-r.top)*690/r.height-30)/6.3))};
  };
  const status=text=>{q('.tactics-status').textContent=text;};
  const checkpoint=()=>{undo.push({plan:copy(plan),phase,step});if(undo.length>40)undo.shift();action('undo').disabled=false;};
  const playerLabel=i=>slots[i].player?.full_name||slots[i].role;

  let pitchCache=null,pitchColor=null,pitchLogo=null,tokenAssets=null;
  const tokenCache=new Map();
  function cachedPitch(){
   if(pitchCache&&pitchColor===fieldColor&&pitchLogo===boardLogo)return pitchCache;
   pitchCache=document.createElement('canvas');pitchCache.width=600;pitchCache.height=690;
   pitchColor=fieldColor;pitchLogo=boardLogo;const ctx=pitchCache.getContext('2d');
    const palette=boardThemes[fieldColor];ctx.fillStyle=palette[0];ctx.fillRect(0,0,600,690);
    ctx.fillStyle=palette[1];
    for(let i=0;i<6;i+=2)ctx.fillRect(30,30+i*105,540,105);
    ctx.strokeStyle=palette[2];ctx.lineWidth=2;
    ctx.strokeRect(30,30,540,630);
    ctx.beginPath();ctx.moveTo(30,345);ctx.lineTo(570,345);ctx.stroke();
    ctx.beginPath();ctx.arc(300,345,61,0,Math.PI*2);ctx.stroke();
    for(const y of [30,562])ctx.strokeRect(173,y,254,98);
    for(const y of [30,618])ctx.strokeRect(234,y,132,42);

    if(boardLogo){ctx.save();ctx.globalAlpha=.13;const crop=Math.min(boardLogo.width,boardLogo.height)*.79;ctx.beginPath();ctx.arc(300,345,62,0,Math.PI*2);ctx.clip();ctx.drawImage(boardLogo,(boardLogo.width-crop)/2,(boardLogo.height-crop)/2,crop,crop,238,283,124,124);ctx.restore();}

   return pitchCache;
  }
  function cachedPlayer(i){
   if(tokenAssets!==boardKit){tokenCache.clear();tokenAssets=boardKit;}
   if(tokenCache.has(i))return tokenCache.get(i);
   const tile=document.createElement('canvas');tile.width=240;tile.height=224;const g=tile.getContext('2d');g.scale(2,2);
   const x=60,y=34,slot=slots[i];
   if(boardLogo&&boardKit)drawBoardShirt(g,x,y,/^(GK|KL|KALE|KALECİ|KALECI)$/i.test(String(slot.role)));
   else{g.fillStyle='#e6effc';g.beginPath();g.arc(x,y,20,0,Math.PI*2);g.fill();}
   g.textAlign='center';g.fillStyle='#fff';g.beginPath();g.roundRect(x-16,y+24,32,21,5);g.fill();g.fillStyle='#10294b';g.font='bold 16px Arial';g.fillText(String(slot.player?.jersey_number??slot.role),x,y+40,30);
   g.font='bold 12px Arial';const caption=shrink(g,playerLabel(i),108);g.fillStyle='#fff';g.beginPath();g.roundRect(x-57,y+47,114,21,5);g.fill();g.fillStyle='#10294b';g.fillText(caption,x,y+62,108);
   tokenCache.set(i,tile);return tile;
  }

  function draw(ctxOverride=ctx, item=frame(), players=positions(), cursor=start){
    const ctx=ctxOverride;
    const arrowColors=fieldColor==='navy'?colors:{run:'#146bb1',press:'#b62c52',pass:'#263c59',shot:'#a05b11',dribble:'#14714a'};ctx.drawImage(cachedPitch(),0,0);
    for(const {at,type,to} of item.markers){
      const a=point(at);
      if(type==='zone'){
        const b=point(to);
        ctx.fillStyle='#ffe5a14a';ctx.strokeStyle='#ffe5a1';ctx.lineWidth=2;
        ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
      }else{
        ctx.fillStyle=type==='ball'?'#fff':'#cf5370';
        ctx.strokeStyle=type==='ball'?'#143759':'#ffc8d6';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(a.x,a.y,type==='ball'?8:15,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
    }
    for(const {from,to,type} of item.arrows){
      const a=point(from),b=point(to),angle=Math.atan2(b.y-a.y,b.x-a.x);
      ctx.strokeStyle=arrowColors[type];ctx.lineWidth=5;ctx.setLineDash(type==='press'?[12,8]:type==='dribble'?[4,6]:[]);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=arrowColors[type];ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x-20*Math.cos(angle-.45),b.y-20*Math.sin(angle-.45));
      ctx.lineTo(b.x-20*Math.cos(angle+.45),b.y-20*Math.sin(angle+.45));ctx.closePath();ctx.fill();
    }
    players.forEach((pos,i)=>{const {x,y}=point(pos);ctx.drawImage(cachedPlayer(i),x-60,y-34,120,112);});
    if(cursor?.point){
      const a=point(cursor.point);ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(a.x,a.y,7,0,Math.PI*2);ctx.stroke();
    }
  }
  function update(){
    start=null;
    field('phase').value=String(phase);
    field('phase-note').value=current().note||'';

    field('step').replaceChildren(...current().steps.map((_,i)=>new Option('Adım '+(i+1),String(i))));
    field('step').value=String(step);field('title').value=frame().title;
    action('remove').disabled=current().steps.length===1;
    action('add').disabled=current().steps.length>=12;
    action('undo').disabled=!undo.length;
    field('note').value=plan.notes[field('player').value]||'';
    q('[data-step-guide]').textContent=frame().note||'';
    q('[data-step-guide]').hidden=!frame().note;
    refreshAssignment();hint();draw();
  }
  function hint(){
    const mode=field('mode').value;
    q('.tactics-hint').textContent=mode==='move'?(start?'Yeni yerine dokun.':'Önce oyuncuya, sonra yeni yerine dokun.')
      :mode==='ball'||mode==='opponent'?'Yerleştirmek için sahaya dokun.'
      :mode==='zone'?(start?'Alan için karşı köşeye dokun.':'Alan için ilk köşeye dokun.')
      :mode==='note'?'Görev notunu görmek için bir oyuncuya dokun.'
      :start?'Okun bitiş noktasına dokun.':'Okun başlangıç ve bitiş noktalarına dokun.';
  }
  function nearest(p){
    const a=point(p);
    return positions().findIndex(pos=>{const b=point(pos);return Math.hypot(a.x-b.x,a.y-b.y)<=26;});
  }
  canvas.onclick=event=>{
    const p=position(event),mode=field('mode').value;
    if(mode==='note'){
      const i=nearest(p);
      if(i<0)return;
      field('player').value=String(i);field('player').onchange();
      q('.tactics-notes').open=true;field('note').focus();return;
    }
    if(mode==='ball'||mode==='opponent'){
      if(frame().markers.length>=40){status('Bu adımda en fazla 40 işaret olabilir.');return;}
      checkpoint();
      if(mode==='ball')frame().markers=frame().markers.filter(marker=>marker.type!=='ball');
      frame().markers.push({at:p,type:mode});draw();return;
    }
    if(!start){
      const i=nearest(p);
      if(mode==='move'&&i<0)return;
      start={point:p,index:i};
    }else{
      if(mode==='move'){
        checkpoint();frame().positions??=copy(positions());frame().positions[start.index]=p;
      }else if(mode==='zone'){
        if(frame().markers.length>=40)status('Bu adımda en fazla 40 işaret olabilir.');
        else{checkpoint();frame().markers.push({type:mode,at:start.point,to:p});}
      }else if(frame().arrows.length>=40){
        status('Bu adımda en fazla 40 ok olabilir.');
      }else{
        checkpoint();frame().arrows.push({from:start.point,to:p,type:mode});
      }
      start=null;
    }
    refreshAssignment();hint();draw();
  };
  field('phase').onchange=()=>{phase=Number(field('phase').value);step=0;update();};
  field('phase-note').onchange=()=>{checkpoint();current().note=field('phase-note').value.trim();};
  field('mode').onchange=()=>{start=null;hint();draw();};
  field('step').onchange=()=>{step=Number(field('step').value);update();};
  field('title').onchange=()=>{checkpoint();frame().title=field('title').value.trim();};
  action('add').onclick=()=>{checkpoint();step=current().steps.push({...blankStep(),positions:copy(positions())})-1;update();};
  action('remove').onclick=()=>{checkpoint();current().steps.splice(step,1);step=Math.max(0,step-1);update();};
  action('clear').onclick=()=>{
    if(!frame().arrows.length&&!frame().markers.length)return;
    checkpoint();frame().arrows=[];frame().markers=[];update();status('Bu adımın çizimleri temizlendi.');
  };
  action('undo').onclick=()=>{({plan,phase,step}=undo.pop());update();};
  field('player').replaceChildren(...slots.map((_,i)=>new Option(playerLabel(i),String(i))));
  field('player').onchange=()=>{field('note').value=plan.notes[field('player').value]||'';refreshAssignment();};
  field('note').onchange=()=>{checkpoint();plan.notes[field('player').value]=field('note').value.trim();draw();};
  function assignmentPlayer(){
    return slots[Number(field('player').value)]?.player_id;
  }
  function refreshAssignment(){
    const id=assignmentPlayer(), picker=field('duty-arrow');
    picker.replaceChildren(new Option('Hareket seç',''),...frame().arrows.map((arrow,i)=>new Option((i+1)+'. '+labels[arrow.type],String(i))));
    const assigned=readTacticDuty(lineup.player_tasks?.[id]).moves;
    picker.disabled=!id||!frame().arrows.length;
    action('assign').disabled=picker.disabled;
    action('detach').disabled=!id||!assigned.some(move=>move.phase===phases[phase]);
    q('[data-duty-status]').textContent=id?'Oyuncu, kadroyu kaydedip yayımladığında hareketi görür.':'Önce kadroya bir oyuncu yerleştir.';
  }
  function saveAssignment(remove){
    const id=assignmentPlayer();
    if(!id)return;
    const duty=readTacticDuty(lineup.player_tasks?.[id]);
    const moves=duty.moves.filter(move=>move.phase!==phases[phase]);
    if(!remove){
      const arrow=frame().arrows[field('duty-arrow').value];
      if(!arrow){q('[data-duty-status]').textContent='Önce bir hareket seç.';return;}
      moves.push({phase:phases[phase],title:frame().title,type:arrow.type,
        points:[arrow.from.x,arrow.from.y,arrow.to.x,arrow.to.y].map(n=>Math.round(n*10)/10)});
    }
    const note=remove?duty.note:field('note').value.trim()||duty.note;
    const value=moves.length?{kind:'mksk-tactic-v1',note,moves}:note;
    if(JSON.stringify(value).length>2000){q('[data-duty-status]').textContent='Görev metni ve hareketler 2000 karakteri aşıyor. Notu kısalt.';return;}
    lineup.player_tasks??={};
    lineup.player_tasks[id]=value;
    onDutyChange?.();
    refreshAssignment();
    q('[data-duty-status]').textContent='Kadro taslağı güncellendi. Oyuncuya göstermek için kaydet ve yayımla.';
  }
  action('assign').onclick=()=>saveAssignment(false);
  action('detach').onclick=()=>saveAssignment(true);
  function templates(selected=''){
    const names=[...new Set(['TAKTİK 1',...Object.keys(loadTemplates())])].sort((a,b)=>a.localeCompare(b,'tr'));
    field('template').replaceChildren(new Option('Şablon seç',''),...names.map(name=>new Option(name,name)));
    field('template').value=selected;
  }
  action('save').onclick=()=>{
    const name=field('name').value.trim();if(!name){status('Bir plan adı gir.');return;}
    const saved=loadTemplates();
    try{
      localStorage.setItem(storageKey,JSON.stringify({...saved,[name]:{size:slots.length,plan}}));
      templates(name);status('Şablon bu tarayıcıya kaydedildi.');
    }catch{status('Şablon kaydedilemedi.');}
  };
  action('load').onclick=()=>{
    const name=field('template').value,saved=loadTemplates()[name];
    if(name==='TAKTİK 1'&&!saved){field('name').value=name;q('[data-command]').value=clubTacticOne;q('[data-build]').click();return;}
    if(!name||!saved){status('Bir şablon seç.');return;}
    if(saved.size!==slots.length){status('Bu şablon '+saved.size+' kişilik bir kadro için.');return;}
    checkpoint();plan=restorePlan(saved.plan);phase=0;step=0;field('name').value=name;generatedText=plan.commandText||'';q('[data-command]').value=generatedText;action('play').disabled=false;update();status('Şablon uygulandı. Görevleri kadroya göre kontrol et.');
  };
  action('delete').onclick=()=>{
    const name=field('template').value;if(!name)return;
    const saved=loadTemplates();if(name==='TAKTİK 1'&&!saved[name]){status('Kulübün TAKTİK 1 planı kayıtlı kalır. Düzenleyip kendi kopyanı kaydedebilirsin.');return;}delete saved[name];
    try{localStorage.setItem(storageKey,JSON.stringify(saved));templates();status('Şablon silindi.');}
    catch{status('Şablon silinemedi.');}
  };
  async function exportBoard(share){
    const button=action(share?'share':'download');button.disabled=true;
    try{
      await assetsReady;
      const board=document.createElement('canvas'),notes=slots.map((_,i)=>[playerLabel(i),plan.notes[i]]).filter(([,note])=>note);
      const guidance=[current().note,frame().note].filter(Boolean);
      board.width=760;board.height=910+guidance.length*112+notes.length*66;
      const g=board.getContext('2d');g.fillStyle='#10294b';g.fillRect(0,0,board.width,board.height);
      g.fillStyle='#fff';g.font='bold 34px Arial';g.fillText(shrink(g,field('name').value.trim()||'Taktik Tahtası',690),30,52);
      g.fillStyle='#c5ddf8';g.font='20px Arial';g.fillText('MKSK 2008 · '+phases[phase],30,84);
      g.fillText(shrink(g,frame().title,690),30,112);
      const pending=start;start=null;draw();g.drawImage(canvas,80,128);start=pending;draw();
      g.font='bold 18px Arial';Object.keys(labels).forEach((key,i)=>{g.fillStyle=colors[key];g.fillText(labels[key],65+i*132,854);});
      let nextY=894;
      g.font='17px Arial';g.fillStyle='#dbe9fa';
      for(const text of guidance){
        let line='';
        for(const word of text.split(/\s+/)){
          if(line&&g.measureText(line+' '+word).width>690){g.fillText(line,30,nextY);nextY+=22;line='';}
          line+=(line?' ':'')+shrink(g,word,690);
        }
        if(line){g.fillText(line,30,nextY);nextY+=34;}
      }
      notes.forEach(([player,note],i)=>{
        const y=nextY+i*66;g.fillStyle='#fff';g.font='bold 17px Arial';g.fillText(shrink(g,player,690),30,y);
        g.font='16px Arial';g.fillStyle='#dbe9fa';
        let line='',row=0;
        for(const word of note.split(/\s+/)){
          if(line&&g.measureText(line+' '+word).width>690){g.fillText(line,30,y+20+row++*18);line='';}
          line+=(line?' ':'')+shrink(g,word,690);
        }
        g.fillText(line,30,y+20+row*18);
      });
      const blob=await new Promise(resolve=>board.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Görsel oluşturulamadı.');
      const file=new File([blob],'mksk-taktik-tahtasi.png',{type:'image/png'});
      if(share&&navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'MKSK Taktik Tahtası'});return;
      }
      const url=URL.createObjectURL(file),a=document.createElement('a');
      a.href=url;a.download=file.name;dlg.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      status('PNG hazır. Dosyayı WhatsApp’tan paylaşabilirsin.');
    }catch(error){if(error.name!=='AbortError')status('Görsel paylaşılamadı. PNG indir seçeneğini dene.');}
    finally{button.disabled=false;}
  }
  action('play').onclick=async()=>{
    if(document.querySelector('.mksk-tactics-player[open]'))return;
    try{await assetsReady;}catch(e){status(e.message);return;}
    if(!dlg.open||document.querySelector('.mksk-tactics-player[open]'))return;
    const sequence=current().steps;
    const basePositions=current().positions;
    const preview=document.createElement('dialog');
    preview.className='player-hub-dialog mksk-tactics mksk-tactics-player';
    preview.setAttribute('aria-labelledby','tactics-player-title');
    preview.innerHTML=`<header><div><small>MKSK 2008</small><h2 id="tactics-player-title">Taktiği Oynat</h2><p data-playing-plan></p></div>
      <form method="dialog"><button>Kapat</button></form></header>
      <canvas width="600" height="690" role="img" aria-label="Oynatılan taktiğin saha çizimi"></canvas>
      <div class="tactics-player-step" aria-live="polite"><small data-playing-count hidden></small><strong data-playing-title></strong><p data-playing-note></p></div>
      <div class="tactics-row"><button type="button" data-previous hidden>Önceki</button><button type="button" data-toggle>▶ Oynat</button><button type="button" data-next hidden>Sonraki</button></div><div class="tactics-row"><button type="button" data-video>VİDEOYU İNDİR</button><button type="button" data-video-share>VİDEOYU PAYLAŞ</button></div><p data-video-status role="status"></p>`;
    const el=selector=>preview.querySelector(selector);
    const previewCanvas=el('canvas'),view=previewCanvas.getContext('2d');
    const previous=el('[data-previous]'), toggle=el('[data-toggle]'), next=el('[data-next]');
    let recorder=null,recording=false,recordStream=null,exportCanvas=null,exportCtx=null,shareVideo=false,exportBackdrop=null,exportStep=-1,lastExport=-Infinity;
    const videoStatus=el('[data-video-status]'),videoButtons=[el('[data-video]'),el('[data-video-share]')];
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lerp=(from,to,t)=>({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});
    const arrowMs=720;
    let selected=0, elapsed=0, lastTick=null, animation=null, playing=false, ended=false;
    el('[data-playing-plan]').textContent=(field('name').value.trim()||'Maç planı')+' · '+phases[phase];

    function duration(){
      return Math.max(1800,(Math.max(0,...sequence[selected].arrows.map((a,i)=>a.at??i))+1)*arrowMs+420);
    }
    function paint(){
      const item=sequence[selected];
      const layout=copy(item.positions||basePositions);
      const markers=copy(item.markers.filter(marker=>marker.type!=='ball'));
      (item.opponentMoves||[]).forEach(move=>{const marker=markers.filter(m=>m.type==='opponent')[move.index];if(marker)marker.at=lerp(move.from,move.to,Math.max(0,Math.min(1,elapsed/arrowMs)));});
      let ball=item.markers.find(marker=>marker.type==='ball');
      const arrows=[];
      item.arrows.forEach((arrow,i)=>{
        const progress=Math.max(0,Math.min(1,(elapsed-(arrow.at??i)*arrowMs)/arrowMs));
        if(progress===0)return;
        const at=lerp(arrow.from,arrow.to,progress);
        arrows.push({...arrow,to:at});
        if(arrow.type==='pass'||arrow.type==='shot'||arrow.type==='dribble'){
          ball={type:'ball',at};
        }
        if(arrow.type==='run'||arrow.type==='press'||arrow.type==='dribble'){
          const runner=Number.isInteger(arrow.playerIndex)?arrow.playerIndex:layout.findIndex(pos=>Math.hypot(pos.x-arrow.from.x,pos.y-arrow.from.y)<=5);
          if(runner!==-1)layout[runner]=lerp(layout[runner],arrow.to,progress);
        }
      });
      draw(view,{...item,markers,arrows:elapsed===0||(reducedMotion&&!recording)?item.arrows:arrows},layout,null);
      if(ball){
        const at=point(ball.at);
        view.fillStyle='#fff';view.strokeStyle='#143759';view.lineWidth=2;
        view.beginPath();view.arc(at.x,at.y,8,0,Math.PI*2);view.fill();view.stroke();
      }
    }


    function paintExport(now=performance.now(),force=false){
     if(!exportCtx||!recording&&!force)return;
     if(!force&&now-lastExport<1000/30)return;lastExport=now;
     const g=exportCtx;
     if(exportStep!==selected){
      exportStep=selected;exportBackdrop=document.createElement('canvas');exportBackdrop.width=760;exportBackdrop.height=1000;
      const bg=exportBackdrop.getContext('2d');bg.fillStyle='#10294b';bg.fillRect(0,0,760,1000);bg.fillStyle='#fff';bg.font='bold 28px Arial';bg.fillText('MKSK 2008 · TAKTİK PLANI',30,44);bg.font='20px Arial';bg.fillText(sequence[selected].title,30,78);
      let line='',y=832;for(const word of (sequence[selected].note||'').split(/\s+/)){if(bg.measureText(line+' '+word).width>690){bg.fillText(line,30,y);y+=27;line='';}line+=(line?' ':'')+word;}bg.fillText(line,30,y);
     }
     g.drawImage(exportBackdrop,0,0);g.drawImage(previewCanvas,80,100,600,690);
    }
    function setRecording(value){recording=value;controls();videoButtons.forEach(b=>b.disabled=value);}
    async function recordVideo(share){
     if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){videoStatus.textContent='Bu tarayıcı video kaydını desteklemiyor. Chrome veya Edge ile aç.';return;}
     pause();selected=0;elapsed=0;ended=false;shareVideo=share;exportCanvas=document.createElement('canvas');exportCanvas.width=760;exportCanvas.height=1000;exportCtx=exportCanvas.getContext('2d');exportStep=-1;lastExport=-Infinity;showStep();paintExport(performance.now(),true);
     try{
      const mime=['video/mp4','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('Video biçimi desteklenmiyor.');
      recordStream=exportCanvas.captureStream(30);const activeRecorder=new MediaRecorder(recordStream,{mimeType:mime,videoBitsPerSecond:1800000});recorder=activeRecorder;const chunks=[];
      activeRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      activeRecorder.onstop=async()=>{recordStream?.getTracks().forEach(t=>t.stop());setRecording(false);if(!preview.open)return;const blob=new Blob(chunks,{type:activeRecorder.mimeType}),ext=activeRecorder.mimeType.includes('mp4')?'mp4':'webm';if(!blob.size){videoStatus.textContent='Video oluşturulamadı. Yeniden dene.';return;}const file=new File([blob],'mksk-taktik.'+ext,{type:blob.type});
       try{if(shareVideo&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'MKSK Taktik Planı'});videoStatus.textContent='Video paylaşıldı.';}else{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;preview.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);videoStatus.textContent='Video indirildi. Dosyayı paylaşabilirsin.';}}catch(e){videoStatus.textContent=e.name==='AbortError'?'Paylaşım iptal edildi.':'Paylaşılamadı. Videoyu indir düğmesini kullan.';}
      };
      activeRecorder.onerror=()=>{pause();recordStream?.getTracks().forEach(t=>t.stop());setRecording(false);videoStatus.textContent='Kayıt tamamlanamadı. Yeniden dene.';};
      setRecording(true);activeRecorder.start();videoStatus.textContent='Video hazırlanıyor… Bu pencereyi açık tut.';playing=true;lastTick=null;animation=requestAnimationFrame(tick);
     }catch(e){recordStream?.getTracks().forEach(t=>t.stop());setRecording(false);videoStatus.textContent=e.message;}
    }
    el('[data-video]').onclick=()=>recordVideo(false);el('[data-video-share]').onclick=()=>recordVideo(true);

    function controls(){
      previous.disabled=recording||selected===0;
      next.disabled=recording||selected===sequence.length-1;toggle.disabled=recording;
      toggle.textContent=playing?'Duraklat':ended?'↻ Tekrar oynat':'▶ Oynat';
    }
    function showStep(){
      const item=sequence[selected];
      el('[data-playing-count]').textContent='Adım '+(selected+1)+' / '+sequence.length;
      el('[data-playing-title]').textContent=item.title||'Adım '+(selected+1);
      el('[data-playing-note]').textContent=item.note||current().note||'';
      controls();paint();
    }
    function pause(){
      playing=false;lastTick=null;
      if(animation!==null)cancelAnimationFrame(animation);
      animation=null;controls();
    }
    function tick(now){
      if(!playing||!preview.open)return;
      if(document.hidden){lastTick=null;animation=requestAnimationFrame(tick);return;}
      if(lastTick!==null)elapsed+=now-lastTick;
      lastTick=now;
      const total=duration();
      if(elapsed>=total){
        if(selected===sequence.length-1){
          elapsed=total;ended=true;pause();paint();paintExport(now,true);if(recording&&recorder?.state==='recording')recorder.stop();return;
        }
        elapsed-=total;selected++;showStep();
      }else if(!reducedMotion||recording){
        paint();
      }
      paintExport(now);animation=requestAnimationFrame(tick);
    }
    function jump(offset){
      pause();selected+=offset;elapsed=0;ended=false;showStep();
    }
    previous.onclick=()=>jump(-1);
    next.onclick=()=>jump(1);
    toggle.onclick=()=>{
      if(playing){pause();return;}
      if(ended){selected=0;elapsed=0;ended=false;showStep();}
      playing=true;controls();animation=requestAnimationFrame(tick);
    };
    const closeWithBoard=()=>{if(preview.open)preview.close();};dlg.addEventListener('close',closeWithBoard,{once:true});
    preview.addEventListener('close',()=>{dlg.removeEventListener('close',closeWithBoard);pause();if(recorder?.state==='recording')recorder.stop();recordStream?.getTracks().forEach(t=>t.stop());preview.remove();},{once:true});
    document.body.append(preview);preview.showModal();showStep();
  };
  action('share').onclick=()=>exportBoard(true);
  action('download').onclick=()=>exportBoard(false);
  dlg.addEventListener('close',()=>dlg.remove(),{once:true});
  document.body.append(dlg);templates();update();dlg.showModal();
}
