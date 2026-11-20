"""Kurasi khusus: howto, calcs, enchantment (stdlib only)."""
import zipfile, xml.etree.ElementTree as ET, re, json

SRC = "/mnt/DATA/CSN_VIEW/CSN Systems.xlsx"
OUT = "/mnt/DATA/CSN_VIEW/web/data"
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
z = zipfile.ZipFile(SRC)
ss = [''.join(si.itertext()) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]

def cval(c):
    t = c.get("t")
    ve = c.find("m:v", NS)
    vv = ve.text if ve is not None else ""
    inl = c.find("m:is", NS)
    if t == "s":
        try:
            return ss[int(vv)] if vv != "" else ""
        except Exception:
            return vv
    if inl is not None:
        return ''.join(inl.itertext())
    return vv if vv is not None else ""

def cell(idx, col_letters, row):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{idx}.xml"))
    for r in root.findall(".//m:sheetData/m:row", NS):
        if int(r.get("r")) != row:
            continue
        for c in r.findall("m:c", NS):
            if c.get("r") == f"{col_letters}{row}":
                return cval(c).strip()
    return ""

def col(idx, col_letters, r_from, r_to):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{idx}.xml"))
    out = []
    for r in root.findall(".//m:sheetData/m:row", NS):
        rn = int(r.get("r"))
        if rn < r_from or rn > r_to:
            continue
        for c in r.findall("m:c", NS):
            if c.get("r") == f"{col_letters}{rn}":
                v = cval(c).strip()
                if v:
                    out.append((rn, v))
    return out

# ---------- HOWTO ----------
howto = {
    "sheet": "HowTo", "slug": "howto",
    "intro": "Halo Players of Crystal Saga: Nova! Dokumen ini membantu memakai 35 sheet sistem.",
    "sections": [
        {"group": "Kalkulator",
         "items": [["Calcs", "POI, spending points dan Honor."],
                    ["Enchantment Calc", "Banding material enchant, peluang, dan stat."],
                    ["Progression Calcs", "Sintesis gem, material rebirth, kalkulator elite."]]},
        {"group": "Upgrade",
         "items": [["Levels & Rebirth", "EXP karakter dan syarat Rebirth 1-3."],
                    ["Elite", "EXP elite, upgrade, cap break, milestone."],
                    ["Class Skills", "Skill biasa per level dan syarat belajar."],
                    ["Goddess", "Pilihan goddess, blessing, rank."],
                    ["Pixie", "Level pixie, biaya, dan stat."],
                    ["Fragarach Weapon", "Progresi senjata Fragarach."],
                    ["Wings", "Tahap wing dan material per klik."],
                    ["Mounts", "Syarat evolusi mount dan biaya."],
                    ["Soul Development", "Syarat soul dan stat."],
                    ["Angel/Demon", "Evolusi pet angel dan demon."],
                    ["Handbook", "Upgrade handbook dan bonus stat."]]},
        {"group": "Dragon & Gem",
         "items": [["Dragon Soul", "Syarat level dragon soul dan total stat."],
                    ["Gems", "Stat gem, resep sintesis, biaya socket."],
                    ["Guild Lvl/Skills", "Syarat guild dan skill guild."],
                    ["Sperions", "Level sperion, material, dan stat."]]},
        {"group": "Event",
         "items": [["Daily Activities", "Aktivitas harian dan battleground."],
                    ["Crypt", "Panduan event crypt."],
                    ["Daily Quiz", "Bank soal dan jawaban quiz."],
                    ["Crystal Ladder", "Musuh dan reward lantai 1-90+."],
                    ["Monster Jungle", "Stage monster dan drop."],
                    ["Dungeons", "Syarat dungeon dan tabel loot."],
                    ["World Bosses", "Jadwal boss dan reward."],
                    ["Guild Events", "Boss guild, bonfire, Territory War."],
                    ["Theme & Timed Events", "Rotasi tema dan reward track."]]},
        {"group": "Informasi",
         "items": [["Monsters", "Lokasi monster, EXP, peluang bonfire."],
                    ["Quest Guide", "Rute quest, prasyarat, reward sampai level 80."],
                    ["Items, Shops & Currencies", "Sumber item, harga shop, currency."],
                    ["Honor Ranks", "Threshold honor dan wage harian."],
                    ["Titles", "Syarat title dan buff."],
                    ["VIP & Passes", "Threshold VIP dan batas enchant."]]},
    ],
    "tips": ["Klik nama sistem untuk lompat ke sheet itu.",
             "Untuk kalkulator, isi sel input yang diberi label.",
             "Kalau hanya akses view, buat salinan dulu."],
}
with open(f"{OUT}/howto.json", "w") as f:
    json.dump(howto, f, ensure_ascii=False, indent=1)

