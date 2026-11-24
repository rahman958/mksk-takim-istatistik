
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=n=>Math.max(5,Math.min(95,n));
export function compileTactic(text,slots){
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
