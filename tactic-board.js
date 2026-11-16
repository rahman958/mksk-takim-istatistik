const storageKey='mksk-tactic-templates-v1';
const phases=['Top bizde','Top rakipte','Hücuma geçiş','Savunmaya geçiş','Duran toplarımız','Rakibin duran topları','Maç içi senaryolar'];
const presets=[
  {
    name: "Kenardan hücum",
    note: "Bek bindirir, kanat içe hareket eder. Son pas için ceza alanı gerisine bak.",
    arrows: [
      {"type":"run","from":{"x":24,"y":60},"to":{"x":13,"y":19}},
      {"type":"run","from":{"x":18,"y":35},"to":{"x":36,"y":24}},
      {"type":"pass","from":{"x":13,"y":19},"to":{"x":49,"y":29}}
    ]
  },
  {
    name: "Geriden oyun kurma",
    note: "Kaleci stoperi bulur. Orta saha pas açısı oluşturur, ters kanat geniş kalır.",
    arrows: [
      {"type":"pass","from":{"x":50,"y":90},"to":{"x":28,"y":72}},
      {"type":"run","from":{"x":50,"y":49},"to":{"x":42,"y":63}},
      {"type":"pass","from":{"x":28,"y":72},"to":{"x":42,"y":63}}
    ]
  },
  {
    name: "Yüksek pres",
    note: "İlk koşu pası dışa yönlendirir. Yakın oyuncu baskıya çıkar, merkez pası kapatılır.",
    arrows: [
      {"type":"press","from":{"x":52,"y":31},"to":{"x":39,"y":14}},
      {"type":"press","from":{"x":26,"y":37},"to":{"x":19,"y":22}},
      {"type":"run","from":{"x":59,"y":46},"to":{"x":50,"y":38}}
    ]
  },
  {
    name: "Orta blok",
    note: "Merkezi daralt, rakibi kenara yönlendir ve topun olduğu tarafa birlikte kay.",
    arrows: [
      {"type":"run","from":{"x":65,"y":59},"to":{"x":55,"y":58}},
      {"type":"run","from":{"x":42,"y":58},"to":{"x":33,"y":56}},
      {"type":"press","from":{"x":23,"y":51},"to":{"x":15,"y":44}}
    ]
  },
  {
    name: "Hızlı kontra",
    note: "İlk pas öne, ikinci koşu boş koridora. Topu kazanan oyuncuya kısa destek ver.",
    arrows: [
      {"type":"pass","from":{"x":46,"y":70},"to":{"x":34,"y":49}},
      {"type":"run","from":{"x":64,"y":53},"to":{"x":72,"y":20}},
      {"type":"pass","from":{"x":34,"y":49},"to":{"x":72,"y":20}}
    ]
  },
  {
    name: "Top kaybı sonrası",
    note: "Topa yakın oyuncular baskı yapar. Arkadakiler merkeze dönüp derinliği korur.",
    arrows: [
      {"type":"press","from":{"x":34,"y":35},"to":{"x":45,"y":43}},
      {"type":"press","from":{"x":56,"y":35},"to":{"x":45,"y":43}},
      {"type":"run","from":{"x":64,"y":52},"to":{"x":53,"y":66}}
    ]
  },
  {
    name: "Korner · hücum",
    note: "Ön direğe koşuyla alan aç. İkinci oyuncu arka direğe gider, biri seken topu bekler.",
    arrows: [
      {"type":"pass","from":{"x":97,"y":3},"to":{"x":60,"y":13}},
      {"type":"run","from":{"x":64,"y":28},"to":{"x":60,"y":13}},
      {"type":"run","from":{"x":45,"y":26},"to":{"x":37,"y":12}}
    ]
  },
  {
    name: "Korner · savunma",
    note: "Ön direk, merkez ve arka direği paylaş. Seken top için ceza alanı dışında bir oyuncu bırak.",
    arrows: [
      {"type":"run","from":{"x":71,"y":73},"to":{"x":65,"y":93}},
      {"type":"run","from":{"x":50,"y":78},"to":{"x":50,"y":90}},
      {"type":"run","from":{"x":29,"y":74},"to":{"x":38,"y":94}}
    ]
  },
  {
    name: "Frikik · hücum",
    note: "Bir oyuncu topa yaklaşır, diğer oyuncu savunma arkasına hareket eder.",
    arrows: [
      {"type":"run","from":{"x":56,"y":31},"to":{"x":68,"y":27}},
      {"type":"pass","from":{"x":67,"y":32},"to":{"x":49,"y":12}}
    ]
  },
  {
    name: "Frikik · savunma",
    note: "Barajı ve arka direği yerleştir. Kaleci görüş alanını ve çevrilen topları kontrol eder.",
    arrows: [
      {"type":"run","from":{"x":56,"y":68},"to":{"x":57,"y":80}},
      {"type":"run","from":{"x":70,"y":66},"to":{"x":66,"y":80}}
    ]
  },
  {
    name: "Taç",
    note: "Yakına bir seçenek, çizgiye bir koşu. Topu geri alacak oyuncuyu belirle.",
    arrows: [
      {"type":"run","from":{"x":85,"y":48},"to":{"x":92,"y":58}},
      {"type":"run","from":{"x":82,"y":59},"to":{"x":92,"y":40}},
      {"type":"pass","from":{"x":98,"y":59},"to":{"x":92,"y":58}}
    ]
  },
  {
    name: "Kale vuruşu",
    note: "Savunma iki yana açılır. Orta saha oyuncusu ilk pas için dönük konum alır.",
    arrows: [
      {"type":"run","from":{"x":40,"y":80},"to":{"x":22,"y":73}},
      {"type":"run","from":{"x":60,"y":80},"to":{"x":78,"y":73}},
      {"type":"pass","from":{"x":50,"y":93},"to":{"x":22,"y":73}}
    ]
  },
  {
    name: "Santra",
    note: "İlk pasla topu güvene al. Kanatlar açılırken merkezde pas bağlantısı kur.",
    arrows: [
      {"type":"pass","from":{"x":50,"y":50},"to":{"x":50,"y":64}},
      {"type":"run","from":{"x":26,"y":51},"to":{"x":13,"y":42}},
      {"type":"run","from":{"x":74,"y":51},"to":{"x":87,"y":42}}
    ]
  },
  {
    name: "Penaltı",
    note: "Vuracak oyuncuyu ve sırayı plan notuna yaz. Dönen top için yerleşimi hazırla.",
    arrows: [
      {"type":"shot","from":{"x":50,"y":12},"to":{"x":57,"y":1}}
    ]
  },
  {
    name: "Skoru koruma",
    note: "Hatlar arası mesafeyi kısalt. Bir oyuncu çıkış pası için önde kalsın.",
    arrows: [
      {"type":"run","from":{"x":28,"y":56},"to":{"x":33,"y":71}},
      {"type":"run","from":{"x":68,"y":57},"to":{"x":66,"y":71}},
      {"type":"run","from":{"x":47,"y":38},"to":{"x":49,"y":50}}
    ]
  },
  {
    name: "Gol arama",
    note: "Bir oyuncu savunma arkasına koşar. Kenardan geriye pası ve seken topu planla.",
    arrows: [
      {"type":"run","from":{"x":52,"y":42},"to":{"x":63,"y":20}},
      {"type":"pass","from":{"x":85,"y":19},"to":{"x":51,"y":28}},
      {"type":"shot","from":{"x":51,"y":28},"to":{"x":50,"y":2}}
    ]
  },
  {
    name: "Eksik oyuncuyla oyun",
    note: "Merkezi kapat, rakibi dışa yönlendir. Top kazanılınca öndeki oyuncuyu bul.",
    arrows: [
      {"type":"run","from":{"x":29,"y":55},"to":{"x":38,"y":65}},
      {"type":"run","from":{"x":71,"y":56},"to":{"x":62,"y":66}},
      {"type":"pass","from":{"x":50,"y":66},"to":{"x":54,"y":36}}
    ]
  }
];
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
export function openTactics(lineup,findPlayer){
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
    <details><summary>Hazır futbol taktikleri</summary><label>Taktik seç<select data-field="preset"></select></label><p data-preset-note></p><button type="button" data-action="preset">Yeni adım olarak ekle</button></details>
    <details><summary>Bölümün maç planı</summary><label>Plan notu<textarea data-field="phase-note" maxlength="360" rows="3" placeholder="Diziliş, pres tetikleyicisi, oyuncu değişikliği veya duran top sırası"></textarea></label></details>
    <div class="tactics-row"><label>Adım<select data-field="step"></select></label><button type="button" data-action="add">Adım ekle</button><button type="button" data-action="remove">Adımı sil</button></div>
    <label>Adım açıklaması<input data-field="title" maxlength="80" placeholder="Örn. Arka direğe koşu"></label>
    <label>Sahada yapılacak işlem<select data-field="mode"><option value="run">Koşu oku çiz</option><option value="press">Pres oku çiz</option><option value="pass">Pas oku çiz</option><option value="shot">Şut oku çiz</option><option value="dribble">Top sürme oku çiz</option><option value="ball">Topu yerleştir</option><option value="opponent">Rakip oyuncu ekle</option><option value="zone">Alan işaretle</option><option value="move">Oyuncuyu taşı</option><option value="note">Oyuncu görevini aç</option></select></label>
    <p class="tactics-hint"></p><p data-step-guide></p><canvas width="600" height="690" role="img" aria-label="Forma numaraları ve taktik okları"></canvas>
    <div class="tactics-row"><button type="button" data-action="undo">Geri al</button><button type="button" data-action="clear">Çizimleri temizle</button><button type="button" data-action="share">Görseli paylaş</button><button type="button" data-action="download">PNG indir</button></div>
    <details class="tactics-notes"><summary>Oyuncu görevleri</summary><label>Oyuncu<select data-field="player"></select></label><label>Görev notu<textarea data-field="note" maxlength="120" rows="2"></textarea></label></details>
    <details><summary>Taktik şablonları</summary><label>Şablon seç<select data-field="template"></select></label><div class="tactics-row"><button type="button" data-action="load">Uygula</button><button type="button" data-action="save">Plan adıyla kaydet</button><button type="button" data-action="delete">Şablonu sil</button></div></details>
    <p role="status" class="tactics-status"></p>`;
  const q=selector=>dlg.querySelector(selector);
  const field=name=>q('[data-field="'+name+'"]');
  const action=name=>q('[data-action="'+name+'"]');
  const canvas=q('canvas'),ctx=canvas.getContext('2d');
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
    for(const {at,type,to} of frame().markers){
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
    for(const {from,to,type} of frame().arrows){
      const a=point(from),b=point(to),angle=Math.atan2(b.y-a.y,b.x-a.x);
      ctx.strokeStyle=colors[type];ctx.lineWidth=5;ctx.setLineDash(type==='press'?[12,8]:type==='dribble'?[4,6]:[]);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=colors[type];ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x-20*Math.cos(angle-.45),b.y-20*Math.sin(angle-.45));
      ctx.lineTo(b.x-20*Math.cos(angle+.45),b.y-20*Math.sin(angle+.45));ctx.closePath();ctx.fill();
    }
    positions().forEach((pos,i)=>{
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
    field('phase').value=String(phase);
    field('phase-note').value=current().note||'';
    action('preset').disabled=current().steps.length>=12;
    field('step').replaceChildren(...current().steps.map((_,i)=>new Option('Adım '+(i+1),String(i))));
    field('step').value=String(step);field('title').value=frame().title;
    action('remove').disabled=current().steps.length===1;
    action('add').disabled=current().steps.length>=12;
    action('undo').disabled=!undo.length;
    field('note').value=plan.notes[field('player').value]||'';
    q('[data-step-guide]').textContent=frame().note||'';
    q('[data-step-guide]').hidden=!frame().note;
    hint();draw();
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
    hint();draw();
  };
  field('phase').onchange=()=>{phase=Number(field('phase').value);step=0;update();};
  field('phase-note').onchange=()=>{checkpoint();current().note=field('phase-note').value.trim();};
  field('preset').replaceChildren(...presets.map(({name},i)=>new Option(name,String(i))));
  field('preset').onchange=()=>{q('[data-preset-note]').textContent=presets[field('preset').value].note;};
  field('preset').onchange();
  action('preset').onclick=()=>{
    const preset=presets[field('preset').value];
    checkpoint();
    const next={...blankStep(),title:preset.name,arrows:copy(preset.arrows),positions:copy(positions()),note:preset.note};
    step=current().steps.push(next)-1;update();status(preset.note);
  };
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
    checkpoint();plan=restorePlan(saved.plan);phase=0;step=0;field('name').value=name;update();status('Şablon uygulandı. Görevleri kadroya göre kontrol et.');
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
      const guidance=[current().note,frame().note].filter(Boolean);
      board.width=760;board.height=910+guidance.length*112+notes.length*66;
      const g=board.getContext('2d');g.fillStyle='#10294b';g.fillRect(0,0,board.width,board.height);
      g.fillStyle='#fff';g.font='bold 34px Arial';g.fillText(shrink(g,field('name').value.trim()||'Taktik Tahtası',690),30,52);
      g.fillStyle='#c5ddf8';g.font='20px Arial';g.fillText('MKSK 2008 · '+phases[phase]+' · Adım '+(step+1),30,84);
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
  action('share').onclick=()=>exportBoard(true);
  action('download').onclick=()=>exportBoard(false);
  dlg.addEventListener('close',()=>dlg.remove(),{once:true});
  document.body.append(dlg);templates();update();dlg.showModal();
}
