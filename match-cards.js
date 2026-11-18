/* Match-card centre: one clear place to add, inspect and remove match cards. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
const season = () => document.getElementById('season-select')?.value || '2026-2027';
let cardDialog, savingMatch=false, people = [], teamRecord = {matches:0,wins:0,draws:0,losses:0};
const db = () => window.MKSK_DB;
const fmtDate = value => value ? String(value).split('-').reverse().join('.') : '—';
const scoreText = row => Number(row.our_score) > Number(row.opponent_score) ? 'GALİBİYET' : Number(row.our_score) < Number(row.opponent_score) ? 'MAĞLUBİYET' : 'BERABERLİK';

function addStyle(){
  if(document.getElementById('match-card-centre-style')) return;
  const style=document.createElement('style');style.id='match-card-centre-style';
  style.textContent=`
  .mcc-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.mcc-tabs button{min-height:46px;border:1px solid #7893b7;border-radius:9px;background:#fff;color:#173857;font-weight:800}.mcc-tabs button[aria-pressed=true]{background:#214f7e;color:#fff}.match-card-centre [hidden]{display:none!important}.mcc-record summary{font-weight:800}
  .match-card-centre{width:min(1100px,96vw);max-height:92dvh;overflow:auto;padding:0;border:0;border-radius:20px;background:#f4f7ff;color:#152b4a}
  .mcc-record{margin:0 0 14px;border:1px solid #86a4ca;border-radius:15px;padding:14px;background:#edf5ff}.mcc-record h3{margin:0 0 4px;font-size:16px}.mcc-record p{margin:0 0 12px;font-size:13px;line-height:1.45;color:#36506f}.mcc-record-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.mcc-record label{display:grid;gap:5px;font-size:11px;font-weight:900}.mcc-record input{box-sizing:border-box;width:100%;min-height:40px;border:1px solid #8aa0c3;border-radius:9px;background:#fff;color:#172e4e;padding:8px;font:inherit}.mcc-record-save{margin-top:11px;min-height:42px;border:0;border-radius:10px;padding:8px 12px;background:#214f7e;color:#fff;font-weight:900;cursor:pointer}.mcc-record-status{display:inline-block;margin:9px 0 0;font-size:12px;font-weight:800}.match-card-centre::backdrop{background:#07142acc}.mcc-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:18px 20px;background:linear-gradient(120deg,#214f7e,#67479e);color:#fff}.mcc-head h2{margin:0;font-size:22px}.mcc-close,.mcc-head button{border:1px solid #bcd0ed;border-radius:10px;background:#fff;color:#1d3760;padding:10px 14px;font-weight:900;cursor:pointer}.mcc-main{padding:16px}.mcc-intro{margin:0 0 14px;line-height:1.55;color:#36506f}.mcc-new{border:2px solid #7d87b7;border-radius:16px;padding:16px;background:linear-gradient(130deg,#eaf4ff,#eee9ff)}.mcc-new summary{cursor:pointer;font-size:18px;font-weight:900;color:#253e70}.mcc-info{font-size:13px;line-height:1.55}.mcc-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.mcc-meta label,.mcc-player label{display:grid;gap:6px;font-size:12px;font-weight:900}.mcc-meta input,.mcc-meta select,.mcc-player input{box-sizing:border-box;width:100%;min-height:42px;border:1px solid #8aa0c3;border-radius:10px;background:#fff;color:#172e4e;padding:9px;font:inherit}.mcc-count{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;gap:8px!important}.mcc-count input{width:20px!important;min-height:20px!important}.mcc-player-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:12px 0}.mcc-player-tools input{min-height:40px;flex:1 1 220px}.mcc-select-all{border:1px solid #7089b4;border-radius:10px;background:#fff;color:#21426f;padding:10px;font-weight:800;cursor:pointer}.mcc-players{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;max-height:410px;overflow:auto;padding:3px}.mcc-player{border:1px solid #aeb9d2;border-radius:13px;padding:11px;background:#fff}.mcc-player.selected{border-color:#6244a1;background:#f1ebff}.mcc-player-top{display:flex;gap:9px;align-items:start}.mcc-player-top input{width:20px;min-height:20px;margin-top:2px}.mcc-player-top strong{display:block}.mcc-player-top small{display:block;color:#526985;margin-top:3px}.mcc-fields{display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.mcc-player.selected .mcc-fields{display:grid}.mcc-fields label{font-size:10px}.mcc-fields input{min-height:36px;padding:6px}.mcc-save{display:block;width:100%;margin-top:16px;min-height:50px;border:0;border-radius:12px;background:linear-gradient(120deg,#2d6e88,#5b47a1);color:#fff;font-weight:900;font-size:16px;cursor:pointer}.mcc-status{min-height:22px;font-weight:800;margin:10px 0 0}.mcc-list-title{margin:24px 0 10px}.mcc-list{display:grid;gap:10px}.mcc-row{border:1px solid #aebbd3;border-left:6px solid #567fc4;border-radius:14px;background:#fff;padding:14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.mcc-row h4{margin:0 0 6px;font-size:17px}.mcc-row p{margin:3px 0;color:#455c79;font-size:13px}.mcc-row .mcc-result{font-weight:900;color:#415b9a}.mcc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.mcc-actions button{min-height:40px;border:1px solid #718bb8;border-radius:10px;padding:8px 11px;background:#eef4ff;color:#203b69;font-weight:900;cursor:pointer}.mcc-actions .danger{background:#ffe8ec;border-color:#c97587;color:#89273b}.mcc-empty{padding:22px;border:1px dashed #7e94b7;border-radius:14px;color:#415c7c}.mcc-detail{white-space:pre-line;line-height:1.65}.mcc-detail-dialog{width:min(560px,94vw);border:0;border-radius:18px;padding:20px;background:#f5f8ff;color:#172f50}.mcc-detail-dialog::backdrop{background:#061326b8}.mcc-detail-dialog button{margin-top:12px;min-height:42px;border:0;border-radius:10px;padding:10px 14px;background:#365c9c;color:#fff;font-weight:900}
  html[data-theme=dark] .match-card-centre{background:#101f35;color:#f0f5ff}html[data-theme=dark] .mcc-record{background:#17344f;border-color:#718cb1}html[data-theme=dark] .mcc-record p{color:#d2e1f5}html[data-theme=dark] .mcc-record input{background:#10243d;color:#f2f6ff;border-color:#7891b4}html[data-theme=dark] .mcc-intro{color:#e7f0ff!important;opacity:1!important}html[data-theme=dark] .mcc-new{background:linear-gradient(130deg,#1c3550,#31234a);border-color:#8788bd}html[data-theme=dark] .mcc-new summary{color:#f4f6ff}html[data-theme=dark] .mcc-meta input,html[data-theme=dark] .mcc-meta select,html[data-theme=dark] .mcc-player input,html[data-theme=dark] .mcc-select-all{background:#10243d;color:#f2f6ff;border-color:#7891b4}html[data-theme=dark] .mcc-player{background:#182b46;border-color:#516b93}html[data-theme=dark] .mcc-player.selected{background:#30264c;border-color:#9676c4}html[data-theme=dark] .mcc-player-top small,html[data-theme=dark] .mcc-row p{color:#c8d8ed}html[data-theme=dark] .mcc-row{background:#172b46;border-color:#536f9d}html[data-theme=dark] .mcc-row .mcc-result{color:#b9d1ff}html[data-theme=dark] .mcc-actions button{background:#203c63;border-color:#7393bd;color:#f5f8ff}html[data-theme=dark] .mcc-actions .danger{background:#53243b;border-color:#b76d80;color:#ffe9ee}html[data-theme=dark] .mcc-empty{color:#d6e3f5;border-color:#718cb1}html[data-theme=dark] .mcc-detail-dialog{background:#172941;color:#f3f6ff}
  @media(max-width:640px){.mcc-record-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mcc-head{padding:14px}.mcc-head h2{font-size:18px}.mcc-main{padding:12px}.mcc-meta{grid-template-columns:repeat(2,minmax(0,1fr))}.mcc-row{grid-template-columns:1fr}.mcc-actions{justify-content:flex-start}.mcc-players{grid-template-columns:1fr}}
  
  .mcc-score-strip{color:#fff;margin:4px 0 0;font-size:13px;overflow-wrap:anywhere}
  .mcc-team{margin-bottom:14px;padding:12px;border:1px solid #a8bfd8;border-radius:14px;background:#edf5ff}
  .mcc-team h3{margin:0;font-size:17px}.mcc-team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:9px 0}
  .mcc-team-grid div{background:#fff;border-radius:8px;padding:6px 2px;text-align:center;overflow-wrap:anywhere}.mcc-team-grid dt{font-size:clamp(9px,2.7vw,14px)}.mcc-team-grid dd{margin:0;font-weight:850;font-size:21px}.mcc-team .mcc-record{margin:0;padding:7px}
  .mcc-player-tools select,.mcc-player-tools input{max-width:100%;min-width:0;flex:1 1 170px;min-height:42px}
  .mcc-players{display:grid;grid-template-columns:1fr;max-height:none;overflow:visible}
  .mcc-player.selected{display:grid;grid-template-columns:minmax(155px,1fr) minmax(0,2fr);align-items:center;gap:10px;background:#fff}
  .mcc-player label.mcc-played{display:flex;align-items:center;gap:8px}.mcc-player-top{flex-direction:column;gap:4px}.mcc-fields{margin:0;grid-template-columns:repeat(4,minmax(0,1fr))}
  .mcc-award{font-size:12px;padding:4px 6px;min-height:34px}.mcc-award[aria-pressed=true]{background:#ffedbf;color:#684607}
  .mcc-check{background:#fff;border:1px solid #9bb6d4;border-radius:12px;margin-top:12px;padding:12px}.mcc-check h3{margin:0}.mcc-goal-check{font-weight:700}
  @media(max-width:620px){.mcc-player.selected{grid-template-columns:1fr}.mcc-player-top{flex-direction:row;justify-content:space-between;align-items:center}.mcc-fields input{font-size:16px}.mcc-fields{gap:5px}.mcc-fields label{overflow-wrap:anywhere}}

`;
  document.head.appendChild(style);
}
async function loadData(){
  const [players,cards,record]=await Promise.all([
    db().from('players').select('id,full_name,jersey_number,position').is('archived_at',null).eq('access_disabled',false).is('team_left_on',null).order('full_name'),
    db().from('club_match_entries').select('id,match_date,match_time,opponent,our_score,opponent_score,player_entries,count_team_match,created_at').eq('season',season()).is('cancelled_at',null).order('match_date',{ascending:false}).order('created_at',{ascending:false}),
    db().rpc('club_dashboard_totals',{p_season:season()})
  ]);
  if(players.error) throw players.error;
  if(cards.error) throw cards.error;
  people=players.data||[];
  if(record.error) throw record.error;
  const {matches,wins,draws,losses}=record.data;
  teamRecord={matches,wins,draws,losses};
  return cards.data||[];
}
const norm=value=>String(value??'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,' ');
const keeper=p=>['gk','kl','k','kaleci'].includes(norm(p.position));
function playerCard(p){
  const field=(key,title,max,value)=>'<label>'+title+'<input data-field="'+key+'" type="number" inputmode="numeric" min="0" max="'+max+'" step="1" value="'+value+'" '+(key==='points'?'placeholder="—"':'required')+'></label>';
  return '<article class="mcc-player selected" data-person="'+esc(p.id)+'"><div class="mcc-player-top"><label class="mcc-played"><input type="checkbox" checked aria-label="'+esc(p.full_name)+' oynadı"><span><strong>'+esc(p.full_name)+'</strong><small>'+esc(p.position||'Mevki belirtilmedi')+' · '+esc(p.jersey_number??'—')+'</small></span></label><button type="button" class="mcc-award" aria-pressed="false" aria-label="'+esc(p.full_name)+' Maçın Adamı">☆ <span>Maçın Adamı</span></button></div><div class="mcc-fields">'+
    field('goals','Gol',200,0)+field('assists','Asist',200,0)+field('points','Puan',10,'')+
    (keeper(p)?field('goals_conceded','Yediği gol',200,0):'')+'</div></article>';
}
function entriesFrom(form){
  return [...form.querySelectorAll('.mcc-player.selected')].map(row=>{
    const val=key=>{const input=row.querySelector('[data-field="'+key+'"]');return key==='points'&&input.value===''?null:Number(input?.value||0);};
    return {player_id:row.dataset.person,goals:val('goals'),assists:val('assists'),points:val('points'),goals_conceded:val('goals_conceded'),man_of_match:Number(row.querySelector('.mcc-award').getAttribute('aria-pressed')==='true'),points_mode:'add'};
  });
}
function reviewMatch(entries,score){
  const goals=entries.reduce((sum,row)=>sum+row.goals,0);
  return {goals,missing:score-goals,unrated:entries.filter(row=>row.points===null),award:entries.find(row=>row.man_of_match)};
}
function bindPlayerRows(form,formSeason){
  const list=form.querySelector('.mcc-players'), query=form.querySelector('.mcc-player-query'), picker=form.querySelector('.mcc-player-pick');
  const preview=form.querySelector('.mcc-check'), notice=form.querySelector('.mcc-roster-status'), lineup=form.querySelector('.mcc-lineup');
  const summary=cardDialog.querySelector('.mcc-score-strip');
  const name=id=>people.find(p=>p.id===id)?.full_name||'Oyuncu';
  function syncScore(){
    summary.textContent=[fmtDate(form.elements.date.value),form.elements.opponent.value.trim()||'Rakip belirtilmedi',form.elements.our.value+'–'+form.elements.against.value].join(' · ');
  }
  function options(){
    const present=new Set([...list.children].map(row=>row.dataset.person));
    const q=norm(query.value);
    picker.innerHTML='<option value="">Oyuncu seç</option>'+people.filter(p=>!present.has(p.id)&&norm(p.full_name+' '+(p.jersey_number??'')).includes(q)).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+'</option>').join('');
  }
  function add(ids){
    const present=new Set([...list.children].map(row=>row.dataset.person));
    let added=0;
    for(const id of new Set(ids)){
      const p=people.find(item=>item.id===id);
      if(!p||present.has(id))continue;
      list.insertAdjacentHTML('beforeend',playerCard(p));
      added++;
    }
    form.querySelector('.mcc-no-players').hidden=list.children.length>0;
    options();
    preview.hidden=true;
    return added;
  }
  function setAward(button,on){
    button.setAttribute('aria-pressed',String(on));
    button.firstChild.textContent=on?'★ ':'☆ ';
  }
  list.onchange=e=>{
    if(!e.target.matches('.mcc-played input'))return;
    const row=e.target.closest('.mcc-player'),selected=e.target.checked;
    row.classList.toggle('selected',selected);
    row.querySelectorAll('[data-field],.mcc-award').forEach(input=>input.disabled=!selected);
    if(!selected)setAward(row.querySelector('.mcc-award'),false);
  };
  list.onclick=e=>{
    const award=e.target.closest('.mcc-award');
    if(!award)return;
    const on=award.getAttribute('aria-pressed')!=='true';
    list.querySelectorAll('.mcc-award').forEach(button=>setAward(button,on&&button===award));
    preview.hidden=true;
  };
  query.oninput=options;
  form.querySelector('.mcc-add-player').onclick=()=>{
    if(!picker.value){notice.textContent='Listeden bir oyuncu seç.';return;}
    notice.textContent=add([picker.value])?'Oyuncu listeye eklendi.':'';
  };
  lineup.onclick=async()=>{
    const date=form.elements.date.value, opponent=norm(form.elements.opponent.value), time=form.elements.time.value;
    if(!date||!opponent){notice.textContent='Kadroyu getirmek için tarih ve rakibi yaz.';return;}
    lineup.disabled=true;notice.textContent='Yayımlanan kadro aranıyor…';
    try{
      const r=await db().from('club_lineup_publications').select('lineup_id,snapshot,withdrawn_at').eq('season',formSeason).order('published_at',{ascending:false});
      if(r.error)throw r.error;
      if(date!==form.elements.date.value||opponent!==norm(form.elements.opponent.value)||time!==form.elements.time.value){notice.textContent='Maç bilgileri değişti. Kadroyu yeniden getir.';return;}
      const latest=[...new Map((r.data||[]).slice().reverse().map(row=>[row.lineup_id,row])).values()];
      const candidates=latest.filter(row=>!row.withdrawn_at&&row.snapshot?.match_date===date&&norm(row.snapshot.opponent)===opponent&&(!time||!row.snapshot.match_time||row.snapshot.match_time.slice(0,5)===time)).map(row=>row.snapshot);
      if(candidates.length!==1){notice.textContent=candidates.length?'Birden fazla kadro bulundu. Maç saatini yaz veya oyuncuları elle ekle.':'Bu tarih ve rakip için yayımlanmış kadro bulunamadı. Oyuncuları elle ekleyebilirsin.';return;}
      const ids=(candidates[0].positions||[]).map(slot=>slot.player_id).filter(Boolean);
      const added=add(ids);
      notice.textContent=added+' ilk kadro oyuncusu eklendi. Yedekten girenleri elle ekle veya oynamayanların işaretini kaldır.';
    }catch(error){notice.textContent='Kadro alınamadı. '+error.message;}
    finally{lineup.disabled=false;}
  };
  form.addEventListener('input',e=>{if(e.target!==query&&e.target!==picker){syncScore();preview.hidden=true;}});
  form.addEventListener('change',e=>{if(e.target!==picker){syncScore();preview.hidden=true;}});
  syncScore();options();
  return ()=>{
    list.replaceChildren();
    form.querySelector('.mcc-no-players').hidden=false;
    preview.hidden=true;
    notice.textContent='';
    options();syncScore();
  };
}
function showDetail(card,notice){
  const names=new Map(people.map(p=>[p.id,p.full_name]));
  const rows=Array.isArray(card.player_entries)?card.player_entries:[];
  const visibleRows=rows.filter(row=>names.get(row?.player_id)?.trim());
  const d=document.createElement('dialog');d.className='mcc-detail-dialog';
  d.innerHTML='<h3>'+esc(card.opponent)+' · '+esc(fmtDate(card.match_date))+'</h3><p class="mcc-detail">SKOR: '+esc(card.our_score)+'–'+esc(card.opponent_score)+' · '+esc(scoreText(card))+'\nSAAT: '+esc(card.match_time||'BELİRTİLMEDİ')+'\nOYUNCU SAYISI: '+rows.length+'\n\n'+(visibleRows.length?visibleRows.map(r=>esc(names.get(r.player_id))).join('\n'):rows.length?'GÖSTERİLEBİLEN OYUNCU YOK.':'BU KARTA HENÜZ OYUNCU İŞLENMEDİ.')+'</p><button>KAPAT</button>';
  if(visibleRows.length){
    const form=document.createElement('form');
    form.innerHTML='<h4>MAÇ PUANI DÜZELT</h4><p>Bu maçta oynayanların puanını 0–10 arasında güncelleyebilirsin.</p>'+
      visibleRows.map(r=>'<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:8px 0">'+esc(names.get(r.player_id))+
      '<input style="width:5em" type="number" min="0" max="10" step="1" inputmode="numeric" value="'+esc(r.points??'')+'"></label>').join('')+
      '<button type="submit">PUANLARI KAYDET</button><p role="status"></p>';
    d.append(form);
    const inputs=Array.from(form.querySelectorAll('input'));
    const save=form.querySelector('button'), status=form.querySelector('[role=status]');
    form.onsubmit=async event=>{
      event.preventDefault();
      const ratings=visibleRows.flatMap((row,index)=>{
        const raw=inputs[index].value;
        return raw===''||Number(raw)===row.points?[]:[{player_id:row.player_id,points:Number(raw),expected:row.points??null}];
      });
      if(!ratings.length){status.textContent='Değişen puan yok.';return;}
      save.disabled=true;
      try{
        const result=await db().rpc('club_complete_match_ratings',{p_match:card.id,p_ratings:ratings,p_mode:'correct'});
        if(result.error)throw result.error;
        ratings.forEach(r=>{rows.find(row=>row.player_id===r.player_id).points=r.points;});
        status.textContent='Puanlar kaydedildi.';
        await refresh();
        window.dispatchEvent(new Event('mksk-match-changed'));
      }catch(error){status.textContent='Kaydedilemedi: '+error.message;}
      finally{save.disabled=false;}
    };
  }
  const candidates=people.filter(player=>!rows.some(row=>row.player_id===player.id));
  if(candidates.length){
    const section=document.createElement('details');
    section.innerHTML='<summary>OYUNCU EKLE</summary><form class="mcc-meta">'+
      '<label>OYUNCU<select name="player" required><option value="">OYUNCU SEÇ</option>'+
      candidates.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+'</option>').join('')+'</select></label>'+
      '<label>GOL<input name="goals" type="number" min="0" max="200" step="1" value="0" required></label>'+
      '<label>ASİST<input name="assists" type="number" min="0" max="200" step="1" value="0" required></label>'+
      '<label>MAÇ PUANI (0–10)<input name="points" type="number" min="0" max="10" step="1" inputmode="numeric"></label>'+
      (card.count_team_match?'<label><input name="already" type="checkbox"> İSTATİSTİKLER SEZON TOPLAMINDA ZATEN VAR</label>':'<p>Geçmiş maç kartı. Bu giriş sezon toplamına eklenmez.</p>')+
      '<button type="submit">OYUNCUYU KAYDET</button><p role="status"></p></form>';
    d.append(section);
    const form=section.querySelector('form');
    const save=form.querySelector('button');
    const status=form.querySelector('[role=status]');
    form.onsubmit=async event=>{
      event.preventDefault();
      if(save.disabled)return;
      const values=form.elements;
      save.disabled=true;
      status.textContent='Oyuncu kaydediliyor…';
      try{
        const result=await db().rpc('club_add_saved_match_player',{
          p_match:card.id,p_player:values.player.value,p_goals:Number(values.goals.value),
          p_assists:Number(values.assists.value),p_points:values.points.value===''?null:Number(values.points.value),
          p_already_counted:values.already?.checked??false
        });
        if(result.error)throw result.error;
        const stillOpen=d.open;
        if(stillOpen)d.close();
        await refresh();
        window.dispatchEvent(new Event('mksk-match-changed'));
        if(stillOpen&&cardDialog.open)showDetail({...card,player_entries:[...rows,result.data]},'Oyuncu karta eklendi.');
      }catch(error){status.textContent='Kaydedilemedi: '+error.message;}
      finally{save.disabled=false;}
    };
  }
  if(notice){
    const status=document.createElement('p');
    status.setAttribute('role','status');
    status.textContent=notice;
    d.querySelector('h3').after(status);
  }
  d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();document.body.appendChild(d);d.showModal();
}
function renderCards(cards){
  const list=cardDialog.querySelector('.mcc-list');
  list.innerHTML=cards.length?cards.map((card,i)=>'<article class="mcc-row" data-card-index="'+i+'"><div><h4>'+esc(fmtDate(card.match_date))+' · '+esc(card.opponent)+'</h4><p>'+esc(card.our_score)+'–'+esc(card.opponent_score)+' · <span class="mcc-result">'+esc(scoreText(card))+'</span> · '+(card.match_time?esc(card.match_time):'SAAT YOK')+'</p><p>'+((card.player_entries||[]).length)+' OYUNCU İŞLENDİ · '+(card.count_team_match?'SEZON TOPLAMINA EKLENDİ':'GEÇMİŞ KARTI / TOPLAMA EKLENMEDİ')+'</p></div><div class="mcc-actions"><button type="button" data-action="view">KARTI GÖR / DÜZENLE</button><button type="button" class="danger" data-action="delete">SİL / GERİ AL</button></div></article>').join(''):'<p class="mcc-empty">HENÜZ MAÇ KARTI YOK. AŞAĞIDAKİ “YENİ MAÇ KARTI”NDAN EKLEYEBİLİRSİN.</p>';
  list.querySelectorAll('.mcc-row').forEach(row=>{const card=cards[Number(row.dataset.cardIndex)];row.querySelector('[data-action=view]').onclick=()=>showDetail(card);row.querySelector('[data-action=delete]').onclick=async()=>{if(!confirm(card.opponent+' maç kartını silmek / geri almak istiyor musun?'))return;const status=cardDialog.querySelector('.mcc-status');status.textContent='KART KALDIRILIYOR…';try{const res=await db().rpc('club_remove_match',{p_match:card.id});if(res.error)throw res.error;status.textContent=res.data||'MAÇ KARTI KALDIRILDI.';window.dispatchEvent(new Event('mksk-match-changed'));await refresh();}catch(error){status.textContent='KALDIRILAMADI: '+error.message;}};});
}
async function refresh(){
  const status=cardDialog.querySelector('.mcc-status');status.textContent='MAÇ KARTLARI YÜKLENİYOR…';
  try{const cards=await loadData();renderCards(cards);renderTeamRecord();status.textContent=cards.length+' MAÇ KARTI HAZIR.';}catch(error){status.textContent='YÜKLENEMEDİ: '+error.message;}
}
const teamLabels=[['matches','Maç'],['wins','Galibiyet'],['draws','Beraberlik'],['losses','Mağlubiyet']];
function renderTeamRecord(){
  cardDialog.querySelector('.mcc-team-grid').innerHTML=teamLabels.map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+esc(teamRecord[key]??'—')+'</dd></div>').join('');
}
function draw(){
  const formSeason=season();
  let requestId=crypto.randomUUID();
  cardDialog.innerHTML='<header class="mcc-head"><div><h2>⚽ MAÇ İŞLE</h2><p class="mcc-score-strip"></p></div><button type="button" class="mcc-close">KAPAT ×</button></header><main class="mcc-main"><nav class="mcc-tabs" aria-label="Maç işlemleri"><button type="button" data-mcc-view="new" aria-pressed="true">Yeni Maç</button><button type="button" data-mcc-view="saved" aria-pressed="false">Kayıtlı Maçlar</button></nav><p class="mcc-intro">Her maç burada tek kart olur. Kartı eklediğinde seçtiğin oyuncularda <strong>OYNADI</strong>, seçmediklerinde <strong>OYNAMADI</strong> görünür. Geçmiş maçlar için “sezon toplamına ekle” seçeneğini kapat; sayıların iki kez artmaz.</p><section class="mcc-team"><h3>Takım Genel Durumu</h3><dl class="mcc-team-grid"></dl><details class="mcc-record"><summary>Takım Durumunu Düzenle</summary><p>Bu sezonun maç, galibiyet, beraberlik ve mağlubiyet toplamını buradan düzenle.</p><div class="mcc-record-grid"><label>MAÇ<input name="team_matches" type="number" min="0" value="'+teamRecord.matches+'"></label><label>GALİBİYET<input name="team_wins" type="number" min="0" value="'+teamRecord.wins+'"></label><label>BERABERLİK<input name="team_draws" type="number" min="0" value="'+teamRecord.draws+'"></label><label>MAĞLUBİYET<input name="team_losses" type="number" min="0" value="'+teamRecord.losses+'"></label></div><button class="mcc-record-save" type="button">TAKIM DURUMUNU KAYDET</button><span class="mcc-record-status" role="status"></span></details></section><details class="mcc-new" open><summary>Maç Bilgileri ve Oyuncular</summary><form><div class="mcc-meta"><label>TARİH<input name="date" type="date" max="'+today()+'" value="'+today()+'" required></label><label>RAKİP<input name="opponent" maxlength="200" required placeholder="ÖRN. DUMLUPINAR SK"></label><label>BİZİM SKOR<input name="our" type="number" min="0" max="200" value="0" required></label><label>RAKİP SKOR<input name="against" type="number" min="0" max="200" value="0" required></label><label>SAAT<input name="time" type="time"></label><label class="mcc-count"><input name="count" type="checkbox" checked><span>TAKIM MAÇ SAYISINA VE İSTATİSTİKLERE EKLE</span></label></div><p class="mcc-info">Geçmiş maç giriyorsan kutuyu kapat. Yeni maçta açık bırak: takım sonucu ve sadece seçtiğin oyuncuların maç/gol/asist/puanı işlenir.</p><div class="mcc-player-tools"><button type="button" class="mcc-lineup">Kadroyu Getir</button><input class="mcc-player-query" type="search" placeholder="Ad veya forma no" aria-label="Oyuncu ara"><select class="mcc-player-pick" aria-label="Eklenecek oyuncu"></select><button type="button" class="mcc-add-player">+ Oyuncu Ekle</button></div><p class="mcc-roster-status" role="status"></p><p class="mcc-no-players">Kadroyu getir veya oyuncuları elle ekle.</p><div class="mcc-players"></div><button class="mcc-save" type="submit">Kaydetmeden Önce Kontrol</button><section class="mcc-check" hidden><h3>Maç Kontrolü</h3><div class="mcc-check-content"></div><button type="button" class="mcc-commit">Maçı Kaydet</button></section></form></details><p class="mcc-status" role="status"></p><section class="mcc-list" aria-label="Kayıtlı maçlar" hidden></section></main>';
  cardDialog.querySelector('.mcc-close').onclick=()=>{if(!savingMatch)cardDialog.close();};
  cardDialog.oncancel=e=>{if(savingMatch)e.preventDefault();};
  renderTeamRecord();
  const tabs=Array.from(cardDialog.querySelectorAll('[data-mcc-view]'));
  tabs.forEach(button=>button.onclick=()=>{
    const saved=button.dataset.mccView==='saved';
    tabs.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    cardDialog.querySelector('.mcc-list').hidden=!saved;
    cardDialog.querySelectorAll('.mcc-intro,.mcc-new').forEach(part=>{part.hidden=saved;});
  });
  const form=cardDialog.querySelector('.mcc-new form');
  const resetPlayers=bindPlayerRows(form,formSeason);
  const review=form.querySelector('.mcc-check'), button=form.querySelector('.mcc-commit'), status=cardDialog.querySelector('.mcc-status');
  cardDialog.querySelector('.mcc-record-save').onclick=async function(){
    if(savingMatch)return;
    const status=cardDialog.querySelector('.mcc-record-status');
    const matches=Number(cardDialog.querySelector('[name=team_matches]').value);
    const wins=Number(cardDialog.querySelector('[name=team_wins]').value);
    const draws=Number(cardDialog.querySelector('[name=team_draws]').value);
    const losses=Number(cardDialog.querySelector('[name=team_losses]').value);
    this.disabled=true;status.textContent='KAYDEDİLİYOR…';
    try{
      const result=await db().rpc('club_set_season_record',{p_season:season(),p_matches:matches,p_wins:wins,p_draws:draws,p_losses:losses});
      if(result.error)throw result.error;
      teamRecord=result.data||{matches,wins,draws,losses};
      renderTeamRecord();
      status.textContent='TAKIM DURUMU KAYDEDİLDİ.';
    }catch(error){status.textContent='KAYDEDİLEMEDİ: '+error.message;}finally{this.disabled=false;}
  };
  form.onsubmit=event=>{
    event.preventDefault();
    if(savingMatch||form.querySelector('.mcc-lineup').disabled)return;
    if(!form.elements.opponent.value.trim()){form.elements.opponent.focus();status.textContent='Rakip adını yaz.';return;}
    const entries=entriesFrom(form);
    if(!entries.length){status.textContent='En az bir oyuncuyu oynadı olarak işaretle.';return;}
    const score=Number(form.elements.our.value),check=reviewMatch(entries,score);
    const name=id=>people.find(p=>p.id===id)?.full_name||'Oyuncu';
    const goalsText=check.missing===0?'Oyuncu golleri takım skoruyla eşleşiyor.':
      check.missing>0?check.missing+' gol henüz oyuncuya işlenmedi.':'Oyuncu golleri takım skorunu '+Math.abs(check.missing)+' gol aşıyor.';
    review.querySelector('.mcc-check-content').innerHTML='<p><strong>'+entries.length+' oyuncu oynadı</strong> · Takım skoru '+score+'–'+esc(form.elements.against.value)+' · Oyuncu golleri '+check.goals+'</p><p class="mcc-goal-check">'+esc(goalsText)+'</p><p>Maçın Adamı · '+esc(check.award?name(check.award.player_id):'Seçilmedi')+'</p>'+
      (check.unrated.length?'<p>Puanı eksik · '+esc(check.unrated.map(row=>name(row.player_id)).join(', '))+'</p>':'<p>Tüm oyuncuların puanı girildi.</p>')+
      '<p>'+(form.elements.count.checked?'Oynayanların sezon maç sayısı 1 artacak.':'Geçmiş maç kartı olarak saklanacak.')+'</p>';
    button.disabled=check.missing<0;
    review.hidden=false;status.textContent='';
    review.scrollIntoView({block:'nearest'});
  };
  button.onclick=async()=>{
    if(savingMatch||review.hidden||!form.reportValidity())return;
    const entries=entriesFrom(form);
    savingMatch=true;button.disabled=true;form.inert=true;
    status.textContent='Maç kartı kaydediliyor…';
    try{
      const result=await db().rpc('club_save_match_card',{p_id:requestId,p_season:formSeason,p_date:form.elements.date.value,p_time:form.elements.time.value,p_opponent:form.elements.opponent.value.trim(),p_our:Number(form.elements.our.value),p_against:Number(form.elements.against.value),p_count:form.elements.count.checked,p_entries:entries});
      if(result.error)throw result.error;
      requestId=crypto.randomUUID();
      form.reset();form.elements.date.value=today();resetPlayers();
      await refresh();
      window.dispatchEvent(new Event('mksk-match-changed'));
      status.textContent='Maç kartı kaydedildi.';
    }catch(error){status.textContent='Kaydedilemedi: '+error.message;}
    finally{savingMatch=false;form.inert=false;button.disabled=false;}
  };
}
let matchOpenRequest=0;
export const matchCards = {
  async open(){
    if(savingMatch||cardDialog?.open)return;
    addStyle();
    if(!db()) throw new Error('Bağlantı hazırlanıyor. Birkaç saniye sonra tekrar dene.');
    if(!cardDialog){
      cardDialog=document.createElement('dialog');
      cardDialog.className='match-card-centre';
      document.body.appendChild(cardDialog);
    }
    const request=++matchOpenRequest;
    cardDialog.innerHTML='<header class="mcc-head"><h2>Maç İşle</h2><button type="button" class="mcc-close">Kapat ×</button></header><main class="mcc-main"><p class="mcc-status" role="status">Maçlar ve oyuncular yükleniyor…</p><button type="button" class="mcc-load-retry" hidden>Yeniden dene</button></main>';
    cardDialog.querySelector('.mcc-close').onclick=()=>cardDialog.close();
    cardDialog.querySelector('.mcc-load-retry').onclick=()=>{cardDialog.close();void matchCards.open();};
    cardDialog.showModal();
    try{
      const cards=await loadData();
      if(request!==matchOpenRequest||!cardDialog.open)return;
      draw();
      cardDialog.scrollTop=0;
      renderCards(cards);
      cardDialog.querySelector('.mcc-status').textContent=cards.length+' maç kartı hazır.';
      cardDialog.querySelector('.mcc-close').focus({preventScroll:true});
    }catch(error){
      if(request!==matchOpenRequest||!cardDialog.open)return;
      cardDialog.querySelector('.mcc-status').textContent='Maç İşle açılamadı. '+error.message;
      cardDialog.querySelector('.mcc-load-retry').hidden=false;
    }
  }
};
