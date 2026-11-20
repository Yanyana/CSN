/* CSN View — logika UI. Data: web/data/*.json hasil tools/convert.py + curate.py */
const $ = (s) => document.querySelector(s);
const main = $("#main"), side = $("#side");
const cache = {}; // slug -> json
let manifest = null, cur = {view:"home"};

const fmt = (v) => (v === null || v === undefined) ? "" : String(v);
const esc = (v) => fmt(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function para(v){ return esc(v).replace(/\n/g,"<br>"); }

/* ---- i18n: ID / EN ---- */
let LANG = "id";
try { LANG = localStorage.getItem("csn-lang") || "id"; } catch (e) {}
if (LANG !== "en") LANG = "id";
const I18N = {
id: {
  tagline: "Crystal Saga: Nova — cari info & susun build",
  searchPh: "Cari item, monster, quest, NPC, shop… (cth: Fairy Tear)",
  searchBtn: "Cari", nav_home: "Home", nav_calc: "Kalkulator", nav_build: "Panduan Build",
  home_h: "mau cari apa, kawan? ⚔️",
  home_p: "Satu kolom cari untuk 35 sheet: item, monster, quest, NPC, shop, currency, jadwal. Klik hasil untuk lihat detail + tombol cari silang.",
  ex: "contoh:", openGuide: "Buka panduan build", buildPathH: "Path build efisien (ringkas)",
  buildPathP: "1. Quest order 1–747 sampai level 80 → 2. Rebirth 1–3 (total 170 gold, 60 Ice, 60 Brilliance, 10 Void, 10 Heart) → 3. Elite (STR/INT/AGI/END tanpa cap dulu) → 4. Goddess + blessing → 5. Gem T1–T10 → 6. Soul per node → 7. Upgrade murah (Pixie 2070 → Mount → Wings) → 8. Honor harian → 9. Checklist 107 F2P.",
  loadingT: "Hasil cari:", loadingP: "memuat & memindai 35 sheet…", resCount: "hasil untuk",
  grouped: "Dikelompokkan per sheet. Klik baris untuk detail + cari silang.",
  noRes: "Tidak ketemu", noResHint: "Coba kata lebih pendek, cth: “wings”, “shard”, “Torvo”, “Honor”.",
  x1: "🔎 Cari silang sel pertama", closeBtn: "Tutup",
  detailHint: "Cari silang = cari nilai sel pertama di semua sheet (berguna untuk item / monster / NPC).",
  filterPh: "Filter teks…", filterBtn: "Filter", rowsW: "baris", pageW: "Halaman",
  alsoW: "Lihat juga:", allW: "semua", devTime: "jam perangkat",
  foot: "Data dari CSN Systems.xlsx (35 sheet) · UI Bahasa Indonesia · nama game tetap Inggris",
  cPOI_h: "Kalkulator POI / CP", cR: "Recharged (USD → ×100 sen)",
  cShopPOI: "Belanja POI", cShopCP: "Belanja CP",
  cHonor_h: "Kalkulator Honor", cHonor_p: "Ubah attempts per event, total = honor × attempts. Data dari sheet Calcs.",
  cMount_h: "Kalkulator Mount", cMount_p: "Pilih target level mount untuk lihat total PC.",
  pProg_h: "Kalkulator Progression (Gem / Rebirth / Elite)",
  pCur: "Tier sekarang", pTgt: "Tier target", pN: "Jumlah target",
  pTblH: "Biaya per tier (dari sheet)",
  pNote: "Rebirth total: 170 gold + 60 Ice + 60 Brilliance + 10 Void + 10 Heart (1→3). Elite: masukkan target di sheet Elite untuk lihat EXP kumulatif; kalkulator sisa = target − sekarang.",
  gemA: "Dari", gemB: "ke", gemC: "butuh", craftEx: "Contoh biaya craft",
  eP: "Pilih equipment (3029 opsi), level, VIP, dan 4 material. Perhitungan = pendekatan dari sheet: kebutuhan = nilai equipment × multiplier target, peluang = total material / kebutuhan. Angka pasti ikut client game.",
  eEqPh: "ketik cth: Longsword", eCur: "Level sekarang", eVip: "VIP kamu",
  eVal: "nilai", eNeed: "butuh", eYours: "material kamu", eChance: "peluang",
  eReq: "Syarat VIP", eYou: "kamu", eLack: "KURANG", eTgtH: "Target level & syarat",
  bH: "Panduan build efisien ⚔️",
  bP: "Urutan hemat berdasarkan angka sheet. Klaim tier PvP tidak ada — hanya efisiensi biaya.",
  bRebH: "Rebirth 1–3 (angka pasti)", bExpH: "Contoh EXP 1–20", bF2pH: "Checklist F2P (50 pertama)",
  bList: [
    "<b>Ikuti quest sampai 80.</b> {n} baris EXP 1–80 + 744 rute quest.",
    "<b>Rebirth 1–3 sekaligus.</b> Total 170 gold, 60 Ice Shard, 60 Brilliance, 10 Void, 10 Heart. Buff EXP monster +15/20/25%, bonus atribut 100/200/300, +15/30/45 skill point.",
    "<b>Elite: stat tanpa cap dulu</b> (STR/INT/AGI/END +5 per poin), baru PATK/MATK 0,2% dan Crit 0,1% (cap 100). Kejar milestone tiap 100 untuk title + gem.",
    "<b>Goddess sesuai damage.</b> War untuk fisik, Honor/Dawn sesuai kebutuhan. Blessing 1–5 menanjak 10/22/37/57/83 crystal (contoh Wrath). Syarat rank untuk buka lanjutan.",
    "<b>Gem T1–T10 dulu, Divine belakangan.</b> Beyond-T10 butuh shard elemen (Ice, Brilliance, Void, Light, Heart) + gem T10 + T7 pendamping.",
    "<b>Soul per node sampai rank hemat.</b> Cek syarat level karakter per rank + biaya PC/SS/CE/Gold.",
    "<b>Upgrade murah per klik.</b> Pixie mulai Wild Dewplant (total 2070 Xstal) → Dream → Earth Wraith. Mount WarWolf dulu (1500 Xstal). Wings Light +1 saja sebelum kejar tier atas.",
    "<b>Honor harian.</b> Peasant 0 → Vassal 520 → Noble 1378 → Paladin 2626. Klaim wage Coupons + Event Coin tiap hari.",
    "<b>Checklist 107 F2P.</b> Mulai Novice (level 10), Skywing (Light Wings), One-Man Army (mount), Warrior (60), Fearless (80), First Blood (1 Fairy Tear)."
  ]
},
en: {
  tagline: "Crystal Saga: Nova — search info & plan builds",
  searchPh: "Search items, monsters, quests, NPCs, shops… (e.g. Fairy Tear)",
  searchBtn: "Search", nav_home: "Home", nav_calc: "Calculator", nav_build: "Build Guide",
  home_h: "what are you looking for? ⚔️",
  home_p: "One search box for all 35 sheets: items, monsters, quests, NPCs, shops, currencies, schedules. Click a result for details + cross-search.",
  ex: "e.g.:", openGuide: "Open the build guide", buildPathH: "Efficient build path (summary)",
  buildPathP: "1. Quest order 1–747 to level 80 → 2. Rebirth 1–3 (170 gold, 60 Ice, 60 Brilliance, 10 Void, 10 Heart total) → 3. Elite (uncapped STR/INT/AGI/END first) → 4. Goddess + blessings → 5. Gems T1–T10 → 6. Soul per node → 7. Cheap upgrades (Pixie 2070 → Mount → Wings) → 8. Daily Honor → 9. 107 F2P checklist.",
  loadingT: "Search:", loadingP: "loading & scanning 35 sheets…", resCount: "results for",
  grouped: "Grouped by sheet. Click a row for details + cross-search.",
  noRes: "No matches", noResHint: "Try a shorter word, e.g. “wings”, “shard”, “Torvo”, “Honor”.",
  x1: "🔎 Cross-search first cell", closeBtn: "Close",
  detailHint: "Cross-search = look up the first cell value across all sheets (handy for items / monsters / NPCs).",
  filterPh: "Filter text…", filterBtn: "Filter", rowsW: "rows", pageW: "Page",
  alsoW: "See also:", allW: "all", devTime: "device time",
  foot: "Data from CSN Systems.xlsx (35 sheets) · English UI · game names stay in English",
  cPOI_h: "POI / CP Calculator", cR: "Recharged (USD → ×100 cents)",
  cShopPOI: "POI shopping", cShopCP: "CP shopping",
  cHonor_h: "Honor Calculator", cHonor_p: "Edit attempts per event, total = honor × attempts. Data from the Calcs sheet.",
  cMount_h: "Mount Calculator", cMount_p: "Pick a mount target level to see total PC.",
  pProg_h: "Progression Calculator (Gems / Rebirth / Elite)",
  pCur: "Current tier", pTgt: "Target tier", pN: "How many",
  pTblH: "Cost per tier (from sheet)",
  pNote: "Rebirth total: 170 gold + 60 Ice + 60 Brilliance + 10 Void + 10 Heart (1→3). Elite: enter the target in the Elite sheet for cumulative EXP; remaining = target − now.",
  gemA: "From", gemB: "to", gemC: "needed", craftEx: "E.g. cost to craft",
  eP: "Pick equipment (3029 options), level, VIP, and 4 materials. Estimate from the sheet: required = equipment value × target multiplier, chance = your materials / required. Your client shows the exact numbers.",
  eEqPh: "type e.g. Longsword", eCur: "Current level", eVip: "Your VIP",
  eVal: "value", eNeed: "needed", eYours: "your materials", eChance: "chance",
  eReq: "VIP requirement", eYou: "you", eLack: "SHORT", eTgtH: "Target levels & requirements",
  bH: "Efficient build guide ⚔️",
  bP: "Thrifty order backed by sheet numbers. No PvP tier claims — only cost efficiency.",
  bRebH: "Rebirth 1–3 (exact numbers)", bExpH: "EXP sample 1–20", bF2pH: "F2P checklist (first 50)",
  bList: [
    "<b>Follow quests to 80.</b> {n} EXP rows for 1–80 + 744 quest routes.",
    "<b>Rebirth 1–3 in one go.</b> 170 gold, 60 Ice Shard, 60 Brilliance, 10 Void, 10 Heart total. Monster EXP buff +15/20/25%, attribute bonus 100/200/300, +15/30/45 skill points.",
    "<b>Elite: uncapped stats first</b> (STR/INT/AGI/END +5 per point), then PATK/MATK 0.2% and Crit 0.1% (cap 100). Chase a milestone every 100 for titles + gems.",
    "<b>Goddess by damage type.</b> War for physical, Honor/Dawn as needed. Blessings 1–5 cost 10/22/37/57/83 crystals (Wrath example). Rank gates unlock the rest.",
    "<b>Gems T1–T10 first, Divine later.</b> Beyond-T10 needs elemental shards (Ice, Brilliance, Void, Light, Heart) + a T10 gem + companion T7.",
    "<b>Soul per node up to thrifty ranks.</b> Check character-level gates per rank + PC/SS/CE/Gold costs.",
    "<b>Cheap upgrades per click.</b> Pixie from Wild Dewplant (2070 Xstal total) → Dream → Earth Wraith. WarWolf mount first (1500 Xstal). Wings: Light +1 before chasing higher tiers.",
    "<b>Daily Honor.</b> Peasant 0 → Vassal 520 → Noble 1378 → Paladin 2626. Claim Coupons + Event Coin wages daily.",
    "<b>107 F2P checklist.</b> Start Novice (level 10), Skywing (Light Wings), One-Man Army (mount), Warrior (60), Fearless (80), First Blood (1 Fairy Tear)."
  ]
}};
function t(k){ return (I18N[LANG] && I18N[LANG][k]) || I18N.id[k] || k; }
function paintChrome(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.dataset.lang === LANG));
  const set = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
  set('[data-view="home"]', t("nav_home"));
  set('[data-view="calc"]', t("nav_calc"));
  set('[data-view="build"]', t("nav_build"));
  set("#tagline", t("tagline"));
  set("#foot", t("foot"));
  const q = $("#q"); if (q) q.placeholder = t("searchPh");
  const qb = $("#qbtn"); if (qb) qb.textContent = t("searchBtn");
}
async function renderCurrent(){
  if (cur.view === "calc") return goCalc();
  if (cur.view === "build") return goBuild();
  if (cur.view === "search") return doSearch();
  if (cur.view === "sheet"){
    markSide(cur.slug);
    const d = await get(cur.slug);
    if (cur.slug === "howto") return renderHowto(d);
    if (cur.slug === "enchantment") return renderEnchant(d);
    if (cur.slug === "calcs") return goCalc();
    return renderSheet(d);
  }
  return goHome();
}
async function setLang(l){
  LANG = (l === "en") ? "en" : "id";
  try { localStorage.setItem("csn-lang", LANG); } catch (e) {}
  paintChrome();
  await renderCurrent();
}

