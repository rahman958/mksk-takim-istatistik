
const upper=s=>String(s??'').toLocaleUpperCase('tr-TR');
function text(g,value,x,y,width,size=26,color='#122755',align='left'){
 g.fillStyle=color;g.textAlign=align;g.font='bold '+size+'px Arial';const valueText=upper(value);while(g.measureText(valueText).width>width&&size>14)g.font='bold '+(--size)+'px Arial';g.fillText(valueText,x,y,width);
}
function box(g,x,y,w,h,fill,r=14){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
function lines(g,value,width,size){g.font='bold '+size+'px Arial';const rows=[''];for(const word of upper(value).split(/\s+/)){const i=rows.length-1,test=(rows[i]+' '+word).trim();if(g.measureText(test).width>width&&rows[i])rows.push(word);else rows[i]=test;}return rows;}
export function renderLineupPoster({draft,findPlayer,layout,theme,paintShirt,paintCrest}){
 const c=document.createElement('canvas'),g=c.getContext('2d'),bench=draft.bench.filter(Boolean),n=draft.positions.length;
 const cardRows=Math.ceil(n/2),extra=Math.max(1,Math.ceil(bench.length/3))*100;
 c.width=1080;c.height=(layout==='cards'?1150+cardRows*110:layout==='split'?1580:1780)+extra;
 const ink='#122755',muted='#4b6685',page=theme.page,white='#ffffff';g.fillStyle=page;g.fillRect(0,0,c.width,c.height);
 const isDark=page==='#0b2447',bodyInk=isDark?'#f7f9ff':ink;
 box(g,24,22,1032,layout==='poster'?330:250,white);
 if(layout==='poster'){
  paintCrest(g,540,104,132);text(g,'MKSK 2008',540,247,930,94,ink,'center');
  text(g,'MECİDİYE KARAHİSAR SPOR KULÜBÜ',540,293,970,26,muted,'center');
 }else{
  paintCrest(g,111,124,146);text(g,'MKSK',230,137,760,100);
  text(g,'2008 · '+draft.title,234,202,760,32);
 }
 const headerBottom=layout==='poster'?375:293;
 box(g,36,headerBottom,1008,66,'#173b68',8);text(g,'MKSK — '+(draft.opponent||'RAKİP BELİRTİLMEDİ'),540,headerBottom+44,950,38,white,'center');
 const date=draft.match_date?draft.match_date.split('-').reverse().join('.'):'TARİH BELİRTİLMEDİ',time=(draft.match_time||'').slice(0,5)||'SAAT BELİRTİLMEDİ';
 text(g,date+' · '+time,40,headerBottom+113,620,27,bodyInk);
 text(g,draft.venue||'SAHA BELİRTİLMEDİ',1040,headerBottom+113,370,27,bodyInk,'right');
 const pitchTop=headerBottom+145;
 const pitch=layout==='split'?{x:36,y:pitchTop,w:650,h:965}:layout==='cards'?{x:45,y:pitchTop,w:990,h:550}:{x:36,y:pitchTop,w:1008,h:1080};
 box(g,pitch.x,pitch.y,pitch.w,pitch.h,theme.pitch[0]);g.save();g.beginPath();g.rect(pitch.x,pitch.y,pitch.w,pitch.h);g.clip();
 for(let i=0;i<8;i++)if(i%2){g.fillStyle=theme.pitch[1];g.globalAlpha=.4;g.fillRect(pitch.x+i*pitch.w/8,pitch.y,pitch.w/8,pitch.h);}g.globalAlpha=1;g.restore();
 const ix=pitch.x+18,iy=pitch.y+18,iw=pitch.w-36,ih=pitch.h-36;
 g.strokeStyle=theme.line;g.lineWidth=3;g.strokeRect(ix,iy,iw,ih);g.beginPath();g.moveTo(ix,iy+ih/2);g.lineTo(ix+iw,iy+ih/2);g.stroke();g.beginPath();g.ellipse(ix+iw/2,iy+ih/2,iw*.12,ih*.09,0,0,Math.PI*2);g.stroke();
 [iy,iy+ih*.83].forEach(y=>g.strokeRect(ix+iw*.25,y,iw*.5,ih*.17));
 paintCrest(g,ix+iw/2,iy+ih/2,Math.min(iw,ih)*.25,.12);
 const scale=layout==='cards'?.43:layout==='split'?.68:.9;
 // Keep all name plates inside the pitch even at extreme dragged positions.
 for(const slot of draft.positions){
  const player=findPlayer(slot.player_id),px=ix+iw*Math.max(.10,Math.min(.90,slot.x/100)),py=iy+ih*Math.max(.11,Math.min(.86,slot.y/100));
  g.save();g.translate(px,py);g.scale(scale,scale);paintShirt(g,0,0,/^(GK|KL|KALE|KALECİ|KALECI)$/i.test(upper(slot.role)));g.restore();
  const pillY=py+64*scale,pillW=54*scale;box(g,px-pillW/2,pillY,pillW,32*scale,white,5);text(g,player?.jersey_number??'—',px,pillY+25*scale,pillW-4,25*scale,ink,'center');
  if(layout!=='cards'){
   const w=layout==='split'?144:190,nameRows=lines(g,player?.full_name||'OYUNCU SEÇ',w-10,layout==='split'?18:23);
   const rows=nameRows.length>2?[nameRows[0],nameRows.slice(1).join(' ')]:nameRows,sy=pillY+34*scale;
   box(g,px-w/2,sy,w,rows.length*25+10,white,7);rows.forEach((t,i)=>text(g,t,px,sy+25+i*25,w-10,layout==='split'?18:23,ink,'center'));
  }
 }
 let after=pitchTop+pitch.h+26;
 if(layout==='cards'){
  draft.positions.forEach((slot,i)=>{const p=findPlayer(slot.player_id),x=36+i%2*514,y=after+Math.floor(i/2)*110;box(g,x,y,494,96,white,10);box(g,x+10,y+12,68,72,'#193f6b',6);text(g,p?.jersey_number??'—',x+44,y+62,58,36,white,'center');text(g,p?.full_name||'OYUNCU SEÇ',x+94,y+43,385,26);text(g,slot.role,x+94,y+77,375,21,muted);});
  after+=cardRows*110+14;
 }
 if(layout==='split'){
  const rowH=Math.min(112,965/n);
  draft.positions.forEach((slot,i)=>{const p=findPlayer(slot.player_id),x=706,y=pitchTop+i*rowH;box(g,x,y,338,rowH-10,white,8);box(g,x+8,y+12,60,rowH-34,'#193f6b',5);text(g,p?.jersey_number??'—',x+38,y+rowH*.56,50,31,white,'center');const rows=lines(g,p?.full_name||'OYUNCU SEÇ',245,23);rows.slice(0,2).forEach((t,j)=>text(g,t,x+80,y+30+j*25,245,23));text(g,slot.role,x+80,y+rowH-25,245,19,muted);});
 }
 text(g,'YEDEKLER',36,after+32,1000,31,bodyInk);after+=52;
 if(!bench.length)text(g,'YEDEK BELİRTİLMEDİ',36,after+33,1000,24,bodyInk);
 bench.forEach((id,i)=>{const p=findPlayer(id),x=36+i%3*342,y=after+Math.floor(i/3)*100;box(g,x,y,324,88,white,10);text(g,'#'+(p?.jersey_number??'—'),x+12,y+28,300,23);const r=lines(g,p?.full_name||'OYUNCU',300,21);r.slice(0,2).forEach((t,j)=>text(g,t,x+12,y+55+j*23,300,21));});
 text(g,'ŞEREFİNLE OYNA, ŞEREFİNLE KAZAN',540,c.height-27,1000,23,bodyInk,'center');
 return c;
}
