// Canvas export shared by the application and offline layout tests.
export const rosterColumns = [
  ['full_name','Oyuncu adı soyadı',390],['jersey_number','Forma no',90],['position','Mevki',100],
  ['management_role','Yönetim görevi',280],['group_name','Oyuncunun grubu',150],
  ['matches','Maç sayısı',105],['goals','Attığı gol sayısı',130],['assists','Asist sayısı',110],
  ['goals_conceded','Yediği gol sayısı',140],['man_of_match','Maçın adamı',140],
  ['success','Başarı yüzdesi',150],['discipline_referrals','Disiplin sevk',150],
  ['attendance_matches','Antrenman sayısı',155],['attendance_goals','Antrenman golü',155],
  ['attendance_points','Antrenman puanı',155],['status','Oyuncu durumu',240],
  ['performance_label','Performans durumu',270]
];
export function rosterPosition(p) {
  return String(p.position||'').trim().toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s._-]+/g,'');
}
export function rosterGroup(p) {
  const k=rosterPosition(p);
  if(k==='GK')return 'KALECİLER';
  if(['STP','SGB','SLB'].includes(k))return 'SAVUNMA';
  if(['OS','DOS','OOS','SGK','SLK','SAGKANAT','SOLKANAT'].includes(k))return 'ORTA SAHA';
  if(k==='F')return 'FORVETLER';
  return k?'DİĞER MEVKİLER':'MEVKİ BELİRTİLMEDİ';
}
const groupOrder=['KALECİLER','SAVUNMA','ORTA SAHA','FORVETLER','DİĞER MEVKİLER','MEVKİ BELİRTİLMEDİ'];
const isRahman=p=>String(p.full_name||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').trim()==='RAHMAN ISMAIL BENEK';
const rowGroup=p=>isRahman(p)?'GENEL BAŞKAN':rosterGroup(p);
const groupColor=group=>({'GENEL BAŞKAN':['#24496c','#ffffff'],'KALECİLER':['#215bab','#ffffff'],'SAVUNMA':['#475569','#ffffff'],'ORTA SAHA':['#713aa4','#ffffff'],'FORVETLER':['#b44920','#ffffff']}[group]||['#475569','#ffffff']);
const headerColor=key=>['full_name','jersey_number','position','management_role','group_name'].includes(key)?'#cfe2f3':key.startsWith('attendance_')?'#c6dafa':['status','performance_label'].includes(key)?'#ded4ed':key==='success'?'#e5cf91':'#f7e773';
export function rosterStats(p,season) {return (p.player_season_stats||[]).find(s=>s.season===season)||{};}
export function rosterValues(p,season) {
  const s=rosterStats(p,season),n=k=>Number(s[k]||0);
  const percent=s.manager_percent??(s.manager_rating==null?null:Number(s.manager_rating)*10);
  return [String(p.full_name||'—').toLocaleUpperCase('tr-TR'),p.jersey_number??'—',p.position||'—',p.management_role||'—',p.group_name||'—',
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
export function sortRosterPlayers(players,orderIds=[]) {
 const ranks=new Map(orderIds.map((id,i)=>[id,i]));
 return players.filter(p=>!p.archived_at).slice().sort((a,b)=>Number(isRahman(b))-Number(isRahman(a))||groupOrder.indexOf(rosterGroup(a))-groupOrder.indexOf(rosterGroup(b))||(ranks.get(a.id)??999999)-(ranks.get(b.id)??999999)||Number(a.jersey_number??9999)-Number(b.jersey_number??9999)||String(a.full_name).localeCompare(String(b.full_name),'tr'));
}
export function drawRosterImage(canvas,players,options={}) {
  const season=options.season||'',ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Görsel çizimi bu tarayıcıda açılamadı.');
  const rows=sortRosterPlayers(players,options.orderIds||[]);
  if(!rows.length)throw Error('Paylaşılacak oyuncu yok.');
  const groupCounts=new Map();for(const p of rows){const g=rowGroup(p);groupCounts.set(g,(groupCounts.get(g)||0)+1);}
  const margin=34,font=26,line=33,headerTop=278,bandHeight=52;
  const headers=rosterColumns.map(([,text,w])=>{const label=text.toLocaleUpperCase('tr-TR');let size=24;while(size>17&&label.split(/\s+/).some(word=>{ctx.font=`700 ${size}px Arial`;return ctx.measureText(word).width>w-20;}))size--;return {size,lines:wrapRosterText(ctx,label,w-20,size,true)};});
  const headerHeight=Math.max(128,...headers.map(h=>h.lines.length*(h.size+7)+32));
  const width=rosterColumns.reduce((sum,c)=>sum+c[2],0)+margin*2;
  const prepared=rows.map(p=>{const values=rosterValues(p,season),lines=values.map((v,i)=>wrapRosterText(ctx,v,rosterColumns[i][2]-20,font,i===0));return {p,values,lines,height:Math.max(82,...lines.map(a=>a.length*line+26))};});
  let height=headerTop+headerHeight+330,last='';
  for(const row of prepared){const group=rowGroup(row.p);if(group!==last){height+=bandHeight;last=group;}height+=row.height;}
  // Keep a single image within a conservative mobile canvas pixel budget.
  const scale=Math.min(1,Math.sqrt(12000000/(width*height)),8192/height,4096/width);
  canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);
  ctx.scale(scale,scale);ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#243f68';ctx.fillRect(0,0,width,234);ctx.fillStyle='#d7bd77';ctx.fillRect(0,234,width,7);
  ctx.fillStyle='#fff';ctx.font='700 51px Arial';ctx.fillText('MECİDİYE KARAHİSAR SPOR KULÜBÜ',margin,76);
  ctx.font='700 42px Arial';ctx.fillText('TAKIM LİSTESİ',margin,142);
  ctx.fillStyle='#e3ecf8';ctx.font='27px Arial';ctx.fillText(`${season} · LİSTE TARİHİ: ${options.date||new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})} · TOPLAM OYUNCU: ${rows.length} KİŞİ · TEK GÖRSEL`,margin,195);
  if(options.logo)ctx.drawImage(options.logo,width-198,32,160,160);
  let left=margin;
  rosterColumns.forEach(([key,label,colWidth],j)=>{const h=headers[j];ctx.fillStyle=headerColor(key);ctx.fillRect(left,headerTop,colWidth,headerHeight);ctx.fillStyle='#18314b';ctx.font=`700 ${h.size}px Arial`;ctx.textAlign=key==='full_name'?'left':'center';const top=headerTop+(headerHeight-h.lines.length*(h.size+7))/2+h.size;h.lines.forEach((t,i)=>ctx.fillText(t,key==='full_name'?left+10:left+colWidth/2,top+i*(h.size+7)));left+=colWidth;});
  let y=headerTop+headerHeight,index=0;last='';
  const bands=[];
  for(const row of prepared){const group=rowGroup(row.p);if(group!==last){ctx.fillStyle=groupColor(group)[0];ctx.fillRect(margin,y,width-margin*2,bandHeight);bands.push({group,y});y+=bandHeight;last=group;}
    left=margin;ctx.fillStyle=isRahman(row.p)?'#e0edf9':index%2?'#edf3f8':'#fff';index++;ctx.fillRect(margin,y,width-margin*2,row.height);
    row.lines.forEach((lines,j)=>{const colWidth=rosterColumns[j][2];ctx.fillStyle='#10243b';ctx.font=`${j===0?'800':'600'} ${font}px Arial`;ctx.textAlign=j===0||j===3||j>=15?'left':'center';const top=y+(row.height-lines.length*line)/2+font;lines.forEach((t,i)=>ctx.fillText(t,ctx.textAlign==='left'?left+10:left+colWidth/2,top+i*line));left+=colWidth;});
    ctx.strokeStyle='#70869d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(margin,y+row.height);ctx.lineTo(width-margin,y+row.height);ctx.stroke();y+=row.height;
  }
  ctx.strokeStyle='#344c66';ctx.lineWidth=2.5;ctx.beginPath();left=margin;ctx.moveTo(left,headerTop);ctx.lineTo(left,y);for(const col of rosterColumns){left+=col[2];ctx.moveTo(left,headerTop);ctx.lineTo(left,y);}ctx.moveTo(margin,headerTop);ctx.lineTo(width-margin,headerTop);ctx.moveTo(margin,headerTop+headerHeight);ctx.lineTo(width-margin,headerTop+headerHeight);ctx.moveTo(margin,y);ctx.lineTo(width-margin,y);ctx.stroke();
  for(const band of bands){const label=band.group+' · '+groupCounts.get(band.group)+' KİŞİ';ctx.fillStyle=groupColor(band.group)[1];ctx.textAlign='left';let size=27;while(size>15){ctx.font=`700 ${size}px Arial`;if(ctx.measureText(label).width<=rosterColumns[0][2]-24)break;size--;}ctx.font=`700 ${size}px Arial`;ctx.fillText(label,margin+12,band.y+35);}
  const team=options.team||{};ctx.fillStyle='#243f68';ctx.fillRect(0,y+24,width,height-y-24);ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='700 28px Arial';
  ctx.fillText(`TAKIM: ${team.matches??'—'} MAÇ · GALİBİYET: ${team.wins??'—'} · BERABERLİK: ${team.draws??'—'} · MAĞLUBİYET: ${team.losses??'—'}`,margin,y+73);
  const half=(width-margin*2-24)/2;
  [['TAKIMIN ATTIĞI TOPLAM GOL',team.goals,'#244f86'],['TAKIMIN YEDİĞİ TOPLAM GOL',team.conceded,'#71364f']].forEach(([label,value,color],i)=>{const x=margin+i*(half+24);ctx.fillStyle=color;ctx.fillRect(x,y+99,half,130);ctx.fillStyle='#fff';ctx.font='700 33px Arial';ctx.fillText(label,x+22,y+144);ctx.font='700 52px Arial';ctx.fillText(value==null?'—':Number(value).toLocaleString('tr-TR'),x+22,y+206);});
  ctx.font='25px Arial';ctx.fillText('KURULUŞ: 11.06.2008 · ŞEREFİNLE OYNA, ŞEREFİNLE KAZAN',margin,y+284);
  return {width:canvas.width,height:canvas.height,players:rows.length,columns:rosterColumns.length,scale};
}
