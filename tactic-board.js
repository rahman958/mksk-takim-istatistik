const storageKey='mksk-tactic-templates-v1';
const phases=['Top bizde','Top rakipte'];
const colors={run:'#74dcf6',press:'#ff9bac',pass:'#e3f0ff'};
const labels={run:'Koşu',press:'Pres',pass:'Pas'};
const copy=value=>JSON.parse(JSON.stringify(value));
const blankStep=()=>({title:'',arrows:[]});
function loadTemplates(){
  try{return JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}
  catch{return {};}
}
function shrink(ctx,value,width){
  let text=String(value);
  while(text.length>1&&ctx.measureText(text).width>width)text=text.slice(0,-2)+'…';
  return text;
}
export function openTactics(lineup,findPlayer){
  if(document.querySelector('.mksk-tactics[open]'))return;
  const slots=lineup.positions.map(slot=>({...slot,player:findPlayer(slot.player_id)}));
  const initial=()=>slots.map(({x,y})=>({x,y}));
  let plan={phases:phases.map(()=>({positions:initial(),steps:[blankStep()]})),notes:{}};
  let phase=0,step=0,start=null,undo=[];
  const dlg=document.createElement('dialog');
  dlg.className='player-hub-dialog mksk-tactics';
  dlg.setAttribute('aria-labelledby','mksk-tactics-title');
  dlg.innerHTML=`<header><h2 id="mksk-tactics-title">Taktik Tahtası</h2><form method="dialog"><button>Kapat</button></form></header>
    <label>Plan adı<input data-field="name" maxlength="60" value="Maç planı"></label>
    <div class="tactics-row" aria-label="Oyun durumu"><button type="button" data-phase="0">Top bizde</button><button type="button" data-phase="1">Top rakipte</button></div>
    <div class="tactics-row"><label>Adım<select data-field="step"></select></label><button type="button" data-action="add">Adım ekle</button><button type="button" data-action="remove">Adımı sil</button></div>
    <label>Adım açıklaması<input data-field="title" maxlength="80" placeholder="Örn. Arka direğe koşu"></label>
    <label>Sahada yapılacak işlem<select data-field="mode"><option value="run">Koşu oku çiz</option><option value="press">Pres oku çiz</option><option value="pass">Pas oku çiz</option><option value="move">Oyuncuyu taşı</option><option value="note">Oyuncu görevini aç</option></select></label>
    <p class="tactics-hint"></p><canvas width="600" height="690" role="img" aria-label="Forma numaraları ve taktik okları"></canvas>
    <div class="tactics-row"><button type="button" data-action="undo">Geri al</button><button type="button" data-action="share">Görseli paylaş</button><button type="button" data-action="download">PNG indir</button></div>
    <details class="tactics-notes"><summary>Oyuncu görevleri</summary><label>Oyuncu<select data-field="player"></select></label><label>Görev notu<textarea data-field="note" maxlength="120" rows="2"></textarea></label></details>
    <details><summary>Taktik şablonları</summary><label>Şablon seç<select data-field="template"></select></label><div class="tactics-row"><button type="button" data-action="load">Uygula</button><button type="button" data-action="save">Plan adıyla kaydet</button><button type="button" data-action="delete">Şablonu sil</button></div></details>
    <p role="status" class="tactics-status"></p>`;
  const q=selector=>dlg.querySelector(selector);
  const field=name=>q('[data-field="'+name+'"]');
  const action=name=>q('[data-action="'+name+'"]');
  const canvas=q('canvas'),ctx=canvas.getContext('2d');
  const current=()=>plan.phases[phase];
  const frame=()=>current().steps[step];
  const point=({x,y})=>({x:30+x*5.4,y:30+y*6.3});
  const position=event=>{
    const r=canvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(100,((event.clientX-r.left)*600/r.width-30)/5.4)),
      y:Math.max(0,Math.min(100,((event.clientY-r.top)*690/r.height-30)/6.3))};
  };
  const status=text=>{q('.tactics-status').textContent=text;};
  const checkpoint=()=>{undo.push({plan:copy(plan),phase,step});if(undo.length>40)undo.shift();action('undo').disabled=false;};
  const playerLabel=i=>slots[i].player?.full_name||slots[i].role;
  function draw(){
    ctx.fillStyle='#15375b';ctx.fillRect(0,0,600,690);
    ctx.fillStyle='#193e65';
    for(let i=0;i<6;i+=2)ctx.fillRect(30,30+i*105,540,105);
    ctx.strokeStyle='#8badd1';ctx.lineWidth=2;
    ctx.strokeRect(30,30,540,630);
    ctx.beginPath();ctx.moveTo(30,345);ctx.lineTo(570,345);ctx.stroke();
    ctx.beginPath();ctx.arc(300,345,61,0,Math.PI*2);ctx.stroke();
    for(const y of [30,562])ctx.strokeRect(173,y,254,98);
    for(const y of [30,618])ctx.strokeRect(234,y,132,42);
    for(const {from,to,type} of frame().arrows){
      const a=point(from),b=point(to),angle=Math.atan2(b.y-a.y,b.x-a.x);
      ctx.strokeStyle=colors[type];ctx.lineWidth=5;ctx.setLineDash(type==='press'?[12,8]:[]);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=colors[type];ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x-20*Math.cos(angle-.45),b.y-20*Math.sin(angle-.45));
      ctx.lineTo(b.x-20*Math.cos(angle+.45),b.y-20*Math.sin(angle+.45));ctx.closePath();ctx.fill();
    }
    current().positions.forEach((pos,i)=>{
      const {x,y}=point(pos),slot=slots[i];
      ctx.fillStyle=plan.notes[i]?'#b3e8fc':'#e6effc';ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.fill();
      ctx.textAlign='center';ctx.fillStyle='#10294b';ctx.font='bold 18px Arial';
      ctx.fillText(String(slot.player?.jersey_number??slot.role),x,y+6,34);
      ctx.fillStyle='#fff';ctx.font='bold 13px Arial';
      ctx.fillText(shrink(ctx,playerLabel(i),100),x,y+37);
    });
    if(start?.point){
      const a=point(start.point);ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(a.x,a.y,7,0,Math.PI*2);ctx.stroke();
    }
  }
  function update(){
    start=null;
    dlg.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===phase)));
    field('step').replaceChildren(...current().steps.map((_,i)=>new Option('Adım '+(i+1),String(i))));
    field('step').value=String(step);field('title').value=frame().title;
    action('remove').disabled=current().steps.length===1;
    action('add').disabled=current().steps.length>=12;
    action('undo').disabled=!undo.length;
    field('note').value=plan.notes[field('player').value]||'';
    hint();draw();
  }
  function hint(){
    const mode=field('mode').value;
    q('.tactics-hint').textContent=mode==='move'?(start?'Yeni yerine dokun.':'Önce oyuncuya, sonra yeni yerine dokun.')
      :mode==='note'?'Görev notunu görmek için bir oyuncuya dokun.'
      :start?'Okun bitiş noktasına dokun.':'Okun başlangıç ve bitiş noktalarına dokun.';
  }
  function nearest(p){
    const a=point(p);
    return current().positions.findIndex(pos=>{const b=point(pos);return Math.hypot(a.x-b.x,a.y-b.y)<=26;});
  }
  canvas.onclick=event=>{
    const p=position(event),mode=field('mode').value;
    if(mode==='note'){
      const i=nearest(p);
      if(i<0)return;
      field('player').value=String(i);field('player').onchange();
      q('.tactics-notes').open=true;field('note').focus();return;
    }
    if(!start){
      const i=nearest(p);
      if(mode==='move'&&i<0)return;
      start={point:p,index:i};
    }else{
      if(mode==='move'){
        checkpoint();current().positions[start.index]=p;
      }else if(frame().arrows.length>=40){
        status('Bu adımda en fazla 40 ok olabilir.');
      }else{
        checkpoint();frame().arrows.push({from:start.point,to:p,type:mode});
      }
      start=null;
    }
    hint();draw();
  };
  dlg.querySelectorAll('[data-phase]').forEach(button=>button.onclick=()=>{phase=Number(button.dataset.phase);step=0;update();});
  field('mode').onchange=()=>{start=null;hint();draw();};
  field('step').onchange=()=>{step=Number(field('step').value);update();};
  field('title').onchange=()=>{checkpoint();frame().title=field('title').value.trim();};
  action('add').onclick=()=>{checkpoint();step=current().steps.push(blankStep())-1;update();};
  action('remove').onclick=()=>{checkpoint();current().steps.splice(step,1);step=Math.max(0,step-1);update();};
  action('undo').onclick=()=>{({plan,phase,step}=undo.pop());update();};
  field('player').replaceChildren(...slots.map((_,i)=>new Option(playerLabel(i),String(i))));
  field('player').onchange=()=>{field('note').value=plan.notes[field('player').value]||'';};
  field('note').onchange=()=>{checkpoint();plan.notes[field('player').value]=field('note').value.trim();draw();};
  function templates(selected=''){
    const names=Object.keys(loadTemplates()).sort((a,b)=>a.localeCompare(b,'tr'));
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
    if(!name||!saved){status('Bir şablon seç.');return;}
    if(saved.size!==slots.length){status('Bu şablon '+saved.size+' kişilik bir kadro için.');return;}
    checkpoint();plan=copy(saved.plan);phase=0;step=0;field('name').value=name;update();status('Şablon uygulandı. Görevleri kadroya göre kontrol et.');
  };
  action('delete').onclick=()=>{
    const name=field('template').value;if(!name)return;
    const saved=loadTemplates();delete saved[name];
    try{localStorage.setItem(storageKey,JSON.stringify(saved));templates();status('Şablon silindi.');}
    catch{status('Şablon silinemedi.');}
  };
  async function exportBoard(share){
    const button=action(share?'share':'download');button.disabled=true;
    try{
      const board=document.createElement('canvas'),notes=slots.map((_,i)=>[playerLabel(i),plan.notes[i]]).filter(([,note])=>note);
      board.width=760;board.height=896+notes.length*58;
      const g=board.getContext('2d');g.fillStyle='#10294b';g.fillRect(0,0,board.width,board.height);
      g.fillStyle='#fff';g.font='bold 34px Arial';g.fillText(shrink(g,field('name').value.trim()||'Taktik Tahtası',690),30,52);
      g.fillStyle='#c5ddf8';g.font='20px Arial';g.fillText('MKSK 2008 · '+phases[phase]+' · Adım '+(step+1),30,84);
      g.fillText(shrink(g,frame().title,690),30,112);
      const pending=start;start=null;draw();g.drawImage(canvas,80,128);start=pending;draw();
      g.font='bold 18px Arial';Object.keys(labels).forEach((key,i)=>{g.fillStyle=colors[key];g.fillText(labels[key],80+i*140,854);});
      notes.forEach(([player,note],i)=>{
        const y=892+i*58;g.fillStyle='#fff';g.font='bold 17px Arial';g.fillText(shrink(g,player,690),30,y);
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
  action('share').onclick=()=>exportBoard(true);
  action('download').onclick=()=>exportBoard(false);
  dlg.addEventListener('close',()=>dlg.remove(),{once:true});
  document.body.append(dlg);templates();update();dlg.showModal();
}
