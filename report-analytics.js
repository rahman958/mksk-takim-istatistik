const n=v=>v==null||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
const e=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=v=>v==null?'—':Number(v).toLocaleString('tr-TR',{maximumFractionDigits:2});
export function playerGames(games,id){return games.map(g=>{const entry=(g.player_entries||[]).find(x=>x.player_id===id);return {...g,...entry,status:entry?'OYNADI':'KAYIT YOK'};});}
export function consistency(games){
 const played=games.filter(g=>g.status==='OYNADI');
 const rated=played.filter(g=>n(g.points)!==null&&n(g.points)>=0&&n(g.points)<=10).sort((a,b)=>String(a.match_date).localeCompare(String(b.match_date))||String(a.id||'').localeCompare(String(b.id||''))).slice(-5);
 const values=rated.map(g=>n(g.points)),count=values.length,avg=count?values.reduce((a,b)=>a+b,0)/count:null;
 const deviation=count?Math.sqrt(values.reduce((s,v)=>s+(v-avg)**2,0)/count):null;
 return {rated,values,count,avg,deviation,min:count?Math.min(...values):null,max:count?Math.max(...values):null,
 label:count<3?'Veri yetersiz':deviation<=1?'İstikrarlı':deviation<=2?'Değişken':'Dalgalı',unrated:played.filter(g=>n(g.points)===null).length};
}
export function contribution(games,totals){
 const played=games.filter(g=>g.status==='OYNADI');
 const metric=key=>{const known=played.map(g=>n(g[key])).filter(v=>v!==null);return {value:known.length?known.reduce((a,b)=>a+b,0):null,complete:played.length>0&&known.length===played.length};};
 const goals=metric('goals'),assists=metric('assists');
 const ratio=(a,b)=>a.complete&&n(b)>0&&a.value<=n(b)?100*a.value/n(b):null;
 return {goals,assists,goalShare:ratio(goals,totals?.goals),assistShare:ratio(assists,totals?.assists)};
}
export function teamTotals(games){
 const entries=games.flatMap(g=>g.player_entries||[]),goals=games.map(g=>n(g.our_score));
 const assists=entries.map(g=>n(g.assists)).filter(v=>v!==null);
 return {games:games.length,goals:goals.length&&goals.every(v=>v!==null)?goals.reduce((a,b)=>a+b,0):null,assists:assists.length?assists.reduce((a,b)=>a+b,0):null,assists_complete:games.every(g=>(g.player_entries||[]).length>0)&&assists.length===entries.length};
}
export function outcomes(games,personal=false){
 return ['Galibiyet','Beraberlik','Mağlubiyet'].map((label,index)=>{
  const rows=games.filter(g=>(!personal||g.status==='OYNADI')&&n(g.our_score)!==null&&n(g.opponent_score)!==null&&Math.sign(n(g.our_score)-n(g.opponent_score))===[1,0,-1][index]);
  const values=personal?rows.map(g=>n(g.points)):rows.flatMap(g=>(g.player_entries||[]).map(p=>n(p.points)));
  const rated=values.filter(v=>v!==null&&v>=0&&v<=10);
  return {label,matches:rows.length,goals:rows.length?rows.reduce((s,g)=>s+n(g.our_score),0)/rows.length:null,against:rows.length?rows.reduce((s,g)=>s+n(g.opponent_score),0)/rows.length:null,avg:rated.length?rated.reduce((a,b)=>a+b,0)/rated.length:null,rated:rated.length};
 });
}
export function keeperStats(games){const played=games.filter(g=>g.status==='OYNADI'),known=played.filter(g=>n(g.goals_conceded)!==null),rated=played.map(g=>n(g.points)).filter(v=>v!==null);return {played:played.length,known:known.length,against:known.length?known.reduce((s,g)=>s+n(g.goals_conceded),0):null,avg:known.length?known.reduce((s,g)=>s+n(g.goals_conceded),0)/known.length:null,clean:known.length?known.filter(g=>n(g.goals_conceded)===0).length:null,rating:rated.length?rated.reduce((a,b)=>a+b,0)/rated.length:null};}
export function partnerships(games,players){
 const names=new Map(players.map(p=>[p.id,p.full_name])),pairs=new Map();
 for(const g of games){const ids=[...new Set((g.player_entries||[]).map(p=>p.player_id).filter(id=>names.has(id)))].sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const key=ids[i]+'|'+ids[j],row=pairs.get(key)||{ids:[ids[i],ids[j]],matches:0,wins:0,draws:0,losses:0,scored:0};row.matches++;if(n(g.our_score)!==null&&n(g.opponent_score)!==null){row.scored++;if(n(g.our_score)>n(g.opponent_score))row.wins++;else if(n(g.our_score)===n(g.opponent_score))row.draws++;else row.losses++;}pairs.set(key,row);}}
 return [...pairs.values()].sort((a,b)=>b.matches-a.matches||a.ids.join().localeCompare(b.ids.join())).slice(0,12).map(p=>({...p,names:p.ids.map(id=>names.get(id)).join(' + ')}));
}
function table(head,rows){return '<div class="ra-scroll"><table><thead><tr>'+head.map(h=>'<th>'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+e(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const card=(title,body,extra='')=>'<section class="ra-card '+extra+'"><h3>'+e(title)+'</h3>'+body+'</section>';
function chart(stats){
 if(!stats.count)return '<p>Henüz puanlı maç kaydı yok.</p>';
 const w=600,h=210,pad=32,step=(w-pad*2)/Math.max(1,stats.count-1);
 const point=(v,i)=>[stats.count===1?w/2:pad+i*step,h-pad-v*(h-2*pad)/10];
 const line=stats.values.map((v,i)=>point(v,i).join(',')).join(' ');
 return '<svg class="ra-chart" viewBox="0 0 600 210" role="img" aria-label="'+e('Son maç puanları '+stats.values.join(', '))+'">'+[0,5,10].map(v=>'<line x1="32" x2="568" y1="'+point(v,0)[1]+'" y2="'+point(v,0)[1]+'" stroke="#ceddeb"/><text x="4" y="'+(point(v,0)[1]+5)+'">'+v+'</text>').join('')+'<polyline points="'+line+'" fill="none" stroke="#173f72" stroke-width="4"/>'+stats.values.map((v,i)=>{const [x,y]=point(v,i);return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="white" stroke="#173f72" stroke-width="3"/><text x="'+x+'" y="'+(y-12)+'" text-anchor="middle">'+v+'</text><text x="'+x+'" y="204" text-anchor="middle">'+(i+1)+'. maç</text>';}).join('')+'</svg>';
}
function stabilityCard(stats){
 return card('İSTİKRARIM','<span class="ra-tag">'+e(stats.label)+'</span><p>Seçilen ayın son '+stats.count+' puanlı maçı</p>'+chart(stats)+'<div class="ra-duo"><div><small>ORTALAMA PUAN</small><strong>'+f(stats.avg)+'</strong></div><div><small>PUAN ARALIĞI</small><strong>'+f(stats.min)+'–'+f(stats.max)+'</strong></div></div><p>'+(stats.count<3?'İstikrar yorumu için en az 3 puanlı maç gerekir.':stats.label==='İstikrarlı'?'Puanların birbirine yakın. Bu değerlendirme performans yüksekliğini değil, puanların tutarlılığını gösterir.':'Puanların maçlar arasında değişiyor. Aralık ve grafiği birlikte değerlendir.')+(stats.unrated?' '+stats.unrated+' maçta puan eksik.':'')+'</p><details><summary>Nasıl hesaplanır?</summary><p>Son en fazla 5 puanın standart sapması 1 ve altı ise istikrarlı, 1–2 arası değişken, 2 üzeri dalgalı. En az 3 puan gerekir.</p></details>','ra-blue');
}
function shareCard(stats,totals,complete=true){
 const ring=(label,share,value,total,color)=>'<div class="ra-share"><div class="ra-ring" style="--progress:'+(share??0)+'%;--ring:'+color+'"><span>'+e(label)+'<strong>'+(share==null?'—':'%'+f(share))+'</strong></span></div><p>'+f(value)+' / '+f(total)+'</p></div>';
 return card('TAKIMA KATKIM','<div class="ra-duo">'+ring('GOL PAYIM',complete?stats.goalShare:null,stats.goals.value,totals?.goals,'#173f72')+ring('ASİST PAYIM',complete?stats.assistShare:null,stats.assists.value,totals?.assists,'#16786f')+'</div><p>Gol payı takım skoruna, asist payı maç kartlarına girilmiş asist toplamına göre hesaplanır.</p>'+(!complete?'<p class="ra-note">Ayın tüm kayıtlarına erişilemediği için yüzdeler gösterilmiyor.</p>':'')+(!totals?.assists_complete?'<p class="ra-note">Asist kayıtları eksik olabilir. Oran yalnız kayıtlı asistler içindeki paydır.</p>':'')+'<p>Toplam sıfırsa veya oyuncunun verisi eksikse yüzde gösterilmez.</p>','ra-mint');
}
function resultCard(rows,personal){return '<details class="ra-card"><summary>GALİBİYET / MAĞLUBİYET'+(personal?' PERFORMANSIM':' KARŞILAŞTIRMASI')+'</summary>'+table(['Sonuç','Maç',...(personal?[]:['Atılan gol / maç','Yenilen gol / maç']),'Ort. puan','Puan kaydı'],rows.map(r=>[r.label,r.matches,...(personal?[]:[f(r.goals),f(r.against)]),f(r.avg),r.rated]))+'<p>Az sayıda maçtan kesin sonuç çıkarılmaz. Beraberlikler ayrı gösterilir.</p></details>';}
function keeperCard(games,previous){const k=keeperStats(games),old=keeperStats(previous);return card('KALECİ RAPORUM',table(['Gösterge','Önceki ay','Seçilen ay'],[['Yenilen gol',f(old.against),f(k.against)],['Yenilen gol / maç',f(old.avg),f(k.avg)],['Gol yemeden bitirilen',f(old.clean),f(k.clean)],['Ort. puan',f(old.rating),f(k.rating)],['Gol verisi olan maç',old.known+'/'+old.played,k.known+'/'+k.played]])+'<p>Yalnız kalecinin kendi kaydındaki yenilen gol kullanılır. Takımın yediği gol otomatik olarak kaleciye yazılmaz.</p>');}
export function personalAnalytics(games,previous,totals,keeper){
 const shares=contribution(games,totals),stable=consistency(games),complete=totals?.games===games.length;
 return '<div class="ra-analysis">'+shareCard(shares,totals,complete)+stabilityCard(stable)+resultCard(outcomes(games,true),true)+(keeper?keeperCard(games,previous):'')+'</div>';
}
export function managementAnalytics(games,previous,players,metric='goals'){
 const totals=teamTotals(games),scored=players.map(p=>({p,stats:contribution(playerGames(games,p.id),totals),stable:consistency(playerGames(games,p.id))}));
 const key=metric==='assists'?'assistShare':'goalShare';
 const sorted=scored.slice().sort((a,b)=>(b.stats[key]??-1)-(a.stats[key]??-1));
 const bars=sorted.filter(r=>r.stats[key]!==null).map(r=>'<div class="ra-bar-row"><b>'+e(r.p.full_name)+'</b><div class="ra-track"><span style="width:'+Math.min(100,r.stats[key])+'%"></span></div><strong>%'+f(r.stats[key])+'</strong></div>').join('')||'<p>Katkı yüzdesi için yeterli gol / asist kaydı yok.</p>';
 const firstChart=scored.find(r=>r.stable.count>=3)||scored.find(r=>r.stable.count>0);
 const consistencyRows=scored.map(r=>[r.p.full_name,r.stable.values.join(' · ')||'—',r.stable.label,r.stable.count]);
 const goalKnown=games.flatMap(g=>g.player_entries||[]).map(p=>n(p.goals)).filter(v=>v!==null).reduce((a,b)=>a+b,0);
 const pairs=partnerships(games,players);
 const goalies=players.filter(p=>p.keeper).map(p=>{const g=keeperStats(playerGames(games,p.id)),old=keeperStats(playerGames(previous,p.id));return [p.full_name,g.played,f(g.avg),f(g.clean),f(old.rating)+' → '+f(g.rating),g.known+'/'+g.played];});
 return '<div class="ra-analysis">'+card('KATKI DAĞILIMI','<p>Takımın gol ve asist payları</p><div class="ra-tabs"><button type="button" data-share-metric="goals" aria-pressed="'+(metric==='goals')+'">Goller</button><button type="button" data-share-metric="assists" aria-pressed="'+(metric==='assists')+'">Asistler</button></div>'+bars+'<p>Gol payı takımın skor toplamına, asist payı kayıtlı asistlere göre hesaplanır. Listede yalnız güncel oyuncular gösterilir.</p>'+(metric==='goals'&&totals.goals!==goalKnown?'<p class="ra-note">Oyuncu gol kayıtları ile takım skoru farklı. Girilmemiş goller dağılıma eklenmez.</p>':'')+(metric==='assists'&&!totals.assists_complete?'<p class="ra-note">Asist kayıtları eksik olabilir. Yüzdeler yalnız kaydedilmiş asistler içindir.</p>':''),'ra-blue')+
 card('İSTİKRAR ANALİZİ',table(['Oyuncu','Son en fazla 5 puan','Durum','Puanlı maç'],consistencyRows)+(firstChart?'<h4>'+e(firstChart.p.full_name)+'</h4>'+chart(firstChart.stable):'')+'<p>Seçilen ay esas alınır. En az 3 puan gerekir. İstikrar, yüksek puanla aynı şey değildir.</p>','ra-blue')+
 resultCard(outcomes(games),false)+'<details class="ra-card"><summary>KALECİ RAPORLARI</summary>'+table(['Kaleci','Maç','Yenilen gol / maç','Gol yemeden bitirilen','Ort. puan önce → şimdi','Gol verisi'],goalies)+'<p>Eksik kaleci gol verisi sıfır kabul edilmez.</p></details>'+
 '<details class="ra-card"><summary>BİRLİKTE OYNAMA ANALİZİ</summary>'+(pairs.length?table(['Oyuncular','Ortak maç','G','B','M','Değerlendirme'],pairs.map(p=>[p.names,p.matches,p.wins,p.draws,p.losses,p.matches<3?'En az 3 ortak maç gerekir':p.scored<p.matches?'Skor kaydı eksik':'Kayıtlı sonuçlar'])):'<p>Ortak oyuncu kaydı yok.</p>')+'<p>En çok ortak maç kaydı olan 12 ikili. Bu tablo oyuncuların sonucu tek başına belirlediğini göstermez.</p></details></div>';
}
export function installAnalyticsStyles(){
 if(document.getElementById('report-analytics-style'))return;
 const style=document.createElement('style');style.id='report-analytics-style';style.textContent=
 '.monthly-report{width:min(96vw,1000px)!important;box-sizing:border-box;color:#15334f;background:#f6faff;max-height:92dvh;overflow:auto}.monthly-report>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.monthly-report>header h2{font-size:clamp(18px,4vw,28px);display:flex;align-items:center;gap:10px}.monthly-report>header img{object-fit:contain}.monthly-report select{max-width:100%;font:inherit;padding:10px}.ra-analysis{font-family:Arial,sans-serif}.ra-card{background:white;border:1px solid #c5d8e7;border-radius:16px;padding:18px;margin:16px 0;color:#163957;overflow:hidden}.ra-blue{background:#eaf3ff}.ra-mint{background:#e4f5ed}.ra-card h3,.ra-card summary{font-size:clamp(17px,4vw,23px);font-weight:800;margin:0 0 14px;color:#153857}.ra-card summary{cursor:pointer}.ra-card p{font-size:14px;line-height:1.6}.ra-duo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;text-align:center}.ra-duo strong{display:block;font-size:26px;color:#12395e}.ra-duo small{display:block;font-size:12px}.ra-share{min-width:0}.ra-ring{width:min(160px,32vw);aspect-ratio:1;margin:auto;border-radius:50%;background:conic-gradient(var(--ring) var(--progress),#c2d5e7 0);display:grid;place-items:center}.ra-ring span{background:#f9fcff;border-radius:50%;width:78%;height:78%;display:flex;flex-direction:column;justify-content:center;font-size:12px;font-weight:700}.ra-tag{display:inline-block;background:#d1e7fa;color:#163e61;border-radius:12px;padding:7px 12px;font-weight:700}.ra-chart{width:100%;height:auto;display:block;overflow:visible}.ra-chart text{font:15px Arial;fill:#244867}.ra-tabs,.ra-share-tools{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.ra-tabs button,.ra-share-tools button{background:#edf5fc;color:#173957;border:1px solid #a9c4dc;padding:12px;border-radius:10px;font-weight:700;min-height:44px}.ra-tabs button[aria-pressed=true]{background:#173f72;color:white}.ra-bar-row{display:grid;grid-template-columns:minmax(110px,1fr) 1fr 60px;gap:10px;align-items:center;margin:16px 0;font-size:14px}.ra-bar-row b{overflow-wrap:anywhere}.ra-track{background:#ccddec;border-radius:7px;overflow:hidden;height:16px}.ra-track span{display:block;background:#176d87;height:100%}.ra-scroll{overflow:auto}.ra-scroll table{border-collapse:collapse;width:100%;min-width:440px;font-size:13px}.ra-scroll th,.ra-scroll td{text-align:left;padding:11px;border-bottom:1px solid #c8d8e6;white-space:normal;min-width:65px}.ra-scroll th{background:#d5e6f5;color:#153452}.ra-note{padding:10px;border-left:4px solid #477a9f;background:#f7fbff}.ra-export-pages img{display:block;width:100%;margin:12px 0}.ra-export-pages a{display:block;padding:12px;background:#173f72;color:white;border-radius:10px;text-align:center;margin-bottom:16px}@media(max-width:460px){.monthly-report{padding:12px}.ra-card{padding:13px}.ra-bar-row{grid-template-columns:minmax(90px,1fr) .8fr 48px;font-size:12px}.ra-duo strong{font-size:23px}}';
 document.head.append(style);
}