async function get(slug){
  if (cache[slug]) return cache[slug];
  const r = await fetch("data/" + slug + ".json");
  if (!r.ok) throw new Error("gagal memuat " + slug);
  const j = await r.json();
  cache[slug] = j;
  return j;
}
async function boot(){
  manifest = await (await fetch("data/manifest.json")).json();
  renderSide();
  document.querySelectorAll('.topnav button[data-view]').forEach(b => b.onclick = () => {
    document.querySelectorAll('.topnav button[data-view]').forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    if (b.dataset.view === "home") goHome();
    if (b.dataset.view === "calc") goCalc();
    if (b.dataset.view === "build") goBuild();
  });
  document.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => setLang(b.dataset.lang));
  $("#qbtn").onclick = doSearch;
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
  document.addEventListener("keydown", e => {
    const tag = (document.activeElement || {}).tagName;
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT"){
      e.preventDefault();
      $("#q").focus();
    }
  });
  await setLang(LANG);
}
function renderSide(){
  let h = "";
  for (const [cat, slugs] of Object.entries(manifest.categories)){
    const names = slugs.map(s => {
      const m = manifest.sheets.find(x => x.slug === s);
      return m ? {slug:s, sheet:m.sheet} : null;
    }).filter(Boolean);
    h += `<h3>${esc(cat)}</h3>` + names.map(n =>
      `<button data-slug="${n.slug}">📄 ${esc(n.sheet)}</button>`).join("");
  }
  side.innerHTML = h;
  side.querySelectorAll("button").forEach(b => b.onclick = () => openSheet(b.dataset.slug, b));
}
function markSide(slug){
  side.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.slug === slug));
}
function goHome(){
  cur = {view:"home"};
  main.innerHTML = `
  <div class="panel"><h2>${esc(t("home_h"))}</h2>
    <p class="mut">${esc(t("home_p"))}</p>
    <div class="frow">
      <button class="btn pri" onclick="quick('Fairy Tear')">${esc(t("ex"))} Fairy Tear</button>
      <button class="btn" onclick="quick('Light Wings')">Light Wings</button>
      <button class="btn" onclick="quick('Escort')">Escort</button>
      <button class="btn" onclick="quick('Thorn Necklace')">Thorn Necklace</button>
    </div></div>
  <div class="grid" id="cats"></div>
  <div class="panel"><h2>${esc(t("buildPathH"))}</h2>
    <p>${esc(t("buildPathP"))}
    <button class="btn pri" onclick="goBuild()">${esc(t("openGuide"))}</button></p></div>`;
  const cg = $("#cats");
  cg.innerHTML = Object.entries(manifest.categories).map(([c, slugs]) => `
    <div class="panel"><h2>${esc(c)}</h2>
      <p class="mut small">${slugs.length} sheet</p>
      ${slugs.map(s => {
        const m = manifest.sheets.find(x => x.slug === s);
        return `<button class="btn" style="margin:2px" onclick="openSheet('${s}')">${esc(m ? m.sheet : s)}</button>`;
      }).join("")}</div>`).join("");
}
window.quick = (t) => { $("#q").value = t; doSearch(); };

