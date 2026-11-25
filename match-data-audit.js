
export function auditMatchData(cards,players,season){
 const labels={matches:'Maç',goals:'Gol',assists:'Asist',man_of_match:'Maçın adamı'};
 const scores=cards.map(card=>{const goals=(card.player_entries||[]).reduce((n,e)=>n+Number(e.goals||0),0);return {card,goals,gap:Number(card.our_score)-goals};}).filter(row=>row.gap!==0);
 const playersWithDifferences=players.flatMap(player=>{
  const stat=(player.player_season_stats||[]).find(s=>s.season===season)||{};
  const played=cards.filter(c=>(c.player_entries||[]).some(e=>e.player_id===player.id));
  const entries=played.flatMap(c=>c.player_entries.filter(e=>e.player_id===player.id));
  const totals={matches:entries.length,goals:0,assists:0,man_of_match:0};
  for(const e of entries)for(const key of ['goals','assists','man_of_match'])totals[key]+=e[key]===true?1:Number(e[key]||0);
  const fields=Object.keys(labels).filter(key=>Number(stat[key]||0)!==totals[key]).map(key=>({key,label:labels[key],season:Number(stat[key]||0),cards:totals[key]}));
  return fields.length?[{player,fields,played}]:[];
 });
 return {scores,players:playersWithDifferences};
}
