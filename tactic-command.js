
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=n=>Math.max(5,Math.min(95,n));
export function compileTactic(text,slots){
 const phased=compilePhasePlan(text,slots);if(phased)return phased;
 const lines=String(text||'').split(/[.!?;\n]+/).map(s=>s.trim()).filter(Boolean);
 const issues=[],steps=[];let phase='Top bizde',layout=slots.map(s=>({x:Number(s.x),y:Number(s.y)}));
 if(!lines.length)return {steps,issues:['Önce taktiğini yaz.']};
 if(lines.length>24)return {steps,issues:['Planı en fazla 24 cümleye indir.']};
 const roles=slots.map(s=>norm(s.role)),gk=i=>/^(gk|kl|kaleci)$/.test(roles[i]);
 for(const sentence of lines){
  const n=norm(sentence);
  if(/top (rakipte|rakip)/.test(n))phase='Top rakipte';
  else if(/topu? kayb|top kayb/.test(n))phase='Topu kaybettik';
  else if(/topu? kazan/.test(n))phase='Topu kazandık';
  else if(/top bizde/.test(n))phase='Top bizde';
  const parts=sentence.split(/,|\s+(?:sonra|ardından|ardindan)\s+|\s+ve\s+(?=(?:forvet|kanat|orta saha|savunma|kaleci|bek|sağ|sol|sag)\b)/i).map(s=>s.trim()).filter(Boolean);
  const before=clone(layout),arrows=[];let ball={x:50,y:50};
  for(const part of parts){
   const p=norm(part);let ids=[],explicit=false;
   const choose=fn=>{explicit=true;ids=slots.map((s,i)=>i).filter(fn);};
   const names=slots.map((s,i)=>({i,name:norm(s.player?.full_name)})).filter(x=>x.name&&p.includes(x.name));
   if(names.length){ids=names.map(x=>x.i);explicit=true;}
   else if(/kaleci/.test(p))choose((s,i)=>gk(i));
   else if(/forvet|santrafor/.test(p))choose((s,i)=>/^(f|st|fw)$/.test(roles[i]));
   else if(/orta saha|merkez/.test(p))choose((s,i)=>/^(os|dos|oos|cm|dm|am)$/.test(roles[i]));
   else if(/kanat/.test(p))choose((s,i)=>(/^(slk|sgk|lw|rw)$/.test(roles[i]))&&(!/sag/.test(p)||s.x>50)&&(!/sol/.test(p)||s.x<50));
   else if(/savunma|stoper|bek/.test(p))choose((s,i)=>/^(stp|slb|sgb|cb|lb|rb)$/.test(roles[i])&&(!/bek/.test(p)||roles[i]!=='stp')&&(!/sag/.test(p)||s.x>50)&&(!/sol/.test(p)||s.x<50));
   const pressure=/baski|pres/.test(p),retreat=/geri (cekil|don|gel)|geriye|geri cek/.test(p);
   const wide=/acil|genis/.test(p),narrow=/daral|merkezi kapat|pas (yol|kanal)/.test(p);
   const forward=/ileri|one (cik|gel|yaklas)|yuksel|ceza (sahasi|alan)|savunma arkasi|kos/.test(p);
   const pass=/pas (at|ver|yap)|pasla|pas ats/.test(p),shot=/sut|vur/.test(p),dribble=/top sur/.test(p);
   const action=pressure||retreat||wide||narrow||forward||pass||shot||dribble;
   // A phase prefix alone is valid; every other clause needs a supported action.
   if(!action){if(!/^top (bizdeyken|rakipteyken|bizde|rakipte)$/.test(p))issues.push('Anlaşılamadı: '+part);continue;}
   if(!explicit){
    if(pressure||retreat||wide||narrow||/kontra|hizli cik|pasla/.test(p))ids=slots.map((s,i)=>i).filter(i=>!gk(i));
    else {issues.push('Oyuncu veya mevki belirt: '+part);continue;}
   }
   if(!ids.length){issues.push('Kadroda bu mevki bulunamadı: '+part);continue;}
   if(/\b(yapma|etme|cikma|gitme|atmasin|yapmasin|olmasin)\b/.test(p)){issues.push('Olumsuz talimatı hedef hareket olarak yeniden yaz: '+part);continue;}
   for(const i of ids){
    const from=clone(layout[i]);let to=clone(from),type='run';
    if(retreat)to.y=clamp(from.y+18);
    else if(pressure){to.y=clamp(from.y-18);to.x=clamp(from.x+(50-from.x)*.25);type='press';}
    else if(wide)to.x=from.x<50?12:from.x>50?88:50;
    else if(narrow)to.x=clamp(from.x+(50-from.x)*.4);
    else if(forward||dribble)to.y=clamp(from.y-20);
    if(pass||shot){
     type=shot?'shot':'pass';
     if(shot)to={x:50,y:2};
     else {
      const target=slots.map((s,j)=>j).filter(j=>j!==i&&layout[j].y<from.y).sort((a,b)=>Math.hypot(layout[a].x-from.x,layout[a].y-from.y)-Math.hypot(layout[b].x-from.x,layout[b].y-from.y))[0];
      if(target===undefined){issues.push('Öndeki pas hedefi bulunamadı: '+part);continue;}
      to=clone(layout[target]);
     }
     ball=clone(to);
    }else {if(dribble)type='dribble';if(slots.some((s,j)=>j!==i&&Math.hypot(layout[j].x-to.x,layout[j].y-to.y)<10))to.x=clamp(to.x+(to.x<=50?-11:11));layout[i]=clone(to);}
    if(Math.hypot(from.x-to.x,from.y-to.y)>.1)arrows.push({from,to,type,playerIndex:i});
   }
  }
  if(arrows.length){
   const opponents=Array.from({length:Math.max(1,slots.length-1)},(_,i)=>({type:'opponent',at:{x:15+(i%3)*35,y:15+Math.floor(i/3)*17}}));
   steps.push({title:phase,note:sentence,positions:before,arrows,markers:[...opponents,{type:'ball',at:phase==='Top rakipte'||phase==='Topu kaybettik'?{x:50,y:32}:before.find((_,i)=>!gk(i))||ball}]});
  }else if(!issues.length)issues.push('Hareket oluşturulamadı: '+sentence);
 }
 return {steps,issues:[...new Set(issues)]};
}