async function loadAll(){
  const jobs = manifest.sheets.map(m => get(m.slug).catch(() => null));
  return (await Promise.all(jobs)).filter(Boolean);
}
function haystack(row){ return row.map(fmt).join(" \n ").toLowerCase(); }
function inWindow(text, mins){
  // "13:00-13:30, 14:30-15:00" -> true jika mins masuk salah satu rentang
  const re = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  let m, hit = false;
  while ((m = re.exec(text))){
    const a = (+m[1]) * 60 + (+m[2]), b = (+m[3]) * 60 + (+m[4]);
    if (b >= a ? (mins >= a && mins <= b) : (mins >= a || mins <= b)){ hit = true; break; }
  }
  return hit;
}
async function doSearch(){
  const kw = $("#q").value.trim().toLowerCase();
  if (!kw){ goHome(); return; }
  cur = {view:"search", kw};
  main.innerHTML = `<div class="panel"><h2>${esc(t("loadingT"))} “${esc($("#q").value.trim())}”</h2><p class="mut">${esc(t("loadingP"))}</p></div>`;
  const all = await loadAll();
  const out = [];
  for (const d of all){
    if (d.slug === "enchantment"){
      for (const e of (d.equipment || [])){
        if ((e.name + " " + e.value).toLowerCase().includes(kw))
          out.push({slug:d.slug, sheet:d.sheet, title:"Equipment", cells:[e.name, e.value, e.min_tier, e.max_tier], headers:["Equipment", "Value", "Min tier", "Max tier"], tag:"equipment"});
      }
      continue;
    }
    if (d.slug === "howto"){
      for (const s of (d.sections || []))
        for (const [nm, ds] of (s.items || []))
          if ((nm + " " + ds + " " + s.group).toLowerCase().includes(kw))
            out.push({slug:"howto", sheet:"HowTo", title:s.group, cells:[nm, ds], headers:["Nama", "Deskripsi"], tag:"panduan"});
      continue;
    }
    if (d.slug === "calcs"){
      for (const [blk, t] of Object.entries(d)){
        if (!t || !t.rows) continue;
        for (const r of t.rows)
          if (r.join(" ").toLowerCase().includes(kw))
            out.push({slug:"calcs", sheet:"Calcs", title:blk.toUpperCase(), cells:r, headers:t.headers, tag:"kalkulator"});
      }
      continue;
    }
    for (const t of (d.tables || [])){
      for (const r of t.rows){
        if (haystack(r).includes(kw)){
          out.push({slug:d.slug, sheet:d.sheet, title:t.title || t.headers.slice(0,2).join(" · "), cells:r, headers:t.headers, tag:"baris"});
          if (out.length >= 400) break;
        }
      }
      if (out.length >= 400) break;
    }
  }
  const by = {};
  for (const o of out.slice(0, 400)) (by[o.sheet] = by[o.sheet] || []).push(o);
  main.innerHTML = `<div class="panel"><h2>${out.length >= 400 ? "400+" : out.length} ${esc(t("resCount"))} “${esc($("#q").value.trim())}”</h2>
    <p class="mut">${esc(t("grouped"))}</p></div>` +
    (out.length ? Object.entries(by).map(([sh, rows]) => `
      <div class="panel"><h2>${esc(sh)} <span class="tag">${rows.length}</span></h2>
      <table><tbody>${rows.slice(0, 30).map((r, i) => `
        <tr data-g='${i}'><td>${r.cells.slice(0, 4).map(c => esc(String(c)).slice(0, 90)).join(" · ")}</td>
        <td class="mut small">${esc(r.title).slice(0, 60)}</td></tr>`).join("")}</tbody></table>
      </div>`).join("") :
    `<div class="panel"><h2>${esc(t("noRes"))}</h2><p class="mut">${esc(t("noResHint"))}</p></div>`);
  // klik -> detail
  main.querySelectorAll("table").forEach((tbl, ti) => {
    const sh = Object.keys(by)[ti];
    tbl.querySelectorAll("tr").forEach((tr, ri) => {
      tr.onclick = () => showDetail(by[sh][ri]);
    });
  });
}
const RELATED = {
  monsters: ["handbook", "dungeons", "worldboss", "items", "quests"],
  handbook: ["monsters", "items"], items: ["monsters", "dungeons", "worldboss", "quests", "daily"],
  quests: ["monsters", "items", "daily", "f2p"], dungeons: ["monsters", "items", "worldboss"],
  worldboss: ["monsters", "items", "dungeons"], daily: ["quests", "items", "worldboss", "theme"],
  skills: ["levels", "elite", "goddess", "guild"], levels: ["skills", "elite", "f2p", "quests"],
  elite: ["levels", "skills", "titles"], goddess: ["skills", "soul", "items"],
  soul: ["goddess", "gems", "sperions"], gems: ["soul", "sperions", "items"],
  sperions: ["soul", "gems", "dungeons"], wings: ["mounts", "pixie", "items"],
  mounts: ["wings", "pixie", "items"], pixie: ["mounts", "wings", "items"],
  angeldemon: ["handbook", "items"], fragarach: ["dungeons", "items"],
  dragonsoul: ["items", "dungeons", "worldboss"], guild: ["guildevents", "honor"],
  guildevents: ["guild", "daily"], theme: ["daily", "items", "vip"],
  ladder: ["jungle", "dungeons", "items"], jungle: ["ladder", "monsters", "items"],
  crypt: ["daily", "ladder"], quiz: ["titles", "f2p"], honor: ["titles", "guild", "f2p"],
  titles: ["f2p", "honor", "quiz"], f2p: ["titles", "quests", "honor"],
  vip: ["theme", "dungeons", "items"], calcs: ["progression", "items", "honor"],
  progression: ["calcs", "gems", "levels", "elite"], enchantment: ["items", "vip", "dungeons"],
  howto: []
};
function relatedBtns(slug){
  const rel = (RELATED[slug] || []).map(s => {
    const m = manifest.sheets.find(x => x.slug === s);
    return m ? `<button class="btn" style="margin:2px" onclick="openSheet('${s}')">${esc(m.sheet)}</button>` : "";
  }).join("");
  return rel ? `<div class="frow"><span class="mut small">${esc(t("alsoW"))}</span>${rel}</div>` : "";
}
function showDetail(o){
  const cells = o.cells || [];
  const heads = o.headers || [];
  $("#detailCard").innerHTML = `
    <h2>${esc(o.sheet)}</h2>
    <p class="mut small">${esc(o.title || "")} · <span class="tag">${esc(o.tag || "")}</span></p>
    <div class="kv">${cells.map((c, i) => `<b>${esc(heads[i] || ("Kolom " + (i + 1)))}</b><span>${para(c)}</span>`).join("")}</div>
    <div class="frow" style="margin-top:12px">
      <button class="btn pri" id="x1">${esc(t("x1"))}</button>
      <button class="btn" onclick="document.querySelector('#detail').classList.add('hidden')">${esc(t("closeBtn"))}</button>
    </div>
    <p class="mut small">${esc(t("detailHint"))}</p>`;
  $("#detail").classList.remove("hidden");
  $("#x1").onclick = () => {
    $("#detail").classList.add("hidden");
    $("#q").value = String(cells[0] || "").split("\n")[0].slice(0, 60);
    doSearch();
  };
}
document.querySelector("#detail").addEventListener("click", (e) => {
  if (e.target.id === "detail") e.target.classList.add("hidden");
});

