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
  return {played:played.length,rated:ratings.length,avg,best,min:ratings.length?Math.min(...ratings.map(g=>Number(g.points))):null,goals:sum('goals'),assists:sum('assists'),against:sum('goals_conceded'),awards:sum('man_of_match'),
    rate:key=>played.length&&played.every(g=>number(g[key])!==null)?sum(key)/played.length:null};
}
function teamMonth(games){
  const scores=games.filter(g=>number(g.our_score)!==null&&number(g.opponent_score)!==null);
  const wins=scores.filter(g=>Number(g.our_score)>Number(g.opponent_score)).length;
  const draws=scores.filter(g=>Number(g.our_score)===Number(g.opponent_score)).length;
  const goals=scores.reduce((n,g)=>n+Number(g.our_score),0);
  const against=scores.reduce((n,g)=>n+Number(g.opponent_score),0);
  return {matches:games.length,wins,draws,losses:scores.length-wins-draws,goals: scores.length?goals:null,against:scores.length?against:null,difference:scores.length?goals-against:null,winRate:scores.length?100*wins/scores.length:null,againstRate:scores.length?against/scores.length:null,clean:scores.filter(g=>Number(g.opponent_score)===0).length};
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

export async function openMonthlyReport({load,season,player=false,formatDate}){
  if(document.querySelector('.monthly-report[open]'))return;
  const dialog=document.createElement('dialog');
  dialog.className='player-hub-dialog monthly-report';
  dialog.setAttribute('aria-labelledby','monthly-report-title');
  dialog.innerHTML='<header><h2 id="monthly-report-title">'+(player?'AYLIK RAPORLARIM':'GENEL RAPOR')+'</h2><button type="button">Kapat ×</button></header><p role="status">Rapor hazırlanıyor…</p><div class="monthly-body"></div>';
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
        const lines=[change('Galibiyet oranı (%)',old.winRate,cur.winRate),change('Maç başına yenilen gol',old.againstRate,cur.againstRate),change('Gol farkı',old.difference,cur.difference)].filter(Boolean);
        const leaders=players.map(p=>({name:p.full_name,stats:playerMonth(forPlayer(now,p.id))}));
        const top=key=>{
          const value=Math.max(0,...leaders.map(p=>p.stats[key]??0));
          return value?leaders.filter(p=>p.stats[key]===value).map(p=>p.name).join(', ')+' · '+value:'—';
        };
        out.innerHTML='<h3>Takım Özeti</h3>'+table(labels,compare(old,cur,[['Maç','matches'],['Galibiyet','wins'],['Beraberlik','draws'],['Mağlubiyet','losses'],['Atılan gol','goals'],['Yenilen gol','against'],['Gol farkı','difference'],['Gol yemeden biten maç','clean']]))+
          '<h3>Ayın Liderleri</h3>'+table(['Kategori','Oyuncu'],[['Gol',top('goals')],['Asist',top('assists')],['Maçın Adamı',top('awards')]])+
          '<h3>Takım Yorumu</h3>'+remarks(lines.length?lines:['Önceki ayda karşılaştırılabilir skor kaydı yok.'])+
          '<h3>Maç Sonuçları</h3>'+table(['Tarih','Rakip','Skor'],now.map(g=>[formatDate(g.match_date),g.opponent,display(number(g.our_score))+'–'+display(number(g.opponent_score))]));
        return;
      }
      if(!player&&!picker.value){out.textContent='Oyuncu bulunamadı.';return;}
      const id=picker?.value,oldGames=forPlayer(prev,id),newGames=forPlayer(now,id),old=playerMonth(oldGames),cur=playerMonth(newGames);
      const keeper=player?players[0]?.keeper:players.find(p=>p.id===id)?.keeper;
      const metrics=[['Oynadığı kayıtlı maç','played'],['Gol','goals'],['Asist','assists'],['Ortalama puan','avg'],['Maçın Adamı','awards']];
      if(keeper)metrics.push(['Yediği gol','against']);
      const data=compare(old,cur,metrics);
      data.push(['Puan girilen maç',old.rated+'/'+old.played,cur.rated+'/'+cur.played],['Maç başına gol',display(old.rate('goals')),display(cur.rate('goals'))],['Maç başına asist',display(old.rate('assists')),display(cur.rate('assists'))]);
      const comments=[
        prev.length?change('Kayıtlı maç katılımı',old.played,cur.played):'Önceki ayın maç kaydı yok.',
        change('Maç başına gol',old.rate('goals'),cur.rate('goals')),
        change('Maç başına asist',old.rate('assists'),cur.rate('assists')),
        old.rated>=2&&cur.rated>=2?change('Ortalama puan',old.avg,cur.avg):'Puan eğilimi için iki ayda da en az iki puanlı maç gerekir.',
        cur.best?'En yüksek puan '+display(number(cur.best.points))+' · '+cur.best.opponent+'.':'Bu ay puan kaydı yok.',
        cur.rated>=2?'Bu ay puan aralığı '+display(cur.min)+'–'+display(number(cur.best.points))+'.':''
      ].filter(Boolean);
      const played=newGames.filter(g=>g.status==='OYNADI');
      out.innerHTML='<h3>Oyuncu Karşılaştırması</h3>'+table(labels,data)+'<h3>Gelişim Yorumu</h3>'+remarks(comments)+
        '<p>Katılım sayısı maç kartlarındaki oyuncu kayıtlarına dayanır. Eksik kayıtlar kaçırılan maç olarak sayılmaz.</p><h3>Maç Maç Performans</h3>'+
        (played.length?table(['Tarih','Rakip','Skor','Gol','Asist','Puan','Maçın Adamı',...(keeper?['Yediği gol']:[])],played.map(g=>[formatDate(g.match_date),g.opponent,display(number(g.our_score))+'–'+display(number(g.opponent_score)),display(number(g.goals)),display(number(g.assists)),display(number(g.points)),award(g.man_of_match)>0?'Evet':award(g.man_of_match)===null?'—':'Hayır',...(keeper?[display(number(g.goals_conceded))]:[])])):'<p>Bu ay oyuncu performans kaydı yok.</p>');
    }
    month.onchange=render;
    if(picker)picker.onchange=render;
    body.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;render();});
    render();
  }catch(error){status.textContent='Rapor açılamadı. '+error.message;}
}
