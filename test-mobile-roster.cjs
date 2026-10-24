const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const controls=app.slice(app.indexOf('// Single-purpose screens:'));
const exporter=fs.readFileSync(path.join(root,'roster-export.js'),'utf8').replace(/^export /gm,'');
const filters=app.slice(app.indexOf('function setupFilters('),app.indexOf('\nfunction applyFilters('));
const fixture=`
<style>[hidden],.hidden{display:none!important}body{margin:0;font:16px Arial}#roster-filters{padding:12px}input,select{max-width:100%;box-sizing:border-box}label{display:block}</style>
<div id="admin-view"><div id="club-search-launch"><button>Eski arama</button><p>Eski açıklama</p></div><div id="simple-admin-menu"></div><aside id="birthday-notice">Doğum günü</aside><details id="add-player-area"><summary>Oyuncu ekle</summary></details><input id="search"><div id="roster"></div><div id="roster-list"></div><div id="club-tools-panel" hidden></div><p id="admin-message"></p></div>
<div id="player-view" class="hidden"><section class="welcome"><h2 id="player-name"></h2></section></div><canvas id="export"></canvas>`;
const stubs=`
var dashboardPage='hub_home',playerDashboardPage='hub_profile',entryMode='',selectedSeason='2026-2027',accountRoles={},performanceLabels=['Değerlendirilmedi','Çok iyi'],displayStatLabels={matches:'Maç',goals:'Gol',success_rate:'Başarı'},bulkStatDirty=false;
function el(id){return document.getElementById(id)}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clubToday(){return '2026-10-24'}function clubDate(d){return d.split('-').reverse().join('.')}
function positionGroup(p){return (p.position||'').replace(/Ğ/g,'G')}function missedMatches(n){return 10-Number(n||0)}
function renderRosterList(forms){el('roster-list').innerHTML=forms.map(f=>'<button class="name-row" data-player="'+f.dataset.id+'">'+f.elements.full_name.value+'</button>').join('')}
function simplePick(key){return {click(){setDashboardPage(key)}}}function simpleActivate(b){b.click()}
function shareStats(){}function setDashboardPage(p){dashboardPage=p;entryMode='';el('club-tools-panel').hidden=true}
function setPlayerPage(p){playerDashboardPage=p}function staffApply(){el('add-player-area').hidden=false;el('birthday-notice').hidden=false}
function entryOpen(mode){dashboardPage='roster';entryMode=mode||'match';el('club-tools-panel').hidden=false;staffApply()}
async function loadPlayer(id){el('player-name').textContent=id==='one'?'İhsan Kocaoğlu':'Nadim Fazlı';playerDashboardPage='hub_profile'}
var leaveRows=[{id:'l1',person_name:'İHSAN KOCAOĞLU',starts_on:'2026-10-23',ends_on:'2026-10-26',public_reason:'Kişisel izin',reason:'GİZLİ YÖNETİM NOTU',enabled:true},{id:'l2',person_name:'Nadim Fazlı',starts_on:'2026-10-23',ends_on:'2026-10-28',public_reason:'Onaylı izin',reason:'BAŞKA GİZLİ NOT',enabled:true}];
var supabase={from(){return {select(){return this},eq(){return this},lte(){return this},gte(){return this},order(){return Promise.resolve({data:leaveRows,error:null})}}}};
`;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(fixture);await page.addScriptTag({content:stubs});await page.addScriptTag({content:controls});await page.addScriptTag({content:filters});
 await page.evaluate(()=>{
   var players=[{id:'p1',full_name:'Rahman İsmail Benek',position:'GK',jersey_number:1,matches:0,goals:0},{id:'p2',full_name:'Cüneyt Şahin',position:'GK',jersey_number:1,matches:4,goals:0},{id:'p3',full_name:'İhsan Kocaoğlu',position:'F',jersey_number:11,matches:10,goals:8}];
   el('roster').innerHTML=players.map(p=>'<article class="player-row"><form class="player-edit" data-id="'+p.id+'" data-disabled="false">'+Object.entries({...p,group_name:'A',management_role:'',status:'Aktif',performance_label:'Değerlendirilmedi',success_rate:80}).map(([k,v])=>'<input name="'+k+'" value="'+v+'">').join('')+'</form></article>').join('');
   setupFilters(players);var b=el('roster-filters'),d=document.createElement('details');d.innerHTML='<summary>Arama ve filtreler</summary>';Array.from(b.children).forEach(n=>d.appendChild(n));b.appendChild(d);syncRosterChrome();setDashboardPage('roster');
 });
 await page.locator('#roster-filters details').evaluate(e=>e.open=true);
 await page.locator('#search').fill('cuneyt sahin');assert.equal(await page.locator('#roster-list .name-row').count(),1);assert.match(await page.locator('#roster-list').innerText(),/Cüneyt Şahin/);
 assert.equal(await page.locator('#roster-filters #search').count(),1,'single moved search retains events');
 await page.locator('#clear-filters').click();assert.equal(await page.locator('#roster-list .name-row').count(),3);
 await page.locator('[data-filter=position]').selectOption('F');assert.equal(await page.locator('#roster-list .name-row').count(),1);
 await page.locator('#clear-filters').click();await page.locator('#filter-stat').selectOption('goals');await page.locator('#filter-min').fill('5');assert.equal(await page.locator('#roster-list .name-row').count(),1);
 await page.evaluate(()=>{setDashboardPage('hub_home');staffApply()});assert.equal(await page.locator('#birthday-notice').isVisible(),true);assert.equal(await page.locator('#add-player-area').isVisible(),false);
 await page.locator('.roster-search-launch').click();assert.equal(await page.locator('#search').isVisible(),true);assert.equal(await page.locator('#roster-filters details').getAttribute('open'),'');
 await page.evaluate(()=>{entryOpen('match');staffApply();el('birthday-notice').hidden=false});assert.equal(await page.locator('#birthday-notice').isVisible(),false);assert.equal(await page.locator('#add-player-area').isVisible(),false);assert.equal(await page.locator('#roster-filters').isVisible(),false);
 await page.evaluate(async()=>{el('admin-view').classList.add('hidden');el('player-view').classList.remove('hidden');await loadPlayer('one')});
 assert.equal(await page.locator('#player-own-leave').count(),1);assert.match(await page.locator('#player-own-leave').innerText(),/Kişisel izin/);assert.doesNotMatch(await page.locator('#player-own-leave').innerText(),/GİZLİ|Nadim/);
 await page.evaluate(()=>setPlayerPage('stats'));assert.equal(await page.locator('#player-own-leave').isVisible(),false);
 await page.evaluate(()=>setPlayerPage('hub_profile'));assert.equal(await page.locator('#player-own-leave').isVisible(),true);
 await page.evaluate(()=>loadPlayer('two'));assert.match(await page.locator('#player-own-leave').innerText(),/Onaylı izin/);assert.doesNotMatch(await page.locator('#player-own-leave').innerText(),/Kişisel izin|GİZLİ/);
 await page.addScriptTag({content:exporter});
 const plan=await page.evaluate(()=>{
   var people=Array.from({length:35},(_,i)=>({id:String(i),full_name:i===0?'Rahman İsmail Benek':i===1?'Çok Uzun Tam Oyuncu Adı ve Soyadı '+i:'Temsili Oyuncu '+i,jersey_number:i+1,position:['GK','STP','OS','F'][i%4],management_role:i===1?'MKSK Genel Başkan Yardımcısı ve Takım Sorumlusu':'',group_name:'A',status:'Üniversite kaydı donuk',performance_label:'Değerlendirilmedi',player_season_stats:[{season:'2026-2027',matches:10,goals:i,assists:3,goals_conceded:0,man_of_match:1,manager_rating:i===0?null:8,discipline_referrals:0,attendance_matches:5,attendance_goals:2,attendance_points:8}]}));
   window.testRoster=people;var c=el('export'),plan=drawRosterImage(c,people,{season:'2026-2027',date:'TASARIM TESTİ · TEMSİLİ VERİ',team:{matches:10,wins:6,draws:2,losses:2}});return {...plan,url:c.toDataURL('image/png'),columns:rosterColumns.length,values:rosterValues(people[0],'2026-2027'),longName:wrapRosterText(c.getContext('2d'),people[1].full_name,150,26,true).join(' ').replace(/\s/g,'')};
 });
 assert.equal(plan.players,35);assert.equal(plan.columns,17);assert.equal(plan.values.length,17);assert.equal(plan.values[10],'—');assert.equal(plan.longName,'ÇokUzunTamOyuncuAdıveSoyadı1');assert.ok(plan.width*plan.height<=12000000);assert.ok(plan.height<=8192);assert.match(plan.url,/^data:image\/png;base64,/);
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa','roster-layout-test.png'),Buffer.from(plan.url.split(',')[1],'base64'));
 await page.evaluate(async()=>{
   el('player-view').classList.add('hidden');el('admin-view').classList.remove('hidden');setDashboardPage('statistics');el('clear-filters').click();
   window.applyAutoSuccess=async()=>{};window.fetchClubOverview=async()=>({matches:10,wins:6,draws:2,losses:2});window.loadClubLogo=async()=>null;
   const oldFrom=supabase.from;supabase.from=table=>table==='players'?{select(){return this},is(){return Promise.resolve({data:testRoster.map((p,i)=>({...p,id:'p'+(i+1)})),error:null})}}:oldFrom(table);
   await shareStats('team');
 });
 assert.equal(await page.locator('.mobile-roster-preview[open]').count(),1);assert.equal(await page.locator('.mobile-roster-preview img').count(),1);assert.match(await page.locator('.download-roster-image').getAttribute('download'),/\.png$/);assert.equal(await page.locator('.full-roster-image').getAttribute('target'),'_blank');
 await page.locator('.close-roster-image').click();await page.locator('.mobile-roster-preview').waitFor({state:'detached'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['Turkish search','position and numeric filters','clear filters','home search shortcut','birthday only on home','late staff refresh isolation','own leave privacy and navigation','account switch','single PNG with 35 players and all 17 columns','full long names','mobile canvas area','actual share dialog PNG and full-size link'],image:{width:plan.width,height:plan.height,scale:plan.scale}},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