window.openSheet = async function(slug, btn){
  markSide(slug);
  const d = await get(slug);
  cur = {view:"sheet", slug, ti:0, f:"", page:0, colf:{}};
  if (slug === "howto") return renderHowto(d);
  if (slug === "enchantment") return renderEnchant(d);
  if (slug === "calcs") return goCalc();
  renderSheet(d);
};
function tableOf(d){ return (d.tables || [])[cur.ti] || {headers:[], rows:[], title:""}; }
function renderSheet(d){
  const tabs = (d.tables || []).map((t, i) =>
    `<button class="btn ${i === cur.ti ? "pri" : ""}" data-ti="${i}">${esc(t.title || ("Tabel " + (i + 1)))} (${t.count})</button>`).join("");
  main.innerHTML = `<div class="panel"><h2>${esc(d.sheet)}</h2>
    ${relatedBtns(d.slug)}
    <div class="frow">${tabs}</div>
    <div class="frow"><input id="ff" placeholder="${esc(t("filterPh"))}" value="${esc(cur.f)}">
    <button class="btn" id="fgo">${esc(t("filterBtn"))}</button>
    <span class="mut small" id="cnt"></span></div>
    <div class="frow" id="facets"></div>
    <div id="tbl"></div><div class="pager" id="pg"></div></div>`;
  main.querySelectorAll("[data-ti]").forEach(b => b.onclick = () => { cur.ti = +b.dataset.ti; cur.page = 0; cur.colf = {}; cur.f = ""; renderSheet(d); });
  const go = () => { cur.f = $("#ff").value.toLowerCase(); cur.page = 0; drawTbl(d); };
  $("#fgo").onclick = go;
  $("#ff").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  buildFacets(d);
  drawTbl(d);
}
function buildFacets(d){
  const tab = tableOf(d);
  const box = $("#facets");
  // faset otomatis: kolom dengan <26 nilai unik
  const fac = [];
  tab.headers.forEach((h, ci) => {
    const vals = [...new Set(tab.rows.map(r => String(r[ci] || "").split("\n")[0]).filter(Boolean))];
    if (vals.length >= 2 && vals.length <= 26 && String(h).length < 40) fac.push({h, ci, vals: vals.slice(0, 26)});
  });
  box.innerHTML = fac.slice(0, 3).map(f =>
    `<select data-ci="${f.ci}"><option value="">${esc(f.h)}: ${esc(t("allW"))}</option>${f.vals.map(v =>
      `<option ${cur.colf[f.ci] === v ? "selected" : ""}>${esc(v.slice(0, 50))}</option>`).join("")}</select>`).join("");
  box.querySelectorAll("select").forEach(s => s.onchange = () => {
    cur.colf[+s.dataset.ci] = s.value || undefined; cur.page = 0; drawTbl(d);
  });
}
function filteredRows(d){
  const tab = tableOf(d);
  return tab.rows.filter(r => {
    if (cur.f && !haystack(r).includes(cur.f)) return false;
    for (const [ci, v] of Object.entries(cur.colf)){
      if (v && String(r[ci] || "").split("\n")[0] !== v) return false;
    }
    return true;
  });
}
function drawTbl(d){
  const tab = tableOf(d);
  const rows = filteredRows(d);
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per));
  cur.page = Math.min(cur.page, pages - 1);
  const sl = rows.slice(cur.page * per, cur.page * per + per);
  $("#cnt").textContent = `${rows.length} / ${tab.count} ${t("rowsW")}`;
  // Penanda LIVE untuk jadwal harian berdasar jam perangkat
  let heads = tab.headers, body = sl, liveIdx = -1;
  if (d.slug === "daily"){
    const wi = tab.headers.findIndex(h => /window/i.test(h));
    if (wi >= 0){
      const now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
      const live = new Set();
      sl.forEach((r, i) => { if (inWindow(String(r[wi] || ""), mins)) live.add(i); });
      if (live.size){
        heads = ["Status", ...tab.headers];
        body = sl.map((r, i) => [live.has(i) ? "🔴 LIVE" : "", ...r]);
        liveIdx = 0;
      }
      const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
      $("#cnt").textContent += ` · ${t("devTime")} ${hh}:${mm}`;
    }
  }
  $("#tbl").innerHTML = `<table><thead><tr>${heads.map(h =>
    `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body.map(r =>
    `<tr>${r.map(c => `<td>${para(String(c)).slice(0, 400)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  $("#tbl").querySelectorAll("tr").forEach((tr, i) => {
    if (!i) return;
    tr.onclick = () => showDetail({sheet:d.sheet, title:t.title, tag:"baris", cells:sl[i - 1], headers:tab.headers});
  });
  void liveIdx;
  // thead row has no handler; fix index: first tr is header
  $("#pg").innerHTML = `<button class="btn" id="pv">‹</button><span>${t("pageW")} ${cur.page + 1} / ${pages}</span><button class="btn" id="nx">›</button>`;
  $("#pv").onclick = () => { cur.page = Math.max(0, cur.page - 1); drawTbl(d); };
  $("#nx").onclick = () => { cur.page = Math.min(pages - 1, cur.page + 1); drawTbl(d); };
}
function renderHowto(d){
  main.innerHTML = `<div class="panel"><h2>${esc(d.sheet)} — peta isi</h2><p class="mut">${esc(d.intro)}</p></div>` +
    d.sections.map(s => `<div class="panel"><h2>${esc(s.group)}</h2>${s.items.map(([n, ds]) =>
      `<div><button class="btn" style="margin:3px" onclick="openSheetByName('${esc(n)}')">${esc(n)}</button>
      <span class="mut small">${esc(ds)}</span></div>`).join("")}</div>`).join("") +
    `<div class="panel"><h2>Tips</h2><ul>${d.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
}
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
window.openSheetByName = async function(name){
  const key = slugify(name);
  const m = manifest.sheets.find(x => {
    const a = slugify(x.slug), b = slugify(x.sheet);
    return a === key || b === key || b.startsWith(key) || key.startsWith(a);
  });
  if (m) openSheet(m.slug);
};

window.goCalc = async function(){
  cur = {view:"calc"};
  const c = await get("calcs");
  main.innerHTML = `
  <div class="panel"><h2>${esc(t("cPOI_h"))}</h2>
    <div class="calc">
      <label>${esc(t("cR"))} <input id="c_r" type="number" value="${c.defaults.recharged}"></label>
      <label>POI / Cent <input id="c_p" type="number" value="${c.defaults.poi_per_cent}"></label>
      <label>Xstals <input id="c_x" type="number" value="${c.defaults.xstals}"></label>
      <label>CP / Xstal <input id="c_c" type="number" value="${c.defaults.cp_per_xstal}"></label>
    </div>
    <div class="result" id="c_out"></div>
    <h3>${esc(t("cShopPOI"))}</h3><div id="c_poi"></div>
    <h3>${esc(t("cShopCP"))}</h3><div id="c_cp"></div></div>
  <div class="panel"><h2>${esc(t("cHonor_h"))}</h2>
    <p class="mut small">${esc(t("cHonor_p"))}</p>
    <div id="c_honor"></div><div class="result" id="c_htot"></div></div>
  <div class="panel"><h2>${esc(t("cMount_h"))}</h2>
    <p class="mut small">${esc(t("cMount_p"))}</p>
    <div class="calc"><label>Target level<input id="c_m" type="number" value="10" min="1" max="20"></label></div>
    <div class="result" id="c_mout"></div><div id="c_mtbl"></div></div>`;
  const upd = () => {
    const r = +$("#c_r").value || 0, p = +$("#c_p").value || 0;
    const x = +$("#c_x").value || 0, cp = +$("#c_c").value || 0;
    $("#c_out").innerHTML = `POI diterima: <b>${(r * 100 * p).toLocaleString()}</b> · CP diterima: <b>${(x * cp).toLocaleString()}</b>`;
    const poi = +($("#c_r").value || 0) * 100 * +($("#c_p").value || 0);
    const cpp = +($("#c_x").value || 0) * +($("#c_c").value || 0);
    $("#c_poi").innerHTML = tbl(c.poi.headers, c.poi.rows.map(rw =>
      [rw[0], rw[1], purch(rw[1], poi)]).filter(rw => rw[0] && !/calculator|shop item/i.test(rw[0])));
    $("#c_cp").innerHTML = tbl(c.cp.headers, c.cp.rows.map(rw =>
      [rw[0], rw[1], purch(rw[1], cpp)]).filter(rw => rw[0] && !/calculator|shop item/i.test(rw[0])));
  };
  const purch = (cost, budget) => {
    const n = parseFloat(cost);
    if (!n || n <= 0) return "—";
    return Math.floor(budget / n).toLocaleString();
  };
  ["c_r","c_p","c_x","c_c"].forEach(id => $("#" + id).oninput = upd);
  upd();
  // honor editor
  const hr = c.honor.rows.filter(r => r[0] && !/event/i.test(r[0]) && !/^\*/.test(r[0]));
  $("#c_honor").innerHTML = `<table><thead><tr><th>Event</th><th>Honor</th><th>Attempts</th><th>Total</th></tr></thead><tbody>` +
    hr.map((r, i) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td>
      <td><input data-i="${i}" type="number" value="${esc(r[2] || 0)}" style="width:70px"></td>
      <td id="ht${i}"></td></tr>`).join("") + `</tbody></table>`;
  const hupd = () => {
    let tot = 0;
    hr.forEach((r, i) => {
      const a = +document.querySelector(`[data-i="${i}"]`).value || 0;
      const v = (parseFloat(r[1]) || 0) * a;
      tot += v;
      $("#ht" + i).innerHTML = `<b>${Math.round(v).toLocaleString()}</b>`;
    });
    $("#c_htot").innerHTML = `Total Honor: <b>${Math.round(tot).toLocaleString()}</b>`;
  };
  document.querySelectorAll("[data-i]").forEach(el => el.oninput = hupd);
  hupd();
  // mount
  const mupd = () => {
    const lv = Math.min(20, Math.max(1, +$("#c_m").value || 1));
    const row = c.mount.rows.find(r => String(r[0]) === String(lv));
    $("#c_mout").innerHTML = row ? `Level ${lv}: total PC <b>${esc(row[1])}</b> (PC/klik ${esc(row[2])})` : "—";
  };
  $("#c_m").oninput = mupd; mupd();
  $("#c_mtbl").innerHTML = tbl(c.mount.headers, c.mount.rows.filter(r => r[0] && !/mount level/i.test(r[0])));
  // progression ringkas
  const p = await get("progression");
  const gemT = (p.tables || []).find(t => /target tier/i.test((t.headers || []).join(" ")));
  existingProgression(gemT);
};
function existingProgression(gemT){
  if (!gemT) return;
  const sec = document.createElement("div");
  sec.className = "panel";
  sec.innerHTML = `<h2>${esc(t("pProg_h"))}</h2>
    <div class="calc">
      <label>${esc(t("pCur"))}<input id="p_cur" type="number" value="4" min="1" max="9"></label>
      <label>${esc(t("pTgt"))}<input id="p_tgt" type="number" value="10" min="2" max="10"></label>
      <label>${esc(t("pN"))}<input id="p_n" type="number" value="5" min="1"></label>
    </div>
    <div class="result" id="p_out"></div>
    <h3>${esc(t("pTblH"))}</h3><div id="p_tbl"></div>
    <p class="mut small">${esc(t("pNote"))}</p>`;
  main.appendChild(sec);
  $("#p_tbl").innerHTML = tbl(gemT.headers, gemT.rows);
  const upd = () => {
    const curT = +$("#p_cur").value || 1, tgt = +$("#p_tgt").value || 2, n = +$("#p_n").value || 1;
    // tiap naik tier butuh 3x gem sebelumnya (3^selisih), pendekatan sheet: 3645 untuk 4->10 x5? tampilkan progresi
    let need = n;
    for (let t = tgt; t > curT; t--) need = need * 3;
    const row = gemT.rows.find(r => String(r[0]) === String(tgt));
    $("#p_out").innerHTML = `${esc(t("gemA"))} T${curT} ${esc(t("gemB"))} T${tgt} × ${n}: ${esc(t("gemC"))} <b>${need.toLocaleString()}</b> gem T${curT}. ` +
      (row ? `${esc(t("craftEx"))} T${tgt}: gold ${esc(row[1])}, crystal ${esc(row[2])} per craft.` : "");
  };
  ["p_cur","p_tgt","p_n"].forEach(id => $("#" + id).oninput = upd);
  upd();
}
function tbl(h, rows){
  return `<table><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(x => `<td>${esc(String(x))}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;
}

