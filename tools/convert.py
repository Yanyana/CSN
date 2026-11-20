"""Konversi CSN Systems.xlsx -> web/data/*.json (stdlib only)."""
import zipfile, xml.etree.ElementTree as ET, re, json, os

SRC = "/mnt/DATA/CSN_VIEW/CSN Systems.xlsx"
OUT = "/mnt/DATA/CSN_VIEW/web/data"
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

FIXES = {
    "\u00c3\u2014": "\u00d7", "Ã—": "×", "Ã—": "×",
    "â€”": "—", "â€“": "–", "Â": "",
}

def clean(v):
    if v is None:
        return ""
    v = str(v).strip()
    for a, b in [("Ã—", "×"), ("â€”", "—"), ("â€“", "–")]:
        v = v.replace(a, b)
    v = re.sub(r"\s+\n", "\n", v)
    v = re.sub(r"[ \t]+", " ", v)
    return v.strip()

def num_norm(v):
    # "1.0" -> "1" untuk ID/level bulat, tapi pertahankan desimal bermakna
    if re.fullmatch(r"\d+\.0+", v or ""):
        return str(int(float(v)))
    return v

z = zipfile.ZipFile(SRC)
ss = [''.join(si.itertext()) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]

def cell_val(c):
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

def col_idx(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1

def sheet_grid(idx, max_col=45):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{idx}.xml"))
    grid = {}
    maxr = 0
    for row in root.findall(".//m:sheetData/m:row", NS):
        r = int(row.get("r"))
        for c in row.findall("m:c", NS):
            m = re.match(r"([A-Z]+)(\d+)", c.get("r"))
            ci = col_idx(m.group(1))
            if ci >= max_col:
                continue
            v = clean(cell_val(c))
            if v != "":
                grid[(r, ci)] = num_norm(v)
                maxr = max(maxr, r)
    return grid, maxr

wb = ET.fromstring(z.read("xl/workbook.xml"))
sheets = [(sh.get("name"), i + 1) for i, sh in enumerate(wb.findall(".//m:sheet", NS))]

SLUGS = {
    "HowTo": "howto", "Calcs": "calcs", "Enchantment Calc": "enchantment",
    "Progression Calcs": "progression", "Levels & Rebirth": "levels",
    "Elite": "elite", "Class Skills": "skills", "Goddess": "goddess",
    "Pixie": "pixie", "Fragarach Weapon": "fragarach", "Wings": "wings",
    "Mounts": "mounts", "Soul Development": "soul", "AngelDemon": "angeldemon",
    "Handbook": "handbook", "Dragon Soul": "dragonsoul", "Gems": "gems",
    "Guild LvlSkills": "guild", "Sperions": "sperions",
    "Daily Activities": "daily", "Crypt": "crypt", "Daily Quiz": "quiz",
    "Crystal Ladder": "ladder", "Monster Jungle": "jungle",
    "Dungeons": "dungeons", "World Bosses": "worldboss",
    "Guild Events": "guildevents", "Theme & Timed Events": "theme",
    "Monsters": "monsters", "Quest Guide": "quests",
    "Items, Shops & Currencies": "items", "Honor Ranks": "honor",
    "Titles": "titles", "VIP & Passes": "vip", "F2P Achieve": "f2p",
}

CATS = {
    "Kalkulator": ["calcs", "enchantment", "progression"],
    "Build Karakter": ["levels", "elite", "skills", "goddess", "pixie", "soul",
                        "dragonsoul", "sperions", "gems", "guild"],
    "Upgrade & Koleksi": ["fragarach", "wings", "mounts", "angeldemon", "handbook"],
    "Aktivitas & Event": ["daily", "crypt", "quiz", "ladder", "jungle",
                           "dungeons", "worldboss", "guildevents", "theme"],
    "Referensi Dunia": ["monsters", "quests", "items", "honor", "titles",
                         "vip", "f2p", "howto"],
}

os.makedirs(OUT, exist_ok=True)

def split_tables(grid, maxr, max_col=45):
    """Pecah grid jadi tabel berdasarkan baris judul + header."""
    rows = []
    for r in range(1, maxr + 1):
        vals = [grid.get((r, c), "") for c in range(max_col)]
        # buang kolom A yang selalu kosong
        vals = vals[1:]
        if any(vals):
            rows.append((r, vals))
    tables = []
    cur = {"title": "", "headers": [], "rows": [], "from_row": None}
    def flush():
        if cur["headers"] and cur["rows"]:
            # buang kolom kosong di kanan
            w = max(len(h) for h in [cur["headers"]] + cur["rows"])
            tables.append({"title": cur["title"], "headers": cur["headers"][:w],
                            "rows": cur["rows"], "count": len(cur["rows"])})
    i = 0
    while i < len(rows):
        r, vals = rows[i]
        non = [v for v in vals if v]
        # kandidat judul: 1-2 sel terisi singkat + baris berikut ramai
        if len(non) <= 2 and (i + 1 < len(rows)):
            _, nxt = rows[i + 1]
            nxt_non = [v for v in nxt if v]
            if len(nxt_non) >= 3:
                flush()
                cur = {"title": " ".join(non), "headers": [], "rows": [], "from_row": r}
                i += 1
                r2, vals2 = rows[i]
                cur["headers"] = vals2
                i += 1
                continue
        if not cur["headers"]:
            # header langsung tanpa judul (R2 berisi banyak kolom)
            if len(non) >= 4:
                cur = {"title": "", "headers": vals, "rows": [], "from_row": r}
                i += 1
                continue
            i += 1
            continue
        # baris data; jika baris mirip judul seksi (1-2 sel) dan berikut ramai,
        # mulai tabel baru tapi bawa konteks
        if len(non) <= 2 and (i + 1 < len(rows)):
            _, nxt = rows[i + 1]
            if len([v for v in nxt if v]) >= 3:
                flush()
                cur = {"title": " ".join(non), "headers": cur["headers"], "rows": [], "from_row": r}
                i += 1
                continue
        cur["rows"].append(vals)
        i += 1
    flush()
    return tables

manifest = []
for name, idx in sheets:
    slug = SLUGS.get(name, f"sheet{idx}")
    grid, maxr = sheet_grid(idx)
    tables = split_tables(grid, maxr)
    # bersihkan tabel: buang baris kosong sisa & kolom serba kosong
    for t in tables:
        # pangkas kolom yang seluruhnya kosong
        cols = len(t["headers"])
        keep = [c for c in range(cols)
                if any((r[c] if c < len(r) else "") != "" for r in t["rows"])
                or (t["headers"][c] if c < len(t["headers"]) else "") != ""]
        if keep:
            t["headers"] = [t["headers"][c] for c in keep]
            t["rows"] = [[r[c] if c < len(r) else "" for c in keep] for r in t["rows"]]
    path = os.path.join(OUT, f"{slug}.json")
    with open(path, "w") as f:
        json.dump({"sheet": name, "slug": slug, "tables": tables}, f, ensure_ascii=False)
    total = sum(t["count"] for t in tables)
    manifest.append({"sheet": name, "slug": slug, "tables": len(tables), "rows": total})
    print(f"{slug:12s} tabel={len(tables)} baris={total}")

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump({"categories": CATS, "sheets": manifest}, f, ensure_ascii=False, indent=1)
print("OK ->", OUT)
