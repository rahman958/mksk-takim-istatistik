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
export async function openMonthlyReport({load,season,player=false,formatDate}){
  if(document.querySelector('.monthly-report[open]'))return;
  const dialog=document.createElement('dialog');
  dialog.className='player-hub-dialog monthly-report';
  dialog.setAttribute('aria-labelledby','monthly-report-title');
  dialog.innerHTML='<header><h2 id="monthly-report-title"><img src="güncel logo.jfif" alt="" width="36" height="36">'+(player?'AYLIK RAPORLARIM':'GENEL RAPOR')+'</h2><button type="button">Kapat ×</button></header><p role="status">Rapor hazırlanıyor…</p><div class="monthly-body"></div>';
  dialog.querySelector('header button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();
  const status=dialog.querySelector('[role=status]'),body=dialog.querySelector('.monthly-body');
  try{
    const {games,players}=await load();
    if(!dialog.open)return;
    const months=[...new Set(games.map(monthKey).filter(key=>/^\d{4}-\d{2}$/.test(key)))].sort().reverse();
    if(!months.length){status.textContent='Bu sezonda henüz maç kartı yok.';return;}
    status.textContent='';
    body.innerHTML='<p>'+esc(season)+' · Ay arşivi</p><label>Rapor ayı <select data-month></select></label>'+
      (player?'':'<nav aria-label="Rapor türü"><button type="button" data-view="team">Takım Özeti</button> <button type="button" data-view="player">Oyuncu Raporu</button></nav><label data-player-label>Oyuncu <select data-player></select></label>')+
      '<div data-report aria-live="polite"></div>';
    const month=body.querySelector('[data-month]'),picker=body.querySelector('[data-player]'),out=body.querySelector('[data-report]');
    months.forEach(key=>month.add(new Option(monthLabel(key),key)));
    players.forEach(p=>picker?.add(new Option(p.full_name,p.id)));
    let view=player?'player':'team';
    const forPlayer=(games,id)=>player?games:games.map(game=>{
      const entry=(Array.isArray(game.player_entries)?game.player_entries:[]).find(e=>e?.player_id===id);
      return {...game,...entry,status:entry?'OYNADI':'KATILIM KAYDI YOK'};
    });
    function render(){
      const key=month.value,d=new Date(key+'-01T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth()-1);
      const previousKey=d.toISOString().slice(0,7),labels=['Gösterge',monthLabel(previousKey),monthLabel(key)];
      const prev=games.filter(g=>monthKey(g)===previousKey),now=games.filter(g=>monthKey(g)===key);
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
        out.innerHTML='<section aria-label="Takım Özeti"><p class="monthly-period">'+esc(monthLabel(previousKey))+' ile karşılaştırma</p>'+
          '<dl class="monthly-totals">'+totals.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+display(value)+'</dd></div>').join('')+'</dl>'+
          '<div class="monthly-metrics">'+
          metricCard('Galibiyet oranı',old.winRate,cur.winRate,{suffix:'%'})+
          metricCard('Maç başına atılan gol',old.goalsRate,cur.goalsRate)+
          metricCard('Maç başına yenilen gol',old.againstRate,cur.againstRate,{lowerIsBetter:true})+'</div>'+
          reportCard('Aylık Takım Yorumu','<p>'+esc(summary)+'</p>'+remarks(changes))+
          reportCard('Ayın Öne Çıkanları',table(['Kategori','Oyuncu'],[['Gol lideri',top('goals','gol')],['Asist lideri',top('assists','asist')],['Maçın Adamı',top('awards','kez')]]))+
          reportCard('Gelecek Ayın Odağı','<strong>'+esc(focus)+'</strong>')+
          '<details class="monthly-example"><summary>Maç Sonuçları</summary>'+table(['Tarih','Rakip','Skor'],now.map(g=>[formatDate(g.match_date),g.opponent,number(g.our_score)===null||number(g.opponent_score)===null?'—':display(number(g.our_score))+'–'+display(number(g.opponent_score))]))+'</details></section>';
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
      out.innerHTML='<div class="monthly-metrics">'+
        metricCard(keeper?'Maç başına yediği gol':'Maç başına gol',enoughMatches?old.rate(keeper?'goals_conceded':'goals'):null,cur.rate(keeper?'goals_conceded':'goals'))+
        metricCard('Ortalama puan',enoughRatings?old.avg:null,cur.avg)+
        metricCard('Maç başına asist',enoughMatches?old.rate('assists'):null,cur.rate('assists'))+'</div>'+
        reportCard('Aylık Yorum','<p>'+esc(intro)+'</p>'+remarks(comments))+
        reportCard('Öne Çıkan Maç',bestHtml)+
        reportCard('Gelecek Ayın Odağı','<p>'+esc(playerFocus(old,cur,keeper))+'</p>')+
        '<h3>Oyuncu Karşılaştırması</h3>'+table(labels,data)+
        '<p>Katılım sayısı maç kartlarındaki oyuncu kayıtlarına dayanır. Eksik kayıtlar kaçırılan maç olarak sayılmaz.</p><h3>Maç Maç Performans</h3>'+
        (played.length?table(['Tarih','Rakip','Skor','Gol','Asist','Puan','Maçın Adamı',...(keeper?['Yediği gol']:[])],played.map(g=>[formatDate(g.match_date),g.opponent,display(number(g.our_score))+'–'+display(number(g.opponent_score)),display(number(g.goals)),display(number(g.assists)),display(number(g.points)),award(g.man_of_match)>0?'Evet':award(g.man_of_match)===null?'—':'Hayır',...(keeper?[display(number(g.goals_conceded))]:[])])):'<p>Bu ay oyuncu performans kaydı yok.</p>');
    }
    month.onchange=render;
    if(picker)picker.onchange=render;
    body.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;render();});
    render();
  }catch(error){status.textContent='Rapor açılamadı. '+error.message;}
}