window.renderEnchant = async function(d){
  d = d || await get("enchantment");
  markSide("enchantment");
  const mats = d.materials || [];
  const tgts = d.targets || [];
  main.innerHTML = `<div class="panel"><h2>Enchantment Calc</h2>
    <p class="mut small">${esc(t("eP"))}</p>
    <div class="calc">
      <label>Equipment<input id="e_q" placeholder="${esc(t("eEqPh"))}" value="Longsword"><input id="e_eq" list="eqlist"></label>
      <datalist id="eqlist"></datalist>
      <label>${esc(t("eCur"))}<input id="e_cur" type="number" value="1" min="1" max="29"></label>
      <label>${esc(t("eVip"))}<input id="e_vip" type="number" value="0" min="0" max="13"></label>
    </div>
    <div class="calc">
      ${[0, 1, 2, 3].map(i => `<label>Material ${i + 1}<select id="e_m${i}">
        ${mats.map(m => `<option ${i === 0 && /Godina Crystal \[sb0080\]/.test(m.name) ? "selected" : ""}>${esc(m.name)} (${esc(m.value)})</option>`).join("")}
        </select></label>`).join("")}
    </div>
    <div class="result" id="e_out"></div>
    <h3>${esc(t("eTgtH"))}</h3><div id="e_t"></div></div>`;
  const q = $("#e_q"), eq = $("#e_eq"), list = $("#eqlist");
  const refresh = () => {
    const kw = q.value.toLowerCase();
    const hits = d.equipment.filter(e => e.name.toLowerCase().includes(kw)).slice(0, 60);
    list.innerHTML = hits.map(e => `<option value="${esc(e.name)}">`).join("");
    if (hits.length && !d.equipment.some(e => e.name === eq.value)) eq.value = hits[0].name;
    upd();
  };
  const valOf = (name) => {
    const m = mats.find(x => x.name === name.split(" (")[0] || name);
    const raw = (name.match(/\(([^)]+)\)$/) || [])[1];
    return parseFloat(raw || (m && m.value) || 0) || 0;
  };
  const upd = () => {
    const e = d.equipment.find(x => x.name === eq.value) || d.equipment.find(x => x.name.toLowerCase().includes(q.value.toLowerCase())) || d.equipment[0];
    const curL = Math.min(29, Math.max(1, +$("#e_cur").value || 1));
    const tgt = tgts.find(t => String(Math.round(+t.level)) === String(curL + 1)) || tgts[curL];
    const need = (parseFloat(e.value) || 0) * (parseFloat(tgt.req_mult) || 0);
    let sel = 0;
    for (let i = 0; i < 4; i++) sel += valOf($("#e_m" + i).value);
    const ch = need > 0 ? Math.min(100, sel / need * 100) : 0;
    const vipOk = (+$("#e_vip").value || 0) >= (parseFloat(tgt.min_vip) || 0);
    $("#e_out").innerHTML = `Equipment: <b>${esc(e.name)}</b> (${esc(t("eVal"))} ${esc(e.value)})<br>` +
      `Target +${curL + 1}: ${esc(t("eNeed"))} <b>${Math.round(need).toLocaleString()}</b> · ${esc(t("eYours"))} <b>${Math.round(sel).toLocaleString()}</b> · ${esc(t("eChance"))} <b>${ch.toFixed(1)}%</b><br>` +
      `${esc(t("eReq"))} ${esc(tgt.min_vip)} — ${esc(t("eYou"))} ${esc($("#e_vip").value)}: <b>${vipOk ? "OK" : esc(t("eLack"))}</b> · Gold mult ×${esc(tgt.gold_mult)}`;
  };
  q.oninput = refresh;
  ["e_eq","e_cur","e_vip","e_m0","e_m1","e_m2","e_m3"].forEach(id => $("#" + id).onchange = upd);
  ["e_cur","e_vip"].forEach(id => $("#" + id).oninput = upd);
  $("#e_t").innerHTML = tbl(["Level", "Req ×", "Gold ×", "Min VIP"], tgts.map(t => [t.level, t.req_mult, t.gold_mult, t.min_vip]));
  refresh();
};

