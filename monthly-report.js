import {personalAnalytics,managementAnalytics,installAnalyticsStyles,teamTotals,playerGames} from './report-analytics.js?v=20261123-season-general-1';
import {installReportSharing} from './report-sharing.js?v=20261124-audit-1';
const fmt=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2});
const monthFmt=new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric',timeZone:'UTC'});
const monthLabel=key=>monthFmt.format(new Date(key+'-01T00:00:00Z'));
const monthKey=game=>String(game.match_date||'').slice(0,7);
const number=value=>value==null||value===''||!Number.isFinite(Number(value))?null:Number(value);
const award=value=>value===true?1:number(value);
const display=value=>value==null?'—':fmt.format(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function playerMonth(games){
  const played=games.filter(g=>g.status==='OYNADI');
  const sum=key=>{
    const values=played.map(g=>key==='man_of_match'?award(g[key]):number(g[key])).filter(v=>v!==null);
    return values.length?values.reduce((a,b)=>a+b,0):null;
  };
  const ratings=played.filter(g=>number(g.points)!==null);
  const avg=ratings.length?sum('points')/ratings.length:null;
  const best=ratings.reduce((a,b)=>!a||Number(b.points)>Number(a.points)?b:a,null);
  return {played:played.length,rated:ratings.length,ratingsAbove:ratings.filter(g=>Number(g.points)>=8).length,avg,best,min:ratings.length?Math.min(...ratings.map(g=>Number(g.points))):null,goals:sum('goals'),assists:sum('assists'),against:sum('goals_conceded'),awards:sum('man_of_match'),
    rate:key=>played.length&&played.every(g=>number(g[key])!==null)?sum(key)/played.length:null};
}
function teamMonth(games){
  const scores=games.filter(g=>number(g.our_score)!==null&&number(g.opponent_score)!==null);
  const wins=scores.filter(g=>Number(g.our_score)>Number(g.opponent_score)).length;
  const draws=scores.filter(g=>Number(g.our_score)===Number(g.opponent_score)).length;
  const goals=scores.reduce((n,g)=>n+Number(g.our_score),0);
  const against=scores.reduce((n,g)=>n+Number(g.opponent_score),0);
  return {matches:games.length,scored:scores.length,goalsRate:scores.length?goals/scores.length:null,wins,draws,losses:scores.length-wins-draws,goals: scores.length?goals:null,against:scores.length?against:null,difference:scores.length?goals-against:null,winRate:scores.length?100*wins/scores.length:null,againstRate:scores.length?against/scores.length:null,clean:scores.filter(g=>Number(g.opponent_score)===0).length};
}
function table(headers,rows){
  return '<div class="monthly-scroll"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function remarks(items){
  return '<ul>'+items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>';
}
function change(label,before,after){
  if(before==null||after==null)return '';
  const delta=Math.round((after-before)*100)/100;
  return label+' '+display(before)+' → '+display(after)+(delta===0?' · aynı':' · '+(delta>0?'+':'−')+display(Math.abs(delta)))+'.';
}
function compare(previous,current,metrics){
  return metrics.map(([label,key])=>[label,display(previous[key]),display(current[key])]);
}

function metricCard(label,before,after,{lowerIsBetter=false,suffix=''}={}){
  const delta=before==null||after==null?null:Math.round((after-before)*100)/100;
  const trend=delta===null?'Karşılaştırma yok':delta>0?'↑ Artış':delta<0?'↓ Düşüş':'→ Aynı';
  const direction=lowerIsBetter?-delta:delta;
  const tone=direction>0?'up':direction<0?'down':'steady';
  const value=n=>display(n)+(n==null?'':suffix);
  return '<div class="monthly-metric" data-tone="'+tone+'"><b>'+esc(label)+'</b><strong>'+value(before)+' → '+value(after)+'</strong><small>'+trend+'</small></div>';
}
function reportCard(title,content){
  return '<section class="monthly-card"><h3>'+esc(title)+'</h3><div>'+content+'</div></section>';
}
function playerFocus(old,cur,keeper){
  if(!cur.played)return 'Bu ay için kayıtlı maç yok. Yeni performans kayıtları geldikçe odak burada görünür.';
  const declined=(a,b)=>a!=null&&b!=null&&Math.round((a-b)*100)>0;
  if(keeper&&old.played>=2&&cur.played>=2&&declined(cur.rate('goals_conceded'),old.rate('goals_conceded'))){
    return 'Savunma iletişimi. Maç başına yediğin gol '+display(old.rate('goals_conceded'))+' → '+display(cur.rate('goals_conceded'))+' oldu. Savunmayla yerleşim ve markaj iletişimine odaklan.';
  }
  if(!keeper&&old.played>=2&&cur.played>=2&&declined(old.rate('assists'),cur.rate('assists'))){
    return 'Asist katkısı. Maç başına asistin '+display(old.rate('assists'))+' → '+display(cur.rate('assists'))+' oldu. Ceza sahası çevresinde pas seçeneklerini daha erken kontrol et.';
  }
  if(cur.rated>=2&&number(cur.best.points)-cur.min>=2)return 'Performans istikrarı. Puanların '+display(cur.min)+'–'+display(number(cur.best.points))+' arasında değişti. En iyi maçındaki hazırlık rutinini gelecek maçlarda da uygula.';
  return cur.rated<2?'Performans eğilimini değerlendirmek için en az iki puanlı maç kaydı gerekiyor.':'İyi giden yönlerini sürdür. Gelecek ay maç başına katkını ve puan ortalamanı yeniden karşılaştır.';
}
let monthlyInstance=0;
export async function openMonthlyReport({load,season,player=false,formatDate,initialPlayer=null,inlineRoot=null,lockedPlayer=false,initialMonth=null}){
  if(!inlineRoot&&document.querySelector('.monthly-report[open]'))return;
  installAnalyticsStyles();
  const dialog=document.createElement(inlineRoot?'section':'dialog'),titleId='monthly-report-title-'+(++monthlyInstance);
  dialog.className='player-hub-dialog monthly-report'+(inlineRoot?' monthly-inline':'');
  if(inlineRoot){inlineRoot.querySelector('.monthly-inline')?.close();dialog.open=true;dialog.close=()=>{if(!dialog.open||!dialog.isConnected)return;dialog.open=false;dialog.dispatchEvent(new Event('close'));};}
  dialog.setAttribute('aria-labelledby',titleId);
  dialog.innerHTML='<header><h2 id="'+titleId+'"><img src="güncel logo.jfif" alt="" width="36" height="36">'+(player?'AYLIK RAPORLARIM':'GENEL RAPOR')+'</h2><button type="button">Kapat ×</button></header><p role="status">Rapor hazırlanıyor…</p><div class="monthly-body"></div>';
  dialog.querySelector('header button').onclick=()=>{dialog.close();if(inlineRoot?.closest('details'))inlineRoot.closest('details').open=false;};
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  if(inlineRoot)inlineRoot.append(dialog);else{document.body.append(dialog);dialog.showModal();}
  const status=dialog.querySelector('[role=status]'),body=dialog.querySelector('.monthly-body');
  try{
    let {games,players,teamMonths={},overview=null}=await load();
    if(!dialog.open)return;
    let months=[...new Set(games.map(monthKey).filter(key=>/^\d{4}-\d{2}$/.test(key)))].sort().reverse();
    
    status.textContent='';
    body.innerHTML='<p>'+esc(season)+' · Rapor dönemi</p><div class="report-period-controls"><label>Rapor ayı <select data-month></select></label><button type="button" data-season-all aria-pressed="false">SEZON GENELİ</button></div>'+
      (player?'':'<nav aria-label="Rapor türü"><button type="button" data-view="team">Takım Özeti</button> <button type="button" data-view="player">Oyuncu Raporu</button></nav><label data-player-label>Oyuncu <select data-player></select></label>')+
      '<div data-report aria-live="polite"></div>';
    const month=body.querySelector('[data-month]'),picker=body.querySelector('[data-player]'),out=body.querySelector('[data-report]');
    if(lockedPlayer&&picker){picker.disabled=true;picker.closest('label').hidden=true;body.querySelector('[data-view]')?.closest('nav')?.setAttribute('hidden','');}
    months.forEach(key=>month.add(new Option(monthLabel(key),key)));if(!months.length){month.add(new Option('Aylık maç kaydı yok',''));month.disabled=true;}
    players.forEach(p=>picker?.add(new Option(p.full_name,p.id)));
    if(picker&&initialPlayer&&players.some(p=>p.id===initialPlayer)){picker.value=initialPlayer;picker.dataset.userChosen='1';}
    let view=player||initialPlayer?'player':'team',shareMetric='goals',allSeason=!(initialMonth&&months.includes(initialMonth));if(!allSeason)month.value=initialMonth;
    const allButton=body.querySelector('[data-season-all]');
    if(!document.getElementById('report-period-style')){const style=document.createElement('style');style.id='report-period-style';style.textContent='.report-period-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.report-period-controls label{flex:1;min-width:130px}.report-period-controls button{min-height:46px!important;padding:12px!important;background:#244d76!important;color:#fff!important}.report-period-controls button[aria-pressed=true]{background:#176478!important;box-shadow:inset 0 -3px #9de0e8}.report-season-note{font-size:14px!important;line-height:1.6}';document.head.append(style);}
    const sharing=installReportSharing(body,{content:out,title:()=>allSeason?(view==='team'?'SEZON GENEL RAPORU':'OYUNCU SEZON RAPORU'):view==='team'?'GENEL RAPOR':'AYLIK OYUNCU RAPORU',subtitle:()=> (allSeason?'Sezonun tamamı':monthLabel(month.value))+' · '+season+(view==='player'?' · '+(player?players[0]?.full_name:players.find(p=>p.id===picker.value)?.full_name||''):''),status});
    dialog.addEventListener('close',sharing.destroy,{once:true});
    const forPlayer=(rows,id)=>player?rows:playerGames(rows,id);
    const refresh=document.createElement('button');refresh.type='button';refresh.textContent='GÜNCEL VERİLERİ YENİLE';refresh.className='report-refresh';body.querySelector('[data-report]').before(refresh);
    refresh.onclick=async()=>{if(refresh.disabled)return;refresh.disabled=true;status.textContent='Güncel kadro ve maç kayıtları yükleniyor…';try{const next=await load();if(!dialog.open)return;({games,players,teamMonths={},overview=null}=next);const selected=month.value,available=[...new Set(games.map(monthKey))].filter(key=>/^\d{4}-\d{2}$/.test(key)).sort().reverse();months=available;month.replaceChildren(...available.map(key=>new Option(monthLabel(key),key)));if(available.includes(selected))month.value=selected;if(!available.length){month.add(new Option('Aylık maç kaydı yok',''));allSeason=true;}month.disabled=!available.length;render();status.textContent='Güncel kadro ve kayıtlarla yenilendi.';}catch(error){status.textContent='Yenilenemedi. '+error.message;}finally{refresh.disabled=false;}};
    function renderContent(){
      sharing.invalidate();status.textContent='';allButton.setAttribute('aria-pressed',String(allSeason));
      if(allSeason){renderSeason();return;}
      const key=month.value,d=new Date(key+'-01T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth()-1);
      const previousKey=d.toISOString().slice(0,7),labels=['Gösterge',monthLabel(previousKey),monthLabel(key)];
      const prev=games.filter(g=>monthKey(g)===previousKey),now=games.filter(g=>monthKey(g)===key);
      if(picker){const selected=picker.value,ordered=players.slice().sort((a,b)=>{const pa=playerMonth(forPlayer(now,a.id)),pb=playerMonth(forPlayer(now,b.id));return Number(pb.played>0)-Number(pa.played>0)||(pb.avg??-1)-(pa.avg??-1);});picker.replaceChildren(...ordered.map(p=>new Option(p.full_name,p.id)));if(picker.dataset.userChosen&&ordered.some(p=>p.id===selected))picker.value=selected;}
      body.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
      const playerLabel=body.querySelector('[data-player-label]');
      if(playerLabel)playerLabel.hidden=view!=='player';
      if(view==='team'){
        const old=teamMonth(prev),cur=teamMonth(now);
        const leaders=players.map(p=>({name:p.full_name,stats:playerMonth(forPlayer(now,p.id))}));
        const top=(key,unit)=>{
          const value=Math.max(0,...leaders.map(p=>p.stats[key]??0));
          return value?leaders.filter(p=>p.stats[key]===value).map(p=>p.name).join(', ')+' · '+display(value)+' '+unit:'—';
        };
        const totals=[['Maç',cur.matches],['Galibiyet',cur.wins],['Beraberlik',cur.draws],['Mağlubiyet',cur.losses],['Atılan gol',cur.goals],['Yenilen gol',cur.against]];
        const summary=cur.scored?'Bu ay skoru kayıtlı '+cur.scored+' maçta maç başına '+display(cur.goalsRate)+' gol attık, '+display(cur.againstRate)+' gol yedik. Galibiyet oranımız %'+display(cur.winRate)+'.':'Bu ay henüz skor kaydı yok.';
        const changes=old.scored&&cur.scored?[
          change('Galibiyet oranı (%)',old.winRate,cur.winRate),
          change('Maç başına atılan gol',old.goalsRate,cur.goalsRate),
          change('Maç başına yenilen gol',old.againstRate,cur.againstRate)
        ]:['Önceki ayla karşılaştırmak için iki ayın da skor kaydı gerekiyor.'];
        const focus=!cur.scored?'Maç skorlarını kaydetmek':
          old.scored&&cur.againstRate>old.againstRate?'Yenilen golü azaltmak':
          old.scored&&cur.goalsRate<old.goalsRate?'Maç başına golü artırmak':
          cur.againstRate>cur.goalsRate?'Gol farkını iyileştirmek':'Gol katkısını ve savunma dengesini sürdürmek';
        out.innerHTML=managementAnalytics(now,prev,players,shareMetric,{history:games,month:key,overview})+'<details class="ra-card"><summary>AYLIK TAKIM ÖZETİ VE MAÇLAR</summary><section aria-label="Takım Özeti"><p class="monthly-period">'+esc(monthLabel(previousKey))+' ile karşılaştırma</p>'+
          '<dl class="monthly-totals">'+totals.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+display(value)+'</dd></div>').join('')+'</dl>'+
          '<div class="monthly-metrics">'+
          metricCard('Galibiyet oranı',old.winRate,cur.winRate,{suffix:'%'})+
          metricCard('Maç başına atılan gol',old.goalsRate,cur.goalsRate)+
          metricCard('Maç başına yenilen gol',old.againstRate,cur.againstRate,{lowerIsBetter:true})+'</div>'+
          reportCard('Aylık Takım Yorumu','<p>'+esc(summary)+'</p>'+remarks(changes))+
          reportCard('Ayın Öne Çıkanları',table(['Kategori','Oyuncu'],[['Gol lideri',top('goals','gol')],['Asist lideri',top('assists','asist')],['Maçın Adamı',top('awards','kez')]]))+
          reportCard('Gelecek Ayın Odağı','<strong>'+esc(focus)+'</strong>')+
          '<details class="monthly-example"><summary>Maç Sonuçları</summary>'+table(['Tarih','Rakip','Skor'],now.map(g=>[formatDate(g.match_date),g.opponent,number(g.our_score)===null||number(g.opponent_score)===null?'—':display(number(g.our_score))+'–'+display(number(g.opponent_score))]))+'</details></section></details>';
        out.querySelectorAll('[data-share-metric]').forEach(button=>button.onclick=()=>{shareMetric=button.dataset.shareMetric;render();});
        return;
      }
      if(!player&&!picker.value){out.textContent='Oyuncu bulunamadı.';return;}
      const id=picker?.value,oldGames=forPlayer(prev,id),newGames=forPlayer(now,id),old=playerMonth(oldGames),cur=playerMonth(newGames);
      const keeper=player?players[0]?.keeper:players.find(p=>p.id===id)?.keeper;
      const metrics=[['Oynadığı kayıtlı maç','played'],['Gol','goals'],['Asist','assists'],['Ortalama puan','avg'],['Maçın Adamı','awards']];
      if(keeper)metrics.push(['Yediği gol','against']);
      const data=compare(old,cur,metrics);
      data.push(['Puan girilen maç',old.rated+'/'+old.played,cur.rated+'/'+cur.played],['Maç başına gol',display(old.rate('goals')),display(cur.rate('goals'))],['Maç başına asist',display(old.rate('assists')),display(cur.rate('assists'))]);
      const enoughMatches=old.played>=2&&cur.played>=2, enoughRatings=old.rated>=2&&cur.rated>=2;
      const comments=[
        prev.length?change('Kayıtlı maç katılımı',old.played,cur.played):'Önceki ayın maç kaydı yok.',
        enoughMatches?change(keeper?'Maç başına yediği gol':'Maç başına gol',old.rate(keeper?'goals_conceded':'goals'),cur.rate(keeper?'goals_conceded':'goals')):'',
        enoughMatches?change('Maç başına asist',old.rate('assists'),cur.rate('assists')):'',
        old.rated>=2&&cur.rated>=2?change('Ortalama puan',old.avg,cur.avg):'Puan eğilimi için iki ayda da en az iki puanlı maç gerekir.',
        cur.rated?cur.ratingsAbove+' / '+cur.rated+' puanlı maçta 8 ve üzeri puan.':'Bu ay puan kaydı yok.',
        cur.rated>=2?'Bu ay puan aralığı '+display(cur.min)+'–'+display(number(cur.best.points))+'.':''
      ].filter(Boolean);
      const played=newGames.filter(g=>g.status==='OYNADI');
      const best=cur.best||played.find(g=>award(g.man_of_match)>0);
      const bestHtml=best?'<strong>'+esc(formatDate(best.match_date))+' · '+esc(best.opponent)+'</strong><p>'+
        display(number(best.goals))+' gol · '+display(number(best.assists))+' asist · '+display(number(best.points))+' puan'+
        (keeper?' · '+display(number(best.goals_conceded))+' yediği gol':'')+'</p>'+
        (award(best.man_of_match)>0?'<span class="monthly-award">Maçın Adamı</span>':''):'<p>Öne çıkarmak için puan veya Maçın Adamı kaydı yok.</p>';
      const contribution=[cur.goals==null?'':display(cur.goals)+' gol',cur.assists==null?'':display(cur.assists)+' asist'].filter(Boolean);
      const intro='Bu ay '+cur.played+' kayıtlı maçta oynadın.'+
        (contribution.length?' Bu ayın maç kartlarında '+contribution.join(' ve ')+' kayıtlı.':'');
      out.innerHTML=personalAnalytics(newGames,oldGames,player?teamMonths[key]:teamTotals(now),keeper,{history:forPlayer(games,id),month:key,players:player?players:players.filter(p=>p.id===id),overview})+'<details class="ra-card"><summary>AYLIK GELİŞİM AYRINTILARI</summary><div class="monthly-metrics">'+
        metricCard(keeper?'Maç başına yediği gol':'Maç başına gol',enoughMatches?old.rate(keeper?'goals_conceded':'goals'):null,cur.rate(keeper?'goals_conceded':'goals'))+
        metricCard('Ortalama puan',enoughRatings?old.avg:null,cur.avg)+
        metricCard('Maç başına asist',enoughMatches?old.rate('assists'):null,cur.rate('assists'))+'</div>'+
        reportCard('Aylık Yorum','<p>'+esc(intro)+'</p>'+remarks(comments))+
        reportCard('Öne Çıkan Maç',bestHtml)+
        reportCard('Gelecek Ayın Odağı','<p>'+esc(playerFocus(old,cur,keeper))+'</p>')+
        '<h3>Aylar Arası Karşılaştırma</h3>'+table(labels,data)+
        '<p>Katılım sayısı maç kartlarındaki oyuncu kayıtlarına dayanır. Eksik kayıtlar kaçırılan maç olarak sayılmaz. Maçın Adamı sütununda çizgi, maç kartında ödül kaydı bulunmadığını gösterir.</p><h3>Maç Maç Performans</h3>'+
        (played.length?table(['Tarih','Rakip','Skor','Gol','Asist','Puan','Maçın Adamı',...(keeper?['Yediği gol']:[])],played.map(g=>[formatDate(g.match_date),g.opponent,display(number(g.our_score))+'–'+display(number(g.opponent_score)),display(number(g.goals)),display(number(g.assists)),display(number(g.points)),award(g.man_of_match)>0?'Evet':'—',...(keeper?[display(number(g.goals_conceded))]:[])])):'<p>Bu ay oyuncu performans kaydı yok.</p>')+'</details>';
    }

    function seasonPersonalTotals(){const values=Object.values(teamMonths);return values.length?{games:values.reduce((s,v)=>s+Number(v.games||0),0),goals:values.every(v=>number(v.goals)!==null)?values.reduce((s,v)=>s+Number(v.goals),0):null,assists:values.every(v=>number(v.assists)!==null)?values.reduce((s,v)=>s+Number(v.assists),0):null,assists_complete:values.every(v=>v.assists_complete)}:null;}
    function renderSeason(){
      if(picker){const selected=picker.value;picker.replaceChildren(...players.map(p=>new Option(p.full_name,p.id)));if(players.some(p=>p.id===selected))picker.value=selected;}
      body.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
      const playerLabel=body.querySelector('[data-player-label]');if(playerLabel)playerLabel.hidden=view!=='player';
      const heading='<h3>'+esc(season)+' · SEZONUN GENEL RAPORU</h3>';
      const note='<p class="report-season-note">Sezon toplamları takım listesindeki güncel kayıtlardır. Katkı, istikrar, birlikte oynama ve maç yorumları kayıtlı maç kartlarına dayanır; eksik geçmiş kayıtlar tahmin edilmez.</p>';
      if(view==='team'){
        const cur=teamMonth(games),total=overview||{};
        const totals=[['Maç',total.matches??cur.matches],['Galibiyet',total.wins??cur.wins],['Beraberlik',total.draws??cur.draws],['Mağlubiyet',total.losses??cur.losses],['Atılan gol',total.goals??cur.goals],['Yenilen gol',total.conceded??cur.against]];
        const monthRows=months.map(key=>{const m=teamMonth(games.filter(g=>monthKey(g)===key));return[monthLabel(key),m.matches,m.wins,m.draws,m.losses,display(m.goals),display(m.against)];});
        out.innerHTML=heading+'<dl class="monthly-totals">'+totals.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+display(value)+'</dd></div>').join('')+'</dl>'+note+
          managementAnalytics(games,[],players,shareMetric,{history:games,month:null,overview})+
          reportCard('Ay Ay Takım Durumu',monthRows.length?table(['Ay','Kayıtlı maç','G','B','M','Gol','Yenilen'],monthRows):'<p>Aylık maç kartı yok.</p>')+
          reportCard('Sezonun Bütün Maçları',games.length?table(['Tarih','Rakip','Skor'],games.map(g=>[formatDate(g.match_date),g.opponent,number(g.our_score)===null||number(g.opponent_score)===null?'—':display(number(g.our_score))+'–'+display(number(g.opponent_score))])):'<p>Maç kartı yok.</p>');
        out.querySelectorAll('[data-share-metric]').forEach(b=>b.onclick=()=>{shareMetric=b.dataset.shareMetric;render();});return;
      }
      const chosen=player?players[0]:players.find(p=>p.id===picker.value);
      if(!chosen){out.textContent='Oyuncu bulunamadı.';return;}
      const id=chosen.id,history=forPlayer(games,id),stats=playerMonth(history),played=history.filter(g=>g.status==='OYNADI');
      const monthRows=months.map(key=>{const m=playerMonth(history.filter(g=>monthKey(g)===key));return[monthLabel(key),m.played,display(m.goals),display(m.assists),display(m.avg),display(m.awards),...(chosen.keeper?[display(m.against)]:[])];});
      const rated=history.filter(g=>g.status==='OYNADI'&&number(g.points)!==null);
      const mid=Math.floor(rated.length/2),ordered=rated.slice().sort((a,b)=>String(a.match_date).localeCompare(String(b.match_date)));
      const avg=rows=>rows.length?rows.reduce((n,g)=>n+number(g.points),0)/rows.length:null;
      const earlier=ordered.slice(0,mid),later=ordered.slice(mid),trend=earlier.length>=2&&later.length>=2?change('Puanlı maçların ilk ve ikinci yarısında ortalama puan',avg(earlier),avg(later)):'Gelişim karşılaştırması için en az 4 puanlı maç gerekiyor.';
      out.innerHTML=heading+'<h4>'+esc(chosen.full_name)+'</h4>'+note+personalAnalytics(history,[],player?seasonPersonalTotals():teamTotals(games),chosen.keeper,{history,month:null,players:[chosen],overview})+
       reportCard('Sezon Değerlendirmesi','<p>Bu sezonun maç kartlarında '+stats.played+' katılım, '+stats.rated+' puanlı maç kayıtlı.</p><p>'+esc(trend)+'</p>')+
       reportCard('Ay Ay Oyuncu Gelişimi',monthRows.length?table(['Ay','Kayıtlı maç','Gol','Asist','Ort. puan','Maçın adamı',...(chosen.keeper?['Yediği gol']:[])],monthRows):'<p>Aylık maç kartı yok.</p>')+
       reportCard('Sezonun Bütün Oyuncu Maçları',played.length?table(['Tarih','Rakip','Gol','Asist','Puan','Maçın adamı',...(chosen.keeper?['Yediği gol']:[])],played.map(g=>[formatDate(g.match_date),g.opponent,display(number(g.goals)),display(number(g.assists)),display(number(g.points)),award(g.man_of_match)>0?'Evet':'—',...(chosen.keeper?[display(number(g.goals_conceded))]:[])])):'<p>Kayıtlı oyuncu maç kartı yok.</p>');
    }

    let section='overview';
    const sectionNames={overview:'GENEL ÖZET',contribution:'KATKI DAĞILIMI',stability:'İSTİKRAR',keeper:'KALECİLER',results:'GALİBİYET / MAĞLUBİYET',partners:'BİRLİKTE OYNAMA',comeback:'GERİ DÖNÜŞ',players:'OYUNCULAR',all:'TÜMÜNÜ GÖSTER'};
    const sections=document.createElement('nav');sections.className='report-section-tabs';sections.setAttribute('aria-label','Rapor bölümleri');out.before(sections);
    const sectionStyle=document.createElement('style');sectionStyle.textContent='.monthly-report .report-section-tabs{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important;margin:16px 0!important;width:100%;box-sizing:border-box}.monthly-report .report-section-tabs button{display:block!important;width:100%!important;min-width:0!important;min-height:48px!important;margin:0!important;padding:13px 16px!important;background:#e8eff8!important;color:#173957!important;-webkit-text-fill-color:#173957!important;border:1px solid #a9bfd5!important;border-radius:10px!important;font-size:16px!important;font-weight:750!important;line-height:1.4!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere}.monthly-report .report-section-tabs button[aria-pressed=true]{background:#245578!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#245578!important;box-shadow:inset 5px 0 #8ed5e6}.monthly-report .report-section-tabs button:focus-visible{outline:3px solid #277eb2;outline-offset:2px}[data-report-section][hidden]{display:none!important}.monthly-report button[data-view=team]{background:#1763a3!important;border:2px solid #1763a3!important}.monthly-report button[data-view=player]{background:#7142a3!important;border:2px solid #7142a3!important}.monthly-report button[data-season-all]{background:#08766f!important;border:2px solid #08766f!important}.monthly-report button[data-view],.monthly-report button[data-season-all]{color:#fff!important;-webkit-text-fill-color:#fff!important;min-height:48px!important;font-weight:800!important;white-space:normal!important}.monthly-report button[data-view][aria-pressed=true],.monthly-report button[data-season-all][aria-pressed=true]{outline:3px solid #193958!important;outline-offset:3px;box-shadow:inset 0 -4px #ffffff77!important}.monthly-report .report-active-scope{padding:12px 14px!important;border:1px solid #91b7cc;border-radius:10px;background:#e3f2f5;color:#153e55!important;-webkit-text-fill-color:#153e55!important;font-weight:800!important}.monthly-report .report-section-scope{font-size:13px!important;line-height:1.5!important;color:#3b546d!important;-webkit-text-fill-color:#3b546d!important;font-weight:700!important;margin:8px 0!important}';dialog.append(sectionStyle);
    function render(){
      renderContent();
      body.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
      const blocks=[...out.children].flatMap(node=>node.classList.contains('ra-analysis')?[...node.children]:[node]).filter(node=>!/^H[1-6]$/.test(node.tagName));
      for(const node of blocks){
        const title=(node.querySelector('h3,summary,h4')?.textContent||'').toLocaleUpperCase('tr-TR');
        node.dataset.reportSection=node.classList.contains('ra-full-roster')||node.classList.contains('ra-waiting')?'players':
          /KATKI/.test(title)?'contribution':/İSTİKRAR/.test(title)?'stability':/KALECİ/.test(title)?'keeper':/GALİBİYET/.test(title)?'results':/BİRLİKTE OYNAMA/.test(title)?'partners':/GERİ DÖNÜŞ/.test(title)?'comeback':'overview';
      }
      const scopeText=allSeason?'SEZON GENELİ · '+season:monthLabel(month.value)+' · AYLIK RAPOR';
      const scopeBanner=document.createElement('p');scopeBanner.className='report-active-scope';scopeBanner.setAttribute('role','status');scopeBanner.textContent=scopeText;out.prepend(scopeBanner);
      blocks.forEach(node=>{const label=document.createElement('p');label.className='report-section-scope';label.textContent=node.classList.contains('ra-full-roster')?'SEZON TOPLAMLARI · '+season:scopeText;if(node.tagName==='DETAILS'){node.querySelector(':scope > summary')?.after(label);}else node.prepend(label);});
      const available=new Set(blocks.map(node=>node.dataset.reportSection));
      if(section!=='all'&&!available.has(section))section=available.has('overview')?'overview':[...available][0];
      sections.innerHTML=Object.entries(sectionNames).filter(([key])=>key==='all'||available.has(key)).map(([key,label])=>'<button type="button" data-report-tab="'+key+'" aria-pressed="'+(key===section)+'">'+label+'</button>').join('');
      function apply(){
        blocks.forEach(node=>{node.hidden=section!=='all'&&node.dataset.reportSection!==section;if(!node.hidden&&node.tagName==='DETAILS')node.open=true;});
        sections.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reportTab===section)));
        sharing.invalidate();
      }
      sections.onclick=event=>{const button=event.target.closest('[data-report-tab]');if(!button)return;section=button.dataset.reportTab;apply();};
      apply();
    }

    month.onchange=()=>{allSeason=false;render();};allButton.onclick=()=>{allSeason=true;render();};
    if(picker)picker.onchange=()=>{picker.dataset.userChosen='1';render();};
    body.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;render();});
    render();
  }catch(error){status.textContent='Rapor açılamadı. '+error.message;}
}
