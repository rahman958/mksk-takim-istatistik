// Canvas export shared by the application and offline layout tests.
export const rosterColumns = [
  ['full_name','Oyuncu adı soyadı',390],['jersey_number','Forma no',90],['position','Mevki',100],
  ['management_role','Yönetim görevi',280],['group_name','Oyuncunun grubu',150],
  ['matches','Maç sayısı',105],['goals','Gol sayısı',105],['assists','Asist sayısı',110],
  ['goals_conceded','Yenilen gol',140],['man_of_match','Maçın adamı',140],
  ['success','Başarı yüzdesi',150],['discipline_referrals','Disiplin sevk',150],
  ['attendance_matches','Antrenman sayısı',155],['attendance_goals','Antrenman golü',155],
  ['attendance_points','Antrenman puanı',155],['status','Oyuncu durumu',240],
  ['performance_label','Performans durumu',270]
];
export function rosterPosition(p) {
  return String(p.position||'').trim().toLocaleUpperCase('tr-TR').replace(/Ğ/g,'G');
}
export function rosterGroup(p) {
  const k=rosterPosition(p);
  if(k==='GK')return 'KALECİLER';
  if(['STP','SGB','SLB'].includes(k))return 'SAVUNMA';
  if(['OS','DOS','OOS'].includes(k))return 'ORTA SAHA';
  if(['F','SGK','SLK'].includes(k))return 'FORVETLER';
  return k?'DİĞER MEVKİLER':'MEVKİ BELİRTİLMEDİ';
}
const groupOrder=['KALECİLER','SAVUNMA','ORTA SAHA','FORVETLER','DİĞER MEVKİLER','MEVKİ BELİRTİLMEDİ'];
export function rosterStats(p,season) {return (p.player_season_stats||[]).find(s=>s.season===season)||{};}
export function rosterValues(p,season) {
  const s=rosterStats(p,season),n=k=>Number(s[k]||0);
  const percent=s.manager_percent??(s.manager_rating==null?null:Number(s.manager_rating)*10);
  return [p.full_name||'—',p.jersey_number??'—',p.position||'—',p.management_role||'—',p.group_name||'—',
    n('matches'),n('goals'),n('assists'),n('goals_conceded'),n('man_of_match'),
    percent==null?'—':Number(percent).toLocaleString('tr-TR',{maximumFractionDigits:1})+'%',
    n('discipline_referrals'),n('attendance_matches'),n('attendance_goals'),n('attendance_points'),
    p.status||'Aktif',p.performance_label||'Değerlendirilmedi'];
}
export function wrapRosterText(ctx,value,width,fontSize,bold=false) {
  ctx.font=`${bold?'700':'400'} ${fontSize}px Arial`;
  const lines=[];let line='';
  for(const word of String(value??'—').split(/\s+/)) {
    if(!word)continue;
    if(ctx.measureText(word).width>width) {
      if(line){lines.push(line);line='';}
      for(const char of Array.from(word)) {
        if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}
        line+=char;
      }
    } else if(line&&ctx.measureText(line+' '+word).width>width) {lines.push(line);line=word;}
    else line=line?line+' '+word:word;
  }
  if(line)lines.push(line);
  return lines.length?lines:['—'];
}
export function drawRosterImage(canvas,players,options={}) {
  const season=options.season||'',ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Görsel çizimi bu tarayıcıda açılamadı.');
  const rows=players.filter(p=>!p.archived_at).slice().sort((a,b)=>
    groupOrder.indexOf(rosterGroup(a))-groupOrder.indexOf(rosterGroup(b))||
    (Number(a.jersey_number??9999)-Number(b.jersey_number??9999))||
    String(a.full_name).localeCompare(String(b.full_name),'tr'));
  if(!rows.length)throw Error('Paylaşılacak oyuncu yok.');
  const margin=34,font=26,line=33,headerTop=278,headerHeight=128,bandHeight=52;
  const width=rosterColumns.reduce((sum,c)=>sum+c[2],0)+margin*2;
  const prepared=rows.map(p=>{const values=rosterValues(p,season),lines=values.map((v,i)=>wrapRosterText(ctx,v,rosterColumns[i][2]-20,font,i===0));return {p,values,lines,height:Math.max(82,...lines.map(a=>a.length*line+26))};});
  let height=headerTop+headerHeight+190,last='';
  for(const row of prepared){const group=rosterGroup(row.p);if(group!==last){height+=bandHeight;last=group;}height+=row.height;}
  // Keep a single image within a conservative mobile canvas pixel budget.
  const scale=Math.min(1,Math.sqrt(12000000/(width*height)),8192/height,4096/width);
  canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);
  ctx.scale(scale,scale);ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#243f68';ctx.fillRect(0,0,width,234);ctx.fillStyle='#d7bd77';ctx.fillRect(0,234,width,7);
  ctx.fillStyle='#fff';ctx.font='700 51px Arial';ctx.fillText('MECİDİYE KARAHİSAR SPOR KULÜBÜ',margin,76);
  ctx.font='700 42px Arial';ctx.fillText('TAKIM LİSTESİ',margin,142);
  ctx.fillStyle='#e3ecf8';ctx.font='27px Arial';ctx.fillText(`${season} · ${options.date||''} · ${rows.length} OYUNCU · TEK GÖRSEL`,margin,195);
  if(options.logo)ctx.drawImage(options.logo,width-198,32,160,160);
  let left=margin;
  for(const [key,label,colWidth] of rosterColumns){ctx.fillStyle='#e0e9f3';ctx.fillRect(left,headerTop,colWidth,headerHeight);ctx.fillStyle='#27415d';ctx.font='700 24px Arial';ctx.textAlign=key==='full_name'?'left':'center';const lines=wrapRosterText(ctx,label,colWidth-18,24,true);lines.forEach((t,i)=>ctx.fillText(t,key==='full_name'?left+10:left+colWidth/2,headerTop+34+i*29));left+=colWidth;}
  let y=headerTop+headerHeight,index=0;last='';
  for(const row of prepared){const group=rosterGroup(row.p);if(group!==last){ctx.fillStyle='#316577';ctx.fillRect(margin,y,width-margin*2,bandHeight);ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='700 28px Arial';ctx.fillText(group,margin+16,y+35);y+=bandHeight;last=group;}
    left=margin;ctx.fillStyle=index++%2?'#edf3f8':'#fff';ctx.fillRect(margin,y,width-margin*2,row.height);
    row.lines.forEach((lines,j)=>{const colWidth=rosterColumns[j][2];ctx.fillStyle='#233b56';ctx.font=`${j===0?'700':'400'} ${font}px Arial`;ctx.textAlign=j===0||j===3||j>=15?'left':'center';const top=y+(row.height-lines.length*line)/2+font;lines.forEach((t,i)=>ctx.fillText(t,ctx.textAlign==='left'?left+10:left+colWidth/2,top+i*line));left+=colWidth;});
    ctx.strokeStyle='#d3dfeb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(margin,y+row.height);ctx.lineTo(width-margin,y+row.height);ctx.stroke();y+=row.height;
  }
  const team=options.team||{};ctx.fillStyle='#243f68';ctx.fillRect(0,y+24,width,height-y-24);ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='700 28px Arial';
  ctx.fillText(`TAKIM: ${team.matches??'—'} MAÇ · GALİBİYET: ${team.wins??'—'} · BERABERLİK: ${team.draws??'—'} · MAĞLUBİYET: ${team.losses??'—'}`,margin,y+73);
  ctx.font='25px Arial';ctx.fillText('KURULUŞ: 11.06.2008 · ŞEREFİNLE OYNA, ŞEREFİNLE KAZAN',margin,y+121);
  return {width:canvas.width,height:canvas.height,players:rows.length,columns:rosterColumns.length,scale};
}
