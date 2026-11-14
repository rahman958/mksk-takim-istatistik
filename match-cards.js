/* Match-card centre: one clear place to add, inspect and remove match cards. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
const season = () => document.getElementById('season-select')?.value || '2026-2027';
let cardDialog, people = [], teamRecord = {matches:0,wins:0,draws:0,losses:0};
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
  `;
  document.head.appendChild(style);
}
async function loadData(){
  const [players,cards,record]=await Promise.all([
    db().from('players').select('id,full_name,jersey_number,position').is('archived_at',null).eq('access_disabled',false).is('team_left_on',null).order('full_name'),
    db().from('club_match_entries').select('id,match_date,match_time,opponent,our_score,opponent_score,player_entries,count_team_match,created_at').eq('season',season()).is('cancelled_at',null).order('match_date',{ascending:false}).order('created_at',{ascending:false}),
    db().from('club_season_summary').select('matches,historical_wins,historical_draws,historical_losses,wins_adjustment,draws_adjustment,losses_adjustment').eq('season',season()).maybeSingle()
  ]);
  if(players.error) throw players.error;
  if(cards.error) throw cards.error;
  people=players.data||[];
  if(!record.error && record.data){
    const x=record.data;
    teamRecord={matches:Number(x.matches||0),wins:Number(x.historical_wins||0)+Number(x.wins_adjustment||0),draws:Number(x.historical_draws||0)+Number(x.draws_adjustment||0),losses:Number(x.historical_losses||0)+Number(x.losses_adjustment||0)};
  } else { teamRecord={matches:0,wins:0,draws:0,losses:0}; }
  return cards.data||[];
}
function playerCard(p){
  return '<article class="mcc-player" data-person="'+esc(p.id)+'"><div class="mcc-player-top"><input type="checkbox" aria-label="'+esc(p.full_name)+' oynadı"><div><strong>'+esc(p.full_name)+'</strong><small>FORMA '+esc(p.jersey_number??'—')+' · '+esc(p.position??'MEVKİ BELİRTİLMEDİ')+'</small></div></div><div class="mcc-fields"><label>MAÇ PUANI (0–10)<input data-field="points" type="number" inputmode="numeric" min="0" max="10" step="1" placeholder="—"></label><label>GOL<input data-field="goals" type="number" min="0" step="1" value="0"></label><label>ASİST<input data-field="assists" type="number" min="0" step="1" value="0"></label><label>YEDİĞİ GOL<input data-field="goals_conceded" type="number" min="0" step="1" value="0"></label><label>MAÇIN ADAMI<input data-field="man_of_match" type="number" min="0" max="1" step="1" value="0"></label></div></article>';
}
function bindPlayerRows(box){
  const sync=row=>row.classList.toggle('selected',row.querySelector('input[type=checkbox]').checked);
  box.querySelectorAll('.mcc-player').forEach(row=>{row.querySelector('input[type=checkbox]').onchange=()=>sync(row);sync(row);});
  const query=box.querySelector('.mcc-player-query');
  query.oninput=()=>{const q=String(query.value||'').toLocaleLowerCase('tr-TR');box.querySelectorAll('.mcc-player').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase('tr-TR').includes(q));};
  box.querySelector('.mcc-select-all').onclick=()=>{const visible=Array.from(box.querySelectorAll('.mcc-player')).filter(r=>!r.hidden);const all=visible.every(r=>r.querySelector('input[type=checkbox]').checked);visible.forEach(r=>{r.querySelector('input[type=checkbox]').checked=!all;sync(r);});};
}
function entriesFrom(box){
  const rows=[];
  box.querySelectorAll('.mcc-player.selected').forEach(row=>{
    const val=k=>{const raw=row.querySelector('[data-field="'+k+'"]').value;return k==='points'&&raw===''?null:Number(raw||0);};
    rows.push({player_id:row.dataset.person,goals:val('goals'),assists:val('assists'),points:val('points'),goals_conceded:val('goals_conceded'),man_of_match:val('man_of_match'),points_mode:'add'});
  });
  return rows;
}
function showDetail(card){
  const names=new Map(people.map(p=>[p.id,p.full_name]));
  const rows=Array.isArray(card.player_entries)?card.player_entries:[];
  const d=document.createElement('dialog');d.className='mcc-detail-dialog';
  d.innerHTML='<h3>'+esc(card.opponent)+' · '+esc(fmtDate(card.match_date))+'</h3><p class="mcc-detail">SKOR: '+esc(card.our_score)+'–'+esc(card.opponent_score)+' · '+esc(scoreText(card))+'\nSAAT: '+esc(card.match_time||'BELİRTİLMEDİ')+'\nOYUNCU SAYISI: '+rows.length+'\n\n'+(rows.length?rows.map(r=>names.get(r.player_id)||'BİLİNMEYEN OYUNCU').join('\n'):'BU KARTA HENÜZ OYUNCU İŞLENMEDİ.')+'</p><button>KAPAT</button>';
  if(rows.length){
    const form=document.createElement('form');
    form.innerHTML='<h4>MAÇ PUANI DÜZELT</h4><p>Bu maçta oynayanların puanını 0–10 arasında güncelleyebilirsin.</p>'+
      rows.map(r=>'<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:8px 0">'+esc(names.get(r.player_id)||'BİLİNMEYEN OYUNCU')+
      '<input style="width:5em" type="number" min="0" max="10" step="1" inputmode="numeric" value="'+esc(r.points??'')+'"></label>').join('')+
      '<button type="submit">PUANLARI KAYDET</button><p role="status"></p>';
    d.append(form);
    const inputs=Array.from(form.querySelectorAll('input'));
    const save=form.querySelector('button'), status=form.querySelector('[role=status]');
    form.onsubmit=async event=>{
      event.preventDefault();
      const ratings=rows.flatMap((row,index)=>{
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
  d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();document.body.appendChild(d);d.showModal();
}
function renderCards(cards){
  const list=cardDialog.querySelector('.mcc-list');
  list.innerHTML=cards.length?cards.map((card,i)=>'<article class="mcc-row" data-card-index="'+i+'"><div><h4>'+esc(fmtDate(card.match_date))+' · '+esc(card.opponent)+'</h4><p>'+esc(card.our_score)+'–'+esc(card.opponent_score)+' · <span class="mcc-result">'+esc(scoreText(card))+'</span> · '+(card.match_time?esc(card.match_time):'SAAT YOK')+'</p><p>'+((card.player_entries||[]).length)+' OYUNCU İŞLENDİ · '+(card.count_team_match?'SEZON TOPLAMINA EKLENDİ':'GEÇMİŞ KARTI / TOPLAMA EKLENMEDİ')+'</p></div><div class="mcc-actions"><button type="button" data-action="view">KARTI GÖR / PUAN DÜZELT</button><button type="button" class="danger" data-action="delete">SİL / GERİ AL</button></div></article>').join(''):'<p class="mcc-empty">HENÜZ MAÇ KARTI YOK. AŞAĞIDAKİ “YENİ MAÇ KARTI”NDAN EKLEYEBİLİRSİN.</p>';
  list.querySelectorAll('.mcc-row').forEach(row=>{const card=cards[Number(row.dataset.cardIndex)];row.querySelector('[data-action=view]').onclick=()=>showDetail(card);row.querySelector('[data-action=delete]').onclick=async()=>{if(!confirm(card.opponent+' maç kartını silmek / geri almak istiyor musun?'))return;const status=cardDialog.querySelector('.mcc-status');status.textContent='KART KALDIRILIYOR…';try{const res=await db().rpc('club_remove_match',{p_match:card.id});if(res.error)throw res.error;status.textContent=res.data||'MAÇ KARTI KALDIRILDI.';window.dispatchEvent(new Event('mksk-match-changed'));await refresh();}catch(error){status.textContent='KALDIRILAMADI: '+error.message;}};});
}
async function refresh(){
  const status=cardDialog.querySelector('.mcc-status');status.textContent='MAÇ KARTLARI YÜKLENİYOR…';
  try{const cards=await loadData();renderCards(cards);status.textContent=cards.length+' MAÇ KARTI HAZIR.';}catch(error){status.textContent='YÜKLENEMEDİ: '+error.message;}
}
function draw(){
  cardDialog.innerHTML='<header class="mcc-head"><h2>⚽ MAÇ İŞLE</h2><button type="button" class="mcc-close">KAPAT ×</button></header><main class="mcc-main"><nav class="mcc-tabs" aria-label="Maç işlemleri"><button type="button" data-mcc-view="new" aria-pressed="true">Yeni Maç</button><button type="button" data-mcc-view="saved" aria-pressed="false">Kayıtlı Maçlar</button></nav><p class="mcc-intro">Her maç burada tek kart olur. Kartı eklediğinde seçtiğin oyuncularda <strong>OYNADI</strong>, seçmediklerinde <strong>OYNAMADI</strong> görünür. Geçmiş maçlar için “sezon toplamına ekle” seçeneğini kapat; sayıların iki kez artmaz.</p><details class="mcc-record"><summary>Takım Durumu</summary><p>Bu sezonun maç, galibiyet, beraberlik ve mağlubiyet toplamını buradan düzenle.</p><div class="mcc-record-grid"><label>MAÇ<input name="team_matches" type="number" min="0" value="'+teamRecord.matches+'"></label><label>GALİBİYET<input name="team_wins" type="number" min="0" value="'+teamRecord.wins+'"></label><label>BERABERLİK<input name="team_draws" type="number" min="0" value="'+teamRecord.draws+'"></label><label>MAĞLUBİYET<input name="team_losses" type="number" min="0" value="'+teamRecord.losses+'"></label></div><button class="mcc-record-save" type="button">TAKIM DURUMUNU KAYDET</button><span class="mcc-record-status" role="status"></span></details><details class="mcc-new" open><summary>Maç Bilgileri ve Oyuncular</summary><form><div class="mcc-meta"><label>TARİH<input name="date" type="date" max="'+today()+'" value="'+today()+'" required></label><label>RAKİP<input name="opponent" maxlength="200" required placeholder="ÖRN. DUMLUPINAR SK"></label><label>BİZİM SKOR<input name="our" type="number" min="0" max="200" value="0" required></label><label>RAKİP SKOR<input name="against" type="number" min="0" max="200" value="0" required></label><label>SAAT<input name="time" type="time"></label><label class="mcc-count"><input name="count" type="checkbox" checked><span>TAKIM MAÇ SAYISINA VE İSTATİSTİKLERE EKLE</span></label></div><p class="mcc-info">Geçmiş maç giriyorsan kutuyu kapat. Yeni maçta açık bırak: takım sonucu ve sadece seçtiğin oyuncuların maç/gol/asist/puanı işlenir.</p><div class="mcc-player-tools"><p>Oynayan oyuncuyu işaretle. Maç puanını (0–10) açılan ilk kutuya gir.</p><input class="mcc-player-query" type="search" placeholder="OYUNCU ARA"><button type="button" class="mcc-select-all">GÖRÜNENLERİ SEÇ / KALDIR</button></div><div class="mcc-players">'+people.map(playerCard).join('')+'</div><button class="mcc-save" type="submit">MAÇ KARTINI KAYDET</button></form></details><p class="mcc-status" role="status"></p><section class="mcc-list" aria-label="Kayıtlı maçlar" hidden></section></main>';
  cardDialog.querySelector('.mcc-close').onclick=()=>cardDialog.close();
  const tabs=Array.from(cardDialog.querySelectorAll('[data-mcc-view]'));
  tabs.forEach(button=>button.onclick=()=>{
    const saved=button.dataset.mccView==='saved';
    tabs.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    cardDialog.querySelector('.mcc-list').hidden=!saved;
    cardDialog.querySelectorAll('.mcc-intro,.mcc-record,.mcc-new').forEach(part=>{part.hidden=saved;});
  });
  bindPlayerRows(cardDialog);
  cardDialog.querySelector('.mcc-record-save').onclick=async function(){
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
      status.textContent='TAKIM DURUMU KAYDEDİLDİ.';
    }catch(error){status.textContent='KAYDEDİLEMEDİ: '+error.message;}finally{this.disabled=false;}
  };
  cardDialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,status=cardDialog.querySelector('.mcc-status'),entries=entriesFrom(cardDialog);
    if(!entries.length){status.textContent='ÖNCE OYNAYAN EN AZ BİR OYUNCUYU SEÇ.';return;}
    const button=form.querySelector('.mcc-save');button.disabled=true;status.textContent='MAÇ KARTI KAYDEDİLİYOR…';
    try{
      const result=await db().rpc('club_save_match_card',{p_id:crypto.randomUUID(),p_season:season(),p_date:form.elements.date.value,p_time:form.elements.time.value,p_opponent:form.elements.opponent.value.trim(),p_our:Number(form.elements.our.value),p_against:Number(form.elements.against.value),p_count:form.elements.count.checked,p_entries:entries});
      if(result.error)throw result.error;
      status.textContent='MAÇ KARTI KAYDEDİLDİ. OYUNCULARIN KARTLARINA DA DÜŞTÜ.';
      window.dispatchEvent(new Event('mksk-match-changed'));
      form.reset();form.elements.date.value=today();form.elements.count.checked=true;cardDialog.querySelectorAll('.mcc-player input[type=checkbox]').forEach(x=>x.checked=false);cardDialog.querySelectorAll('.mcc-player').forEach(x=>x.classList.remove('selected'));await refresh();
    }catch(error){status.textContent='KAYDEDİLEMEDİ: '+error.message;}finally{button.disabled=false;}
  };
}
export const matchCards = {
  async open(){
    addStyle();
    if(!db()) throw new Error('Bağlantı hazırlanıyor. Birkaç saniye sonra tekrar dene.');
    if(!cardDialog){cardDialog=document.createElement('dialog');cardDialog.className='match-card-centre';cardDialog.onclose=()=>{};document.body.appendChild(cardDialog);}
    try{people=(await loadData(),people);draw();await refresh();}catch(error){cardDialog.innerHTML='<header class="mcc-head"><h2>MAÇ KARTLARI</h2><button class="mcc-close">KAPAT ×</button></header><main class="mcc-main"><p class="mcc-status">AÇILAMADI: '+esc(error.message)+'</p></main>';cardDialog.querySelector('.mcc-close').onclick=()=>cardDialog.close();}
    if(!cardDialog.open)cardDialog.showModal();
  }
};