window.goBuild = async function(){
  cur = {view:"build"};
  const [lv, f2p] = await Promise.all([get("levels"), get("f2p")]);
  const reb = (lv.tables[0] || {}).rows || [];
  const expt = (lv.tables[1] || {}).rows || [];
  const steps = t("bList").map(s => s.replace("{n}", expt.length));
  const links = ["quests", null, "elite", "goddess", "gems", "soul", null, "honor", "f2p"];
  const extra = {6: ` <button class="btn" onclick="openSheet('pixie')">Pixie</button> <button class="btn" onclick="openSheet('mounts')">Mounts</button> <button class="btn" onclick="openSheet('wings')">Wings</button>`};
  const lis = steps.map((s, i) => {
    const nm = {quests: "Quest Guide", elite: "Elite", goddess: "Goddess", gems: "Gems", soul: "Soul", honor: "Honor", f2p: "F2P"}[links[i]];
    const btn = links[i] ? ` <button class="btn" onclick="openSheet('${links[i]}')">${nm}</button>` : "";
    return `<li>${s}${btn}${extra[i] || ""}</li>`;
  }).join("");
  main.innerHTML = `
  <div class="panel"><h2>${esc(t("bH"))}</h2>
    <p class="mut">${esc(t("bP"))}</p>
    <ol>${lis}</ol></div>
  <div class="panel"><h2>${esc(t("bRebH"))}</h2>${tbl((lv.tables[0] || {}).headers || [], reb)}</div>
  <div class="panel"><h2>${esc(t("bExpH"))}</h2>${tbl((lv.tables[1] || {}).headers || [], expt.slice(0, 20))}</div>
  <div class="panel"><h2>${esc(t("bF2pH"))}</h2>${tbl(((f2p.tables || [])[0] || {}).headers || [], ((f2p.tables || [])[0] || {}).rows.slice(0, 50) || [])}</div>`;
};

boot();