# ---------- CALCS (sheet2): 4 blok berdampingan ----------
def block(c0, c1, r_from=3, r_to=24):
    root = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))
    grid = {}
    for r in root.findall(".//m:sheetData/m:row", NS):
        rn = int(r.get("r"))
        if rn < r_from or rn > r_to:
            continue
        for c in r.findall("m:c", NS):
            ref = c.get("r")
            m = re.match(r"([A-Z]+)(\d+)", ref)
            letters, rr = m.group(1), int(m.group(2))
            n = 0
            for ch in letters:
                n = n * 26 + ord(ch) - 64
            ci = n - 1
            if c0 <= ci <= c1:
                v = cval(c).strip()
                if v:
                    grid.setdefault(rn, {})[ci] = v
    return grid

g = block(1, 16)
poi_rows, cp_rows, honor_rows, mount_rows = [], [], [], []
for rn in range(4, 24):
    r = g.get(rn, {})
    if r.get(1) or r.get(2) or r.get(3):
        poi_rows.append([r.get(1, ""), r.get(2, ""), r.get(3, "")])
    if r.get(5) or r.get(6) or r.get(7):
        cp_rows.append([r.get(5, ""), r.get(6, ""), r.get(7, "")])
    if r.get(9) or r.get(10) or r.get(11) or r.get(12):
        honor_rows.append([r.get(9, ""), r.get(10, ""), r.get(11, ""), r.get(12, "")])
    if r.get(14) or r.get(15) or r.get(16):
        mount_rows.append([r.get(14, ""), r.get(15, ""), r.get(16, "")])

calcs = {"sheet": "Calcs", "slug": "calcs",
         "poi": {"headers": ["Item/field", "Nilai", "Hasil"], "rows": poi_rows},
         "cp": {"headers": ["Item/field", "Nilai", "Hasil"], "rows": cp_rows},
         "honor": {"headers": ["Event", "Honor", "Attempts", "Total"], "rows": honor_rows},
         "mount": {"headers": ["Mount level", "Total PC", "PC per klik"], "rows": mount_rows},
         "defaults": {"recharged": 100, "poi_per_cent": 3, "xstals": 1000, "cp_per_xstal": 3}}
with open(f"{OUT}/calcs.json", "w") as f:
    json.dump(calcs, f, ensure_ascii=False, indent=1)

# ---------- ENCHANTMENT (sheet3) ----------
root3 = ET.fromstring(z.read("xl/worksheets/sheet3.xml"))
grid3 = {}
for r in root3.findall(".//m:sheetData/m:row", NS):
    rn = int(r.get("r"))
    for c in r.findall("m:c", NS):
        ref = c.get("r")
        m = re.match(r"([A-Z]+)(\d+)", ref)
        letters = m.group(1)
        n = 0
        for ch in letters:
            n = n * 26 + ord(ch) - 64
        grid3[(rn, n - 1)] = cval(c).strip()

def col_letter(l):
    n = 0
    for ch in l:
        n = n * 26 + ord(ch) - 64
    return n - 1

equipment, materials, targets = [], [], []
seen_eq = set()
for rn in range(3, 3100):
    eq = grid3.get((rn, col_letter("I")), "")
    val = grid3.get((rn, col_letter("J")), "")
    if eq and eq not in ("Equipment",) and eq not in seen_eq:
        seen_eq.add(eq)
        equipment.append({"name": eq, "value": val,
                          "min_tier": grid3.get((rn, col_letter("K")), ""),
                          "max_tier": grid3.get((rn, col_letter("L")), "")})
    if len(equipment) >= 2200:
        pass
for rn in range(3, 60):
    m = grid3.get((rn, col_letter("O")), "")
    if m and m != "Material":
        materials.append({"name": m, "value": grid3.get((rn, col_letter("P")), ""),
                          "tier": grid3.get((rn, col_letter("Q")), "")})
for rn in range(3, 40):
    t = grid3.get((rn, col_letter("S")), "")
    if t and t not in ("Target enchant level",):
        try:
            float(t)
        except Exception:
            continue
        targets.append({"level": t,
                        "req_mult": grid3.get((rn, col_letter("T")), ""),
                        "gold_mult": grid3.get((rn, col_letter("U")), ""),
                        "min_vip": grid3.get((rn, col_letter("V")), "")})

enchant = {"sheet": "Enchantment Calc", "slug": "enchantment",
           "form": {"equipment": "Longsword [Lv 1; rarity 4; bb000a]",
                    "current": 1, "vip": 0,
                    "slots": ["Godina Crystal [sb0080]", "[True] Divine Crystal [sb0082]",
                              "Perfect Divine Crystal [sb0080a]", "None"]},
           "equipment": equipment,
           "materials": materials,
           "targets": targets}
with open(f"{OUT}/enchantment.json", "w") as f:
    json.dump(enchant, f, ensure_ascii=False)
print(f"howto sections={len(howto['sections'])}")
print(f"calcs poi={len(poi_rows)} cp={len(cp_rows)} honor={len(honor_rows)} mount={len(mount_rows)}")
print(f"enchant eq={len(equipment)} mat={len(materials)} tgt={len(targets)}")