function compilePhasePlan(text,slots){
 const n=norm(text);
 if(!/rakip atag|top rakip/.test(n)||!/topu kaz/.test(n)||!/savunma.*3|savunma.*uc/.test(n))return null;
 const roles=slots.map(s=>norm(s.role)),ids=re=>roles.map((r,i)=>re.test(r)?i:-1).filter(i=>i>=0);
 const keepers=ids(/^(gk|kl|kaleci)$/),backs=ids(/^(stp|slb|sgb|cb|lb|rb)$/),mids=ids(/^(os|dos|oos|cm|dm|am)$/),wings=ids(/^(slk|sgk|lw|rw)$/),strikers=ids(/^(f|st|fw)$/);
 const issues=[];
 if(keepers.length!==1)issues.push('Bu plan için kadroda bir kaleci olmalı.');
 if(backs.length!==3)issues.push('Üçlü savunmadan dörtlüye geçiş için ilk kadroda üç savunmacı seç.');
 if(!mids.length)issues.push('Savunmaya geçecek orta saha oyuncusu kadroda bulunamadı.');
 if(!wings.length)issues.push('İçeri kat edecek kanat oyuncusu kadroda bulunamadı.');
 if(strikers.length!==1)issues.push('Orta sahaya dönecek bir forvet seç.');
 const fullbacks=ids(/^(slb|sgb|lb|rb)$/);
 if(!fullbacks.length)issues.push('Kalecinin pas vereceği bek kadroda bulunamadı.');
 if(issues.length)return {steps:[],issues};
 let layout=slots.map(s=>({x:Number(s.x),y:Number(s.y)}));const initial=clone(layout),steps=[];
 const opponents=Array.from({length:slots.length-1},(_,i)=>({type:'opponent',at:{x:12+(i%4)*25,y:25+Math.floor(i/4)*22}}));
 function scene(title,note,targets,passes=[]){
  const before=clone(layout),arrows=[];
  targets.forEach(({i,to})=>{arrows.push({playerIndex:i,from:clone(layout[i]),to:clone(to),type:title==='Top rakipte'?'press':'run',at:0});layout[i]=clone(to);});
  passes.forEach(([a,b],j)=>arrows.push({playerIndex:a,from:clone(layout[a]),to:b===null?{x:50,y:2}:clone(layout[b]),type:b===null?'shot':'pass',at:j+(targets.length?1:0)}));
  steps.push({title,note,positions:before,arrows,markers:[...clone(opponents),{type:'ball',at:clone(before[passes[0]?.[0]??keepers[0]])}]});
 }
 scene('Top bizde','Kaleci, beke pas vererek hücumu başlatır.',[],[[keepers[0],fullbacks[0]]]);
 const sorted=[...backs].sort((a,b)=>layout[a].x-layout[b].x);
 scene('Top bizde','Üçlü savunma çizgisi orta sahaya yaklaşır.',sorted.map((i,j)=>({i,to:{x:20+j*30,y:57}})),[[fullbacks[0],mids[0]]]);
 const attack=wings.map(i=>({i,to:{x:layout[i].x<50?34:66,y:23}}));
 scene('Top bizde','Kanatlar dikine ilerleyip içeri kat eder; paslaşarak gol aranır.',attack,[[mids[0],wings[0]],...(wings.length>1?[[wings[0],wings[1]]]:[]),[wings[wings.length-1],strikers[0]],[strikers[0],null]]);
 const defenders=[...backs,mids[0]].sort((a,b)=>layout[a].x-layout[b].x);
 const targets=defenders.map((i,j)=>({i,to:{x:12+j*25,y:58}}));
 targets.push({i:strikers[0],to:{x:50,y:39}});
 wings.forEach((i,j)=>targets.push({i,to:{x:opponents[j].at.x,y:opponents[j].at.y+7}}));
 scene('Top rakipte','Orta saha savunmaya katılır ve savunma dörtlenir. Forvet orta sahaya döner; kanatlar önde adam karşılayarak baskı yapar.',targets);
 // Each outfield player is assigned a distinct opponent; assignments are visible in the scene.
 steps[steps.length-1].opponentMoves=slots.map((_,i)=>i).filter(i=>i!==keepers[0]).map((i,j)=>({index:j,from:clone(opponents[j].at),to:{x:layout[i].x,y:layout[i].y-6}}));
 steps[steps.length-1].marking=slots.map((_,i)=>i).filter(i=>i!==keepers[0]).map((i,j)=>({playerIndex:i,opponentIndex:j}));
 const defending=steps[steps.length-1];defending.markers.find(m=>m.type==='ball').at=clone(opponents[0].at);defending.arrows.push({from:clone(opponents[0].at),to:clone(opponents[1].at),type:'pass',at:0});
 scene('Topu kazandık','Top kazanılınca oyuncular ilk kadrodaki yerlerine döner.',initial.map((to,i)=>({i,to})));
 const recovery=steps[steps.length-1];recovery.markers.find(m=>m.type==='ball').at=clone(opponents[1].at);recovery.arrows.push({from:clone(opponents[1].at),to:clone(initial[mids[0]]),type:'pass',at:0});
 return {steps,issues:[]};
}
