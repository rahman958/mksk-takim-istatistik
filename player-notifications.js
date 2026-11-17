import { formatClubDatesInText } from './club-date.js?v=20261114-date-format-1';
export function installPlayerNotifications({ db, active, openMessage, tableName = 'club_player_notifications', scope = 'player', destinations = {}, extraSources = [] }) {
  const sources = [{tableName,label:scope==='admin'?'Yönetici':'Oyuncu Profilim',destinations,openMessage},...extraSources];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mksk-notification-bell';
  button.setAttribute('aria-label', 'Bildirimler');
  button.setAttribute('aria-haspopup', 'dialog');
  button.textContent = '🔔';
  const badge = document.createElement('span');
  badge.hidden = true;
  button.append(badge);

  const dialog = document.createElement('dialog');
  dialog.className = 'mksk-notifications';
  dialog.setAttribute('aria-labelledby', 'mksk-notifications-title-'+scope);
  dialog.innerHTML = '<header><h2 id="mksk-notifications-title-'+scope+'">'+(scope==='admin'?'Yönetici Bildirimleri':'Bildirimler')+'</h2><button type="button" class="notification-close">Kapat ×</button></header><p role="status"></p><div class="notification-list"></div>';
  const toolbar = document.querySelector('.mksk-header-tools');
  toolbar.append(button);
  const clock = document.getElementById('club-clock');
  if (clock && clock.parentElement !== toolbar) toolbar.prepend(clock);
  document.body.append(dialog);
  const close = dialog.querySelector('.notification-close');
  const status = dialog.querySelector('[role=status]');
  const list = dialog.querySelector('.notification-list');
  const date = new Intl.DateTimeFormat('tr-TR', {dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'});
  let revision = 0;
  let limit = 30;
  const controls = document.createElement('div');
  controls.className = 'notification-controls';
  controls.innerHTML = '<label><input type="checkbox"> Yalnızca okunmamışlar</label><button type="button">Tümünü okundu işaretle</button>';
  const unreadOnly = controls.querySelector('input');
  const markAll = controls.querySelector('button');
  const sourcePicker = document.createElement('select');
  sourcePicker.setAttribute('aria-label','Bildirim kaynağı');
  sourcePicker.add(new Option('Tüm kaynaklar',''));
  sources.forEach((source,i)=>sourcePicker.add(new Option(source.label,String(i))));
  if(sources.length>1)controls.prepend(sourcePicker);
  status.before(controls);
  let marking = false;
  const filterChanged = () => {limit=30;void refresh();};
  unreadOnly.onchange = filterChanged;
  sourcePicker.onchange = filterChanged;
  markAll.onclick = async () => {
    if(marking||!active())return;
    marking=true;markAll.disabled=true;
    try {
      const readAt=new Date().toISOString();
      const results=await Promise.all(sources.map(source=>db().from(source.tableName)
        .update({read_at:readAt}).is('read_at',null).lte('created_at',readAt)));
      await refresh();
      if(dialog.open&&results.some(result=>result.error))status.textContent='Bazı bildirimler okundu olarak işaretlenemedi.';
    } catch {
      if(dialog.open)status.textContent='Okundu bilgisi kaydedilemedi.';
    } finally {
      marking=false;markAll.disabled=!Number(badge.textContent)&&badge.textContent!=='99+';
    }
  };

  close.onclick = () => dialog.close();
  async function refresh() {
    const request = ++revision;
    button.hidden = !active() || !db();
    if (button.hidden) {
      badge.hidden = true;
      button.setAttribute('aria-label', 'Bildirimler');
      if (dialog.open) dialog.close();
      list.replaceChildren();
      return;
    }
    const table = source => db().from(source.tableName);
    const selected = sourcePicker.value==='' ? sources : [sources[Number(sourcePicker.value)]];
    const counts = Promise.all(sources.map(source=>table(source).select('id',{count:'exact',head:true}).is('read_at',null)));
    const pages = dialog.open ? Promise.all(selected.map(async source=>{
      let query=table(source).select('id,kind,title,detail,created_at,read_at');
      if(unreadOnly.checked)query=query.is('read_at',null);
      const result=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit+1);
      return {source,...result};
    })) : null;
    const [unread,results] = await Promise.all([counts,pages]);
    if (request !== revision || !active()) return;
    const count=unread.reduce((total,result)=>total+(result.count||0),0);
    badge.hidden = !count;
    badge.textContent = count > 99 ? '99+' : count;
    markAll.disabled=marking||!count;
    button.setAttribute('aria-label', badge.hidden ? 'Bildirimler' : 'Bildirimler, '+count+' okunmamış');
    if (!results || !dialog.open) return;
    const items=results.flatMap(result=>(result.data||[]).map(item=>({...item,source:result.source})));
    items.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id)));
    status.textContent=results.some(result=>result.error)?'Bazı bildirimler yüklenemedi.':items.length?'':unreadOnly.checked?'Okunmamış bildirimin yok.':'Henüz bildirimin yok.';
    list.replaceChildren();
    for (const item of items.slice(0,limit)) {
      const row = document.createElement('article');
      row.classList.toggle('unread', !item.read_at);
      const title = document.createElement('strong');
      const detail = document.createElement('div');
      const time = document.createElement('small');
      title.textContent = item.title;
      detail.textContent = formatClubDatesInText(item.detail);
      time.textContent = date.format(new Date(item.created_at));
      if(sources.length>1){const label=document.createElement('small');label.className='notification-source';label.textContent=item.source.label;row.append(label);}
      row.append(title,detail,time);
      const destination = item.source.destinations[item.kind] || (item.kind === 'message' && item.source.openMessage ? ['Mesajları aç', item.source.openMessage] : null);
      if (!item.read_at || destination) {
        const action = document.createElement('button');
        action.type = 'button';
        action.textContent = destination?.[0] || 'Okudum';
        action.onclick = async () => {
          action.disabled = true;
          if (!item.read_at) {
            const saved = await table(item.source).update({read_at:new Date().toISOString()}).eq('id',item.id).is('read_at',null);
            if (saved.error) {
              status.textContent = 'Okundu bilgisi kaydedilemedi.';
              action.disabled = false;
              return;
            }
          }
          if (!active()) return;
          if (destination) {
            dialog.close();
            try{await destination[1]();}catch(error){dialog.showModal();await refresh();status.textContent=error.message||'İlgili ekran açılamadı.';return;}
          }
          void refresh();
        };
        row.append(action);
      }
      list.append(row);
    }
    if (items.length > limit) {
      const more = document.createElement('button');
      more.type = 'button';
      more.textContent = 'Daha eski bildirimler';
      more.onclick = () => { limit += 30; void refresh(); };
      list.append(more);
    }
  }

  button.onclick = () => {
    if (!active() || dialog.open) return;
    limit = 30;
    sourcePicker.value='';unreadOnly.checked=false;markAll.disabled=true;
    list.replaceChildren();
    status.textContent = 'Bildirimler yükleniyor…';
    dialog.showModal();
    void refresh();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  setInterval(() => { if (!document.hidden && active() && !dialog.open) void refresh(); },30000);
  void refresh();
  return refresh;
}
