// Canvas export shared by the application and offline layout tests.
export const rosterColumns = [
  ['full_name','Oyuncu adı soyadı',390],['jersey_number','Forma no',90],['position','Mevki',100],
  ['management_role','Yönetim görevi',280],['group_name','Oyuncunun grubu',150],
  ['matches','Maç sayısı',105],['goals','Attığı gol sayısı',130],['assists','Asist sayısı',110],
  ['goals_conceded','Yediği gol sayısı',140],['man_of_match','Maçın adamı',140],
  ['success','Başarı oranı',150],['discipline_referrals','Disiplin sevki',150],
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
const groupColor=group=>({'GENEL BAŞKAN':['#24496c','#ffffff'],'KALECİLER':['#215bab','#ffffff'],'SAVUNMA':['#475569','#ffffff'],'MEVKİ BELİRTİLMEDİ':['#475569','#ffffff'],'DİĞER MEVKİLER':['#365875','#ffffff'],'ORTA SAHA':['#713aa4','#ffffff'],'FORVETLER':['#b44920','#ffffff']}[group]||['#475569','#ffffff']);
const headerColor=key=>({
  jersey_number:'#bad6ff',matches:'#d9ccff',goals:'#ffd0b0',assists:'#b6e6f6',success:'#f7c5e5'
}[key]||'#dce7f6');

function drawTurkishFlag(ctx,x,y){
  ctx.fillStyle='#e30a17';
  ctx.fillRect(x,y,195,130);
  const disk=(cx,cy,r,color)=>{
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.arc(x+cx,y+cy,r,0,2*Math.PI);
    ctx.fill();
  };
  disk(65,65,32.5,'#fff');
  disk(73.125,65,26,'#e30a17');
  ctx.fillStyle='#fff';
  ctx.beginPath();
  for(let n=0;n<10;n++){
    const angle=Math.PI+n*Math.PI/5,r=n%2?8:16.25;
    const px=x+119+r*Math.cos(angle),py=y+65+r*Math.sin(angle);
    if(n===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fill();
}
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
 return players.filter(p=>!p.archived_at&&!p.team_left_on).slice().sort((a,b)=>Number(isRahman(b))-Number(isRahman(a))||groupOrder.indexOf(rosterGroup(a))-groupOrder.indexOf(rosterGroup(b))||(ranks.get(a.id)??999999)-(ranks.get(b.id)??999999)||Number(a.jersey_number??9999)-Number(b.jersey_number??9999)||String(a.full_name).localeCompare(String(b.full_name),'tr'));
}
export function drawRosterImage(canvas,players,options={}) {
  const season=options.season||'',ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Görsel çizimi bu tarayıcıda açılamadı.');
  const rows=sortRosterPlayers(players,options.orderIds||[]);
  if(!rows.length)throw Error('Paylaşılacak oyuncu yok.');
  const groupCounts=new Map();for(const p of rows){const g=rowGroup(p);groupCounts.set(g,(groupCounts.get(g)||0)+1);}
  const margin=34,font=24,headerTop=224,bandHeight=48;
  const headers=rosterColumns.map(([,text,w])=>{const label=text.toLocaleUpperCase('tr-TR');let size=24;while(size>17&&label.split(/\s+/).some(word=>{ctx.font=`700 ${size}px Arial`;return ctx.measureText(word).width>w-20;}))size--;return {size,lines:wrapRosterText(ctx,label,w-20,size,true)};});
  const headerHeight=Math.max(128,...headers.map(h=>h.lines.length*(h.size+7)+32));
  const width=rosterColumns.reduce((sum,c)=>sum+c[2],0)+margin*2;
  const prepared=rows.map(p=>({p,values:rosterValues(p,season),height:62}));
  let height=headerTop+headerHeight+170,last='';
  for(const row of prepared){const group=rowGroup(row.p);if(group!==last){height+=bandHeight;last=group;}height+=row.height;}
  // Keep a single image within a conservative mobile canvas pixel budget.
  const scale=Math.min(1,Math.sqrt(12000000/(width*height)),8192/height,4096/width);
  canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);
  ctx.scale(scale,scale);
  ctx.fillStyle='#102541';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,headerTop);
  drawTurkishFlag(ctx,margin,47);
  ctx.fillStyle='#385676';ctx.font='700 32px Arial';
  ctx.fillText('MECİDİYE KARAHİSAR SPOR KULÜBÜ',260,64,1030);
  ctx.fillStyle='#102541';ctx.font='800 65px Arial';
  ctx.fillText('TAKIM LİSTESİ',260,131);
  ctx.fillStyle='#385676';ctx.font='700 27px Arial';
  ctx.fillText(`${season} · LİSTE TARİHİ: ${options.date||new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}`,260,178);
  ctx.fillStyle='#102541';ctx.font='900 67px Arial';ctx.textAlign='center';
  ctx.fillText('MKSK 2008',width*.52,116);
  ctx.fillRect(width*.52-52,151,104,4);
  ctx.textAlign='left';ctx.font='italic 30px Georgia';
  const quoteX=width-1120;
  ctx.fillText('“Ben sporcunun zeki, çevik ve aynı',quoteX,73,620);
  ctx.fillText('zamanda ahlaklısını severim.”',quoteX,113,620);
  ctx.font='700 21px Arial';
  ctx.fillText('MUSTAFA KEMAL ATATÜRK',quoteX,161);
  if(options.portrait)ctx.drawImage(options.portrait,width-423,20,136,184);
  if(options.logo)ctx.drawImage(options.logo,width-218,20,184,184);
  let left=margin;
  rosterColumns.forEach(([key,label,colWidth],j)=>{const h=headers[j];ctx.fillStyle=headerColor(key);ctx.fillRect(left,headerTop,colWidth,headerHeight);ctx.fillStyle='#132640';ctx.font=`700 ${h.size}px Arial`;ctx.textAlign=key==='full_name'?'left':'center';const top=headerTop+(headerHeight-h.lines.length*(h.size+7))/2+h.size;h.lines.forEach((t,i)=>ctx.fillText(t,key==='full_name'?left+10:left+colWidth/2,top+i*(h.size+7)));left+=colWidth;});
  let y=headerTop+headerHeight,index=0;last='';
  const bands=[];
  for(const row of prepared){const group=rowGroup(row.p);if(group!==last){ctx.fillStyle=groupColor(group)[0];ctx.fillRect(margin,y,width-margin*2,bandHeight);bands.push({group,y});y+=bandHeight;last=group;}
    left=margin;ctx.fillStyle=isRahman(row.p)?'#e0edf9':index%2?'#edf3f8':'#fff';index++;ctx.fillRect(margin,y,width-margin*2,row.height);
    row.values.forEach((value,j)=>{
      const colWidth=rosterColumns[j][2], key=rosterColumns[j][0];
      const emphasized=['jersey_number','matches','goals','assists','success'].includes(key);
      ctx.fillStyle='#10243b';
      ctx.font=`${j===0||emphasized?'700':'500'} ${emphasized?font+4:font}px Arial`;
      ctx.textAlign=j===0||j===3||j>=15?'left':'center';
      ctx.fillText(String(value),ctx.textAlign==='left'?left+10:left+colWidth/2,y+(row.height+font)/2-3,colWidth-20);
      left+=colWidth;
    });
    ctx.strokeStyle='#70869d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(margin,y+row.height);ctx.lineTo(width-margin,y+row.height);ctx.stroke();y+=row.height;
  }
  ctx.strokeStyle='#344c66';ctx.lineWidth=2.5;ctx.beginPath();left=margin;ctx.moveTo(left,headerTop);ctx.lineTo(left,y);for(const col of rosterColumns){left+=col[2];ctx.moveTo(left,headerTop);ctx.lineTo(left,y);}ctx.moveTo(margin,headerTop);ctx.lineTo(width-margin,headerTop);ctx.moveTo(margin,headerTop+headerHeight);ctx.lineTo(width-margin,headerTop+headerHeight);ctx.moveTo(margin,y);ctx.lineTo(width-margin,y);ctx.stroke();
  for(const band of bands){ctx.fillStyle=groupColor(band.group)[0];ctx.fillRect(margin+1,band.y,width-margin*2-2,bandHeight);const label=band.group+' · '+groupCounts.get(band.group)+' KİŞİ';ctx.fillStyle=groupColor(band.group)[1];ctx.textAlign='left';let size=27;while(size>15){ctx.font=`700 ${size}px Arial`;if(ctx.measureText(label).width<=width-margin*2-24)break;size--;}ctx.font=`700 ${size}px Arial`;ctx.fillText(label,margin+12,band.y+35);}
  const team=options.team||{};
  const totals=[
    ['OYUNCU',rows.length,'#dbe9ff'],['OYNANAN MAÇ',team.matches,'#e5dbfc'],
    ['GALİBİYET',team.wins,'#c6e7fa'],['BERABERLİK',team.draws,'#ffe3a3'],
    ['MAĞLUBİYET',team.losses,'#ffd4d7'],['ATILAN GOL',team.goals,'#ffdcc3'],
    ['YENİLEN GOL',team.conceded,'#f3d6ee']
  ];
  const gap=16,boxWidth=(width-2*margin-(totals.length-1)*gap)/totals.length;
  ctx.textAlign='center';
  totals.forEach(([label,value,color],index)=>{
    const x=margin+index*(boxWidth+gap);
    ctx.fillStyle=color;ctx.fillRect(x,y+34,boxWidth,102);
    ctx.fillStyle='#203957';ctx.font='700 25px Arial';
    ctx.fillText(label,x+boxWidth/2,y+70,boxWidth-20);
    ctx.fillStyle='#102541';ctx.font='700 39px Arial';
    ctx.fillText(value==null?'—':Number(value).toLocaleString('tr-TR'),x+boxWidth/2,y+116,boxWidth-20);
  });
  return {width:canvas.width,height:canvas.height,players:rows.length,columns:rosterColumns.length,scale};
}
