/* CSN View — logika UI. Data: web/data/*.json hasil tools/convert.py + curate.py */
const $ = (s) => document.querySelector(s);
const main = $("#main"), side = $("#side");
const cache = {}; // slug -> json
let manifest = null, cur = {view:"home"};

const fmt = (v) => (v === null || v === undefined) ? "" : String(v);
const esc = (v) => fmt(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function para(v){ return esc(v).replace(/\n/g,"<br>"); }

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
  goHome();
  document.querySelectorAll(".topnav button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".topnav button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    if (b.dataset.view === "home") goHome();
    if (b.dataset.view === "calc") goCalc();
    if (b.dataset.view === "build") goBuild();
  });
  $("#qbtn").onclick = doSearch;
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
  document.addEventListener("keydown", e => {
    const tag = (document.activeElement || {}).tagName;
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT"){
      e.preventDefault();
      $("#q").focus();
    }
  });
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
  <div class="panel"><h2> mau cari apa, kawan? ⚔️</h2>
    <p class="mut">Satu kolom cari untuk 35 sheet: item, monster, quest, NPC, shop, currency, jadwal. Klik hasil untuk lihat detail + tombol cari silang.</p>
    <div class="frow">
      <button class="btn pri" onclick="quick('Fairy Tear')">contoh: Fairy Tear</button>
      <button class="btn" onclick="quick('Light Wings')">Light Wings</button>
      <button class="btn" onclick="quick('Escort')">Jadwal Escort</button>
      <button class="btn" onclick="quick('Thorn Necklace')">Thorn Necklace</button>
    </div></div>
  <div class="grid" id="cats"></div>
  <div class="panel"><h2>Path build efisien (ringkas)</h2>
    <p>1. Quest order 1–747 sampai level 80 → 2. Rebirth 1–3 (total 170 gold, 60 Ice, 60 Brilliance, 10 Void, 10 Heart) →
    3. Elite (STR/INT/AGI/END tanpa cap dulu) → 4. Goddess + blessing → 5. Gem T1–T10 → 6. Soul per node →
    7. Upgrade murah (Pixie 2070 → Mount → Wings) → 8. Honor harian → 9. Checklist 107 F2P.
    <button class="btn pri" onclick="goBuild()">Buka panduan build</button></p></div>`;
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
  main.innerHTML = `<div class="panel"><h2>Hasil cari: “${esc($("#q").value.trim())}”</h2><p class="mut">memuat & memindai 35 sheet…</p></div>`;
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
  main.innerHTML = `<div class="panel"><h2>${out.length >= 400 ? "400+" : out.length} hasil untuk “${esc($("#q").value.trim())}”</h2>
    <p class="mut">Dikelompokkan per sheet. Klik baris untuk detail + cari silang. Kata yang dicari bulan ini contohnya: Fairy Tear, Light Wings, Escort, Thorn Necklace.</p></div>` +
    (out.length ? Object.entries(by).map(([sh, rows]) => `
      <div class="panel"><h2>${esc(sh)} <span class="tag">${rows.length}</span></h2>
      <table><tbody>${rows.slice(0, 30).map((r, i) => `
        <tr data-g='${i}'><td>${r.cells.slice(0, 4).map(c => esc(String(c)).slice(0, 90)).join(" · ")}</td>
        <td class="mut small">${esc(r.title).slice(0, 60)}</td></tr>`).join("")}</tbody></table>
      </div>`).join("") :
    `<div class="panel"><h2>Tidak ketemu</h2><p class="mut">Coba kata lebih pendek, cth: “wings”, “shard”, “Torvo”, “Honor”.</p></div>`);
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
  return rel ? `<div class="frow"><span class="mut small">Lihat juga:</span>${rel}</div>` : "";
}
function showDetail(o){
  const cells = o.cells || [];
  const heads = o.headers || [];
  $("#detailCard").innerHTML = `
    <h2>${esc(o.sheet)}</h2>
    <p class="mut small">${esc(o.title || "")} · <span class="tag">${esc(o.tag || "")}</span></p>
    <div class="kv">${cells.map((c, i) => `<b>${esc(heads[i] || ("Kolom " + (i + 1)))}</b><span>${para(c)}</span>`).join("")}</div>
    <div class="frow" style="margin-top:12px">
      <button class="btn pri" id="x1">🔎 Cari silang sel pertama</button>
      <button class="btn" onclick="document.querySelector('#detail').classList.add('hidden')">Tutup</button>
    </div>
    <p class="mut small">Cari silang = cari nilai sel pertama di semua sheet (berguna untuk item / monster / NPC).</p>`;
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
    <div class="frow"><input id="ff" placeholder="Filter teks…" value="${esc(cur.f)}">
    <button class="btn" id="fgo">Filter</button>
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
  const t = tableOf(d);
  const box = $("#facets");
  // faset otomatis: kolom dengan <26 nilai unik
  const fac = [];
  t.headers.forEach((h, ci) => {
    const vals = [...new Set(t.rows.map(r => String(r[ci] || "").split("\n")[0]).filter(Boolean))];
    if (vals.length >= 2 && vals.length <= 26 && String(h).length < 40) fac.push({h, ci, vals: vals.slice(0, 26)});
  });
  box.innerHTML = fac.slice(0, 3).map(f =>
    `<select data-ci="${f.ci}"><option value="">${esc(f.h)}: semua</option>${f.vals.map(v =>
      `<option ${cur.colf[f.ci] === v ? "selected" : ""}>${esc(v.slice(0, 50))}</option>`).join("")}</select>`).join("");
  box.querySelectorAll("select").forEach(s => s.onchange = () => {
    cur.colf[+s.dataset.ci] = s.value || undefined; cur.page = 0; drawTbl(d);
  });
}
function filteredRows(d){
  const t = tableOf(d);
  return t.rows.filter(r => {
    if (cur.f && !haystack(r).includes(cur.f)) return false;
    for (const [ci, v] of Object.entries(cur.colf)){
      if (v && String(r[ci] || "").split("\n")[0] !== v) return false;
    }
    return true;
  });
}
function drawTbl(d){
  const t = tableOf(d);
  const rows = filteredRows(d);
  const per = 50, pages = Math.max(1, Math.ceil(rows.length / per));
  cur.page = Math.min(cur.page, pages - 1);
  const sl = rows.slice(cur.page * per, cur.page * per + per);
  $("#cnt").textContent = `${rows.length} / ${t.count} baris`;
  // Penanda LIVE untuk jadwal harian berdasar jam perangkat
  let heads = t.headers, body = sl, liveIdx = -1;
  if (d.slug === "daily"){
    const wi = t.headers.findIndex(h => /window/i.test(h));
    if (wi >= 0){
      const now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
      const live = new Set();
      sl.forEach((r, i) => { if (inWindow(String(r[wi] || ""), mins)) live.add(i); });
      if (live.size){
        heads = ["Status", ...t.headers];
        body = sl.map((r, i) => [live.has(i) ? "🔴 LIVE" : "", ...r]);
        liveIdx = 0;
      }
      const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
      $("#cnt").textContent += ` · jam perangkat ${hh}:${mm}`;
    }
  }
  $("#tbl").innerHTML = `<table><thead><tr>${heads.map(h =>
    `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body.map(r =>
    `<tr>${r.map(c => `<td>${para(String(c)).slice(0, 400)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  $("#tbl").querySelectorAll("tr").forEach((tr, i) => {
    if (!i) return;
    tr.onclick = () => showDetail({sheet:d.sheet, title:t.title, tag:"baris", cells:sl[i - 1], headers:t.headers});
  });
  void liveIdx;
  // thead row has no handler; fix index: first tr is header
  $("#pg").innerHTML = `<button class="btn" id="pv">‹</button><span>Halaman ${cur.page + 1} / ${pages}</span><button class="btn" id="nx">›</button>`;
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
  <div class="panel"><h2>Kalkulator POI / CP</h2>
    <div class="calc">
      <label>Recharged (USD → ×100 sen) <input id="c_r" type="number" value="${c.defaults.recharged}"></label>
      <label>POI / Cent <input id="c_p" type="number" value="${c.defaults.poi_per_cent}"></label>
      <label>Xstals <input id="c_x" type="number" value="${c.defaults.xstals}"></label>
      <label>CP / Xstal <input id="c_c" type="number" value="${c.defaults.cp_per_xstal}"></label>
    </div>
    <div class="result" id="c_out"></div>
    <h3>Belanja POI</h3><div id="c_poi"></div>
    <h3>Belanja CP</h3><div id="c_cp"></div></div>
  <div class="panel"><h2>Kalkulator Honor</h2>
    <p class="mut small">Ubah attempts per event, total = honor × attempts. Data dari sheet Calcs.</p>
    <div id="c_honor"></div><div class="result" id="c_htot"></div></div>
  <div class="panel"><h2>Kalkulator Mount</h2>
    <p class="mut small">Pilih target level mount untuk lihat total PC.</p>
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
  sec.innerHTML = `<h2>Kalkulator Progression (Gem / Rebirth / Elite)</h2>
    <div class="calc">
      <label>Tier sekarang<input id="p_cur" type="number" value="4" min="1" max="9"></label>
      <label>Tier target<input id="p_tgt" type="number" value="10" min="2" max="10"></label>
      <label>Jumlah target<input id="p_n" type="number" value="5" min="1"></label>
    </div>
    <div class="result" id="p_out"></div>
    <h3>Biaya per tier (dari sheet)</h3><div id="p_tbl"></div>
    <p class="mut small">Rebirth total: 170 gold + 60 Ice + 60 Brilliance + 10 Void + 10 Heart (1→3).
    Elite: masukkan target di sheet Elite untuk lihat EXP kumulatif; kalkulator sisa = target − sekarang.</p>`;
  main.appendChild(sec);
  $("#p_tbl").innerHTML = tbl(gemT.headers, gemT.rows);
  const upd = () => {
    const curT = +$("#p_cur").value || 1, tgt = +$("#p_tgt").value || 2, n = +$("#p_n").value || 1;
    // tiap naik tier butuh 3x gem sebelumnya (3^selisih), pendekatan sheet: 3645 untuk 4->10 x5? tampilkan progresi
    let need = n;
    for (let t = tgt; t > curT; t--) need = need * 3;
    const row = gemT.rows.find(r => String(r[0]) === String(tgt));
    $("#p_out").innerHTML = `Dari T${curT} ke T${tgt} × ${n}: butuh <b>${need.toLocaleString()}</b> gem T${curT}. ` +
      (row ? `Contoh biaya craft T${tgt}: gold ${esc(row[1])}, crystal ${esc(row[2])} per craft.` : "");
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
    <p class="mut small">Pilih equipment (3029 opsi), level, VIP, dan 4 material. Perhitungan = pendekatan dari sheet: kebutuhan = nilai equipment × multiplier target, peluang = total material / kebutuhan. Angka pasti ikut client game.</p>
    <div class="calc">
      <label>Equipment<input id="e_q" placeholder="ketik cth: Longsword" value="Longsword"><input id="e_eq" list="eqlist"></label>
      <datalist id="eqlist"></datalist>
      <label>Level sekarang<input id="e_cur" type="number" value="1" min="1" max="29"></label>
      <label>VIP kamu<input id="e_vip" type="number" value="0" min="0" max="13"></label>
    </div>
    <div class="calc">
      ${[0, 1, 2, 3].map(i => `<label>Material ${i + 1}<select id="e_m${i}">
        ${mats.map(m => `<option ${i === 0 && /Godina Crystal \[sb0080\]/.test(m.name) ? "selected" : ""}>${esc(m.name)} (${esc(m.value)})</option>`).join("")}
        </select></label>`).join("")}
    </div>
    <div class="result" id="e_out"></div>
    <h3>Target level & syarat</h3><div id="e_t"></div></div>`;
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
    $("#e_out").innerHTML = `Equipment: <b>${esc(e.name)}</b> (nilai ${esc(e.value)})<br>` +
      `Target +${curL + 1}: butuh <b>${Math.round(need).toLocaleString()}</b> · material kamu <b>${Math.round(sel).toLocaleString()}</b> · peluang <b>${ch.toFixed(1)}%</b><br>` +
      `Syarat VIP ${esc(tgt.min_vip)} — kamu ${esc($("#e_vip").value)}: <b>${vipOk ? "OK" : "KURANG"}</b> · Gold mult ×${esc(tgt.gold_mult)}`;
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
  main.innerHTML = `
  <div class="panel"><h2>Panduan build efisien ⚔️</h2>
    <p class="mut">Urutan hemat berdasarkan angka sheet. Klaim tier PvP tidak ada — hanya efisiensi biaya.</p>
    <ol>
      <li><b>Ikuti quest sampai 80.</b> ${expt.length} baris EXP 1–80 + 744 rute quest. Buka <button class="btn" onclick="openSheet('quests')">Quest Guide</button></li>
      <li><b>Rebirth 1–3 sekaligus.</b> Total 170 gold, 60 Ice Shard, 60 Brilliance, 10 Void, 10 Heart. Buff EXP monster +15/20/25%, bonus atribut 100/200/300, +15/30/45 skill point.</li>
      <li><b>Elite: stat tanpa cap dulu</b> (STR/INT/AGI/END +5 per poin), baru PATK/MATK 0,2% dan Crit 0,1% (cap 100). Kejar milestone tiap 100 untuk title + gem. <button class="btn" onclick="openSheet('elite')">Elite</button></li>
      <li><b>Goddess sesuai damage.</b> War untuk fisik, Honor/Dawn sesuai kebutuhan. Blessing 1–5 menanjak 10/22/37/57/83 crystal (contoh Wrath). Syarat rank untuk buka lanjutan. <button class="btn" onclick="openSheet('goddess')">Goddess</button></li>
      <li><b>Gem T1–T10 dulu, Divine belakangan.</b> Beyond-T10 butuh shard elemen (Ice, Brilliance, Void, Light, Heart) + gem T10 + T7 pendamping. <button class="btn" onclick="openSheet('gems')">Gems</button></li>
      <li><b>Soul per node sampai rank hemat.</b> Cek syarat level karakter per rank + biaya PC/SS/CE/Gold. <button class="btn" onclick="openSheet('soul')">Soul</button></li>
      <li><b>Upgrade murah per klik.</b> Pixie mulai Wild Dewplant (total 2070 Xstal) → Dream → Earth Wraith. Mount WarWolf dulu (1500 Xstal). Wings Light +1 Saja sebelum kejar tier atas. <button class="btn" onclick="openSheet('pixie')">Pixie</button> <button class="btn" onclick="openSheet('mounts')">Mounts</button> <button class="btn" onclick="openSheet('wings')">Wings</button></li>
      <li><b>Honor harian.</b> Peasant 0 → Vassal 520 → Noble 1378 → Paladin 2626. Klaim wage Coupons + Event Coin tiap hari. <button class="btn" onclick="openSheet('honor')">Honor</button></li>
      <li><b>Checklist 107 F2P.</b> Mulai Novice (level 10), Skywing (Light Wings), One-Man Army (mount), Warrior (60), Fearless (80), First Blood (1 Fairy Tear). <button class="btn" onclick="openSheet('f2p')">F2P</button></li>
    </ol></div>
  <div class="panel"><h2>Rebirth 1–3 (angka pasti)</h2>${tbl((lv.tables[0] || {}).headers || [], reb)}</div>
  <div class="panel"><h2>Contoh EXP 1–20</h2>${tbl((lv.tables[1] || {}).headers || [], expt.slice(0, 20))}</div>
  <div class="panel"><h2>Checklist F2P (50 pertama)</h2>${tbl(((f2p.tables || [])[0] || {}).headers || [], ((f2p.tables || [])[0] || {}).rows.slice(0, 50) || [])}</div>`;
};

boot();




