const fields = ["matches","points","goals","assists","man_of_match","goals_conceded","success_rate","attendance_matches","attendance_goals","attendance_points","discipline_referrals"];import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.MKSK_CONFIG;
const $ = (id) => document.getElementById(id);
let supabase;
let currentProfile;
let roster = [];

const labels = { matches:"Maç", points:"Puan", goals:"Gol", assists:"Asist", man_of_match:"Maçın adamı", goals_conceded:"Yenilen gol", success_rate:"Başarı yüzdesi", discipline_referrals:"Disiplin sevk" };
const number = (value) => Number(value || 0);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

function show(view) { ["login-view","player-view","admin-view"].forEach((id) => $(id).classList.toggle("hidden", id !== view)); $("logout").classList.toggle("hidden", view === "login-view"); }
function statValue(stat, key) { return key === "success_rate" ? `${number(stat[key]).toFixed(0)}%` : number(stat[key]); }

async function loadProfile(user) {
  const { data, error } = await supabase.from("profiles").select("role,player_id").eq("id", user.id).single();
  if (error) throw new Error("Bu kullanıcı için yetki kaydı bulunamadı. Yöneticiyle iletişime geçin.");
  currentProfile = data;
}

async function loadPlayerView() {
  const { data, error } = await supabase.from("players").select("*,player_season_stats(*)").eq("id", currentProfile.player_id).single();
  if (error) throw error;
  const stats = data.player_season_stats?.[0] || {};
  $("player-name").textContent = data.full_name;
  $("player-summary").innerHTML = [["Forma no",data.jersey_number || "—"],["Mevki",data.position || "—"],["Maç",statValue(stats,"matches")],["Puan",statValue(stats,"points")]].map(([label,value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("player-stats").innerHTML = Object.entries(labels).map(([key,label]) => `<div class="stat"><span>${label}</span><strong>${statValue(stats,key)}</strong></div>`).join("");
  show("player-view");
}

function editor(player) {
  const stat = player.player_season_stats?.[0] || {};
  const fields = ["matches","points","goals","assists","man_of_match","goals_conceded","success_rate"];
  const inputs = fields.map((field) => `<label>${labels[field]}<input min="0" step="${field === "success_rate" ? "0.1" : "1"}" type="number" name="${field}" value="${number(stat[field])}"></label>`).join("");
  return `<article class="player-row" data-id="${player.id}" data-stat-id="${stat.id || ""}"><div class="player-id"><small>${escapeHtml(player.jersey_number || "—")} · ${escapeHtml(player.position || "Mevki yok")}</small><h3>${escapeHtml(player.full_name)}</h3><small>${escapeHtml(player.status || "Aktif")}</small><button type="button" class="danger delete-player">Oyuncuyu sil</button></div><form class="stats-form">${inputs}<button type="submit">Kaydet</button></form></article>`;
}

async function loadAdminView() {
  const { data, error } = await supabase.from("players").select("*,player_season_stats(*)").order("full_name");
  if (error) throw error;
  roster = data;
  renderRoster();
  show("admin-view");
}
function renderRoster() {
  const query = $("search").value.trim().toLocaleLowerCase("tr");
  $("roster").innerHTML = roster.filter((p) => p.full_name.toLocaleLowerCase("tr").includes(query)).map(editor).join("");
}

async function saveStats(event) {
  event.preventDefault();
  const card = event.target.closest(".player-row");
  const form = new FormData(event.target);
  const payload = Object.fromEntries([...form.entries()].map(([key, value]) => [key, number(value)]));
  payload.player_id = card.dataset.id; payload.season = "2026-2027";
  const { error } = await supabase.from("player_season_stats").upsert(payload, { onConflict:"player_id,season" });
  if (error) { $("admin-message").textContent = error.message; return; }
  $("admin-message").textContent = "İstatistik kaydedildi. Tüm oyuncular güncel veriyi görür.";
  await loadAdminView();
}

async function refresh() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { show("login-view"); return; }
  await loadProfile(user);
  if (currentProfile.role === "admin") await loadAdminView(); else await loadPlayerView();
}
async function addPlayer(event) { event.preventDefault(); const f=new FormData(event.target); const {error}=await supabase.from("players").insert({full_name:f.get("full_name").trim(),jersey_number:f.get("jersey_number")||null,position:f.get("position").trim()||null,status:"Aktif"}); if(error){$("admin-message").textContent=error.message;return;} event.target.reset(); await loadAdminView(); }
async function deletePlayer(button) { const card=button.closest(".player-row"); if(!confirm("Bu oyuncu silinsin mi?"))return; const {error}=await supabase.from("players").delete().eq("id",card.dataset.id); if(error){$("admin-message").textContent=error.message;return;} await loadAdminView(); }
async function shareReport() { const goals=roster.reduce((n,p)=>n+number(p.player_season_stats?.[0]?.goals),0); const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");x.fillStyle="#0b2447";x.fillRect(0,0,1080,1080);x.fillStyle="#f6db31";x.fillRect(0,0,1080,22);x.fillStyle="#fff";x.font="bold 58px Arial";x.fillText("MKSK TAKIM İSTATİSTİKLERİ",65,125);x.font="34px Arial";x.fillText(`Oyuncu: ${roster.length}   Gol: ${goals}`,65,195);x.fillStyle="#f6db31";x.font="bold 34px Arial";x.fillText("GOL KRALLIĞI",65,300);roster.slice().sort((a,b)=>number(b.player_season_stats?.[0]?.goals)-number(a.player_season_stats?.[0]?.goals)).slice(0,5).forEach((p,i)=>{x.fillStyle="#fff";x.font="31px Arial";x.fillText(`${i+1}. ${p.full_name} — ${number(p.player_season_stats?.[0]?.goals)} gol`,65,370+i*65)});const blob=await new Promise(r=>c.toBlob(r,"image/png"));const file=new File([blob],"mksk-istatistik.png",{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:"MKSK Takım İstatistikleri",files:[file]});else{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file.name;a.click();}}

async function start() {
  if (!config?.supabaseUrl || !config?.supabaseAnonKey || config.supabaseUrl.includes("PROJE-ADINIZ")) { $("login-error").textContent = "Bağlantı ayarları henüz eklenmedi."; return; }
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  $("login-form").addEventListener("submit", async (event) => { event.preventDefault(); $("login-error").textContent = ""; const { error } = await supabase.auth.signInWithPassword({ email: $("email").value, password: $("password").value }); if (error) { $("login-error").textContent = "E-posta veya şifre hatalı."; return; } await refresh(); });
  $("logout").addEventListener("click", async () => { await supabase.auth.signOut(); show("login-view"); });
  $("search").addEventListener("input", renderRoster);
  $("roster").addEventListener("submit", saveStats);
  $("roster").addEventListener("click", e=>{if(e.target.closest(".delete-player"))deletePlayer(e.target);});
  $("add-player-form").addEventListener("submit", addPlayer);
  $("share-report").addEventListener("click", shareReport);
  supabase.channel("live-stats").on("postgres_changes", { event:"*", schema:"public", table:"player_season_stats" }, refresh).subscribe();
  await refresh();
}
start();

Object.assign(labels, { attendance_matches:"Antrenman / katılım maçı", attendance_goals:"Antrenman golü", attendance_points:"Antrenman puanı" });


function mkskDownload(canvas,fileName,title){canvas.toBlob(async blob=>{const file=new File([blob],fileName,{type:"image/png"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title,files:[file]});}else{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fileName;a.click();}},"image/png");}
function mkskRosterImage(){const c=document.createElement("canvas"),x=c.getContext("2d"),rows=roster.slice().sort((a,b)=>(a.jersey_number||999)-(b.jersey_number||999)),w=1600,h=220+rows.length*48;c.width=w;c.height=h;x.fillStyle="#fff";x.fillRect(0,0,w,h);x.fillStyle="#0b2447";x.fillRect(0,0,w,82);x.fillStyle="#f6db31";x.fillRect(0,82,w,10);x.fillStyle="#fff";x.font="bold 28px Arial";x.textAlign="center";x.fillText("MECİDİYE KARAHİSAR SPOR KULÜBÜ",w/2,37);x.font="18px Arial";x.fillText("2026-2027 SEZONU TAKIM İSTATİSTİKLERİ",w/2,65);const cols=[[35,330,"OYUNCU"],[365,90,"MEVKİ"],[455,80,"NO"],[535,120,"MAÇ"],[655,120,"GOL"],[775,120,"ASİST"],[895,135,"M. ADAMI"],[1030,150,"YENİLEN GOL"],[1180,150,"PUAN"],[1330,235,"DURUM"]];const cell=(a,b,y,t,bg="#fff")=>{x.fillStyle=bg;x.fillRect(a,y,b,48);x.strokeStyle="#55708f";x.strokeRect(a,y,b,48);x.fillStyle="#102a4e";x.font="bold 15px Arial";x.textAlign="center";x.fillText(String(t??""),a+b/2,y+30);};cols.forEach(q=>cell(q[0],q[1],112,q[2],"#f6db31"));rows.forEach((p,i)=>{const s=p.player_season_stats?.[0]||{},y=160+i*48,bg=i%2?"#edf4fb":"#fff";cell(35,330,y,p.full_name,bg);cell(365,90,y,p.position||"",bg);cell(455,80,y,p.jersey_number||"",bg);cell(535,120,y,number(s.matches),bg);cell(655,120,y,number(s.goals),bg);cell(775,120,y,number(s.assists),bg);cell(895,135,y,number(s.man_of_match),bg);cell(1030,150,y,number(s.goals_conceded),"#ddd");cell(1180,150,y,number(s.points),"#dbeef8");cell(1330,235,y,p.status||"Aktif",bg);});mkskDownload(c,"mksk-takim-listesi.png","MKSK Takım Listesi");}
function mkskRankImage(kind){const info={goals:["GOL KRALLIĞI","goals","GOL",true],assists:["ASİST KRALLIĞI","assists","ASİST",true],most:["EN ÇOK MAÇA ÇIKANLAR","matches","MAÇ",true],least:["EN AZ MAÇA ÇIKANLAR","matches","MAÇ",false]}[kind], [title,key,unit,desc]=info,list=roster.slice().filter(p=>number(p.player_season_stats?.[0]?.[key])>0).sort((a,b)=>desc?number(b.player_season_stats?.[0]?.[key])-number(a.player_season_stats?.[0]?.[key]):number(a.player_season_stats?.[0]?.[key])-number(b.player_season_stats?.[0]?.[key])).slice(0,10),c=document.createElement("canvas"),x=c.getContext("2d");c.width=1080;c.height=1350;x.fillStyle="#0b2447";x.fillRect(0,0,1080,1350);x.fillStyle="#f6db31";x.fillRect(0,0,1080,22);x.fillStyle="#fff";x.font="bold 54px Arial";x.textAlign="center";x.fillText("MKSK",540,120);x.fillStyle="#f6db31";x.font="bold 38px Arial";x.fillText(title,540,190);list.forEach((p,i)=>{const y=280+i*88,s=p.player_season_stats?.[0]||{};x.fillStyle=i<3?"#f6db31":"#fff";x.font="bold 32px Arial";x.textAlign="left";x.fillText((i+1)+". "+p.full_name,95,y);x.textAlign="right";x.fillText(number(s[key])+" "+unit,980,y);x.strokeStyle="#6e87a8";x.beginPath();x.moveTo(80,y+27);x.lineTo(1000,y+27);x.stroke();});x.fillStyle="#fff";x.font="24px Arial";x.textAlign="center";x.fillText("Mecidiye Karahisar Spor Kulübü • 2026-2027",540,1270);mkskDownload(c,"mksk-"+kind+".png",title);}
document.addEventListener("click",e=>{if(e.target.id==="share-report")mkskRosterImage();if(e.target.matches(".rank-share"))mkskRankImage(e.target.dataset.rank);});

document.addEventListener("click",e=>{if(e.target.id==="mksk-share-report"){e.preventDefault();mkskRosterImage();}});

function mkskDownload(canvas,fileName,title){canvas.toBlob(async blob=>{const download=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fileName;a.click();};const file=new File([blob],fileName,{type:"image/png"});try{if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title,files:[file]});return;}}catch(error){}download();},"image/png");}
