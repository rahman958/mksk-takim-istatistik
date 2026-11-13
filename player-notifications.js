export function installPlayerNotifications({ db, active, openMessage, tableName = 'club_player_notifications', scope = 'player', destinations = {} }) {
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
  dialog.innerHTML = '<header><h2 id="mksk-notifications-title-'+scope+'">Bildirimler</h2><button type="button" class="notification-close">Kapat ×</button></header><p role="status"></p><div class="notification-list"></div>';
  document.body.append(button, dialog);
  const close = dialog.querySelector('.notification-close');
  const status = dialog.querySelector('[role=status]');
  const list = dialog.querySelector('.notification-list');
  const date = new Intl.DateTimeFormat('tr-TR', {dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'});
  let revision = 0;
  let limit = 30;

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
    const table = () => db().from(tableName);
    const unread = table().select('id', {count:'exact',head:true}).is('read_at',null);
    const page = dialog.open ? table().select('id,kind,title,detail,created_at,read_at').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit+1) : null;
    const [count, result] = await Promise.all([unread,page]);
    if (request !== revision || !active()) return;
    badge.hidden = !!count.error || !count.count;
    badge.textContent = count.count > 99 ? '99+' : count.count;
    button.setAttribute('aria-label', badge.hidden ? 'Bildirimler' : 'Bildirimler, '+count.count+' okunmamış');
    if (!result || !dialog.open) return;
    if (result.error) {
      status.textContent = 'Bildirimler yüklenemedi.';
      return;
    }
    status.textContent = result.data.length ? '' : 'Henüz bildirimin yok.';
    list.replaceChildren();
    for (const item of result.data.slice(0,limit)) {
      const row = document.createElement('article');
      row.classList.toggle('unread', !item.read_at);
      const title = document.createElement('strong');
      const detail = document.createElement('div');
      const time = document.createElement('small');
      title.textContent = item.title;
      detail.textContent = item.detail;
      time.textContent = date.format(new Date(item.created_at));
      row.append(title,detail,time);
      const destination = destinations[item.kind] || (item.kind === 'message' && openMessage ? ['Mesajları aç', openMessage] : null);
      if (!item.read_at || destination) {
        const action = document.createElement('button');
        action.type = 'button';
        action.textContent = destination?.[0] || 'Okudum';
        action.onclick = async () => {
          action.disabled = true;
          if (!item.read_at) {
            const saved = await table().update({read_at:new Date().toISOString()}).eq('id',item.id).is('read_at',null);
            if (saved.error) {
              status.textContent = 'Okundu bilgisi kaydedilemedi.';
              action.disabled = false;
              return;
            }
          }
          if (!active()) return;
          if (destination) {
            dialog.close();
            destination[1]();
          }
          void refresh();
        };
        row.append(action);
      }
      list.append(row);
    }
    if (result.data.length > limit) {
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
