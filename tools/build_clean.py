"""Bangun CSN Systems Clean.xlsx dari file sumber + JSON kurasi (stdlib only).

Prinsip template baru:
- Satu tabel per sheet (tidak ada blok berdampingan / form tercampur data).
- Baris 1 = header bersih, freeze + AutoFilter + Excel Table style.
- Angka murni disimpan sebagai angka; placeholder kosong (n/a, -, Unspecified)
  dikosongkan; "No explicit ..." dipertahankan sebagai teks (bermakna).
- Multi-baris dipertahankan dengan wrap text.
"""
import zipfile, xml.etree.ElementTree as ET, re, json, os
from xml.sax.saxutils import escape

SRC = "/mnt/DATA/CSN_VIEW/CSN Systems.xlsx"
DATA = "/mnt/DATA/CSN_VIEW/web/data"
OUT = "/mnt/DATA/CSN_VIEW/CSN Systems Clean.xlsx"
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

z = zipfile.ZipFile(SRC)
SS = [''.join(si.itertext()) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]

def cval(c):
    t = c.get("t")
    ve = c.find("m:v", NS)
    vv = ve.text if ve is not None else ""
    inl = c.find("m:is", NS)
    if t == "s":
        try:
            return SS[int(vv)] if vv != "" else ""
        except Exception:
            return vv
    if inl is not None:
        return ''.join(inl.itertext())
    return vv if vv is not None else ""

def letters_to_idx(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1

def src_grid(sheet_idx, maxc=45):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{sheet_idx}.xml"))
    grid = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        rn = int(row.get("r"))
        for c in row.findall("m:c", NS):
            m = re.match(r"([A-Z]+)(\d+)", c.get("r"))
            ci = letters_to_idx(m.group(1))
            if ci < maxc:
                v = cval(c).strip()
                if v:
                    grid[(rn, ci)] = v
    return grid

def J(slug):
    with open(os.path.join(DATA, slug + ".json")) as f:
        return json.load(f)

def fix_text(v):
    v = v.replace("Ã—", "×").replace("â€”", "—").replace("â€“", "–")
    v = re.sub(r"[ \t]+", " ", v).strip()
    return v

NULLS = {"n/a", "N/A", "-", "Unspecified", "unspecified"}

def norm(v):
    """Bersihkan satu nilai sel -> ('n', number) | ('s', text) | None."""
    if v is None:
        return None
    v = fix_text(str(v))
    if v in NULLS:
        return None
    if re.fullmatch(r"[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?", v):
        try:
            f = float(v)
            return ('n', int(f) if f.is_integer() else f)
        except Exception:
            pass
    return ('s', v) if v else None

def norm_row(vals):
    return [norm(v) for v in vals]

# ---------------- Spesifikasi sheet baru ----------------
# Setiap entri: dict(name, notes[list str], headers[list str], rows[list[list raw]])
SPECS = []

def add(name, headers, rows, notes=()):
    SPECS.append({"name": name, "notes": list(notes),
                  "headers": headers, "rows": rows})

def from_json_table(slug, ti, name, notes=()):
    d = J(slug)
    t = d["tables"][ti]
    add(name, t["headers"], t["rows"], notes)

def from_coords(sheet_idx, hrow, r1, r2, c1, c2, name, notes=()):
    """Ambil blok persegi dari sheet sumber. c1/c2 = huruf kolom inklusif."""
    g = src_grid(sheet_idx)
    ci1, ci2 = letters_to_idx(c1), letters_to_idx(c2)
    headers = [g.get((hrow, ci), "") for ci in range(ci1, ci2 + 1)]
    rows = []
    for r in range(r1, r2 + 1):
        vals = [g.get((r, ci), "") for ci in range(ci1, ci2 + 1)]
        if any(vals):
            rows.append(vals)
    add(name, headers, rows, notes)


def build_specs():
    calcs = J("calcs")
    ench = J("enchantment")

    # Kalkulator: 4 blok berdampingan -> 4 sheet
    poi = [r for r in calcs["poi"]["rows"] if r[0] and "calculator" not in r[0].lower() and "shop item" not in r[0].lower()]
    cp = [r for r in calcs["cp"]["rows"] if r[0] and "calculator" not in r[0].lower() and "shop item" not in r[0].lower()]
    honor = [r for r in calcs["honor"]["rows"] if r[0] and r[0] != "Event"]
    mount = [r for r in calcs["mount"]["rows"] if r[0] and "mount level" not in r[0].lower()]
    add("Calc_POI", ["Item", "Cost_POI", "Buyable"], poi,
        ["Isi Recharged & POI/Cent di README contoh: 100 x 3 = 30000 POI."])
    add("Calc_CP", ["Item", "Cost_CP", "Buyable"], cp,
        ["Isi Xstals & CP/Xstal contoh: 1000 x 3 = 3000 CP."])
    add("Calc_Honor", ["Event", "Honor", "Attempts", "Total"], honor,
        ["Total = Honor x Attempts. Ubah Attempts sesuai rencanamu."])
    add("Calc_Mount", ["Mount_Level", "Total_PC", "PC_per_Click"], mount)

    # Enchantment: form dipisah, 3 tabel data
    add("Enchant_Equipment",
        ["Equipment", "Value", "Min_Material_Tier", "Max_Material_Tier"],
        [[e["name"], e["value"], e["min_tier"], e["max_tier"]] for e in ench["equipment"]],
        ["Pilih 1 baris sebagai equipment yang ditempa."])
    add("Enchant_Materials", ["Material", "Value", "Tier"],
        [[m["name"], m["value"], m["tier"]] for m in ench["materials"]])
    add("Enchant_Targets",
        ["Target_Level", "Req_Multiplier", "Gold_Multiplier", "Min_VIP"],
        [[t["level"], t["req_mult"], t["gold_mult"], t["min_vip"]] for t in ench["targets"]],
        ["Kebutuhan = Value equipment x Req_Multiplier."])

    # Progression
    from_json_table("progression", 0, "Prog_Gem_Synthesis")
    prog_reb = J("progression")["tables"][1]
    add("Prog_Rebirth_Stages", prog_reb["headers"], prog_reb["rows"],
        ["Total 1->3: 170 Gold, 60 Ice, 60 Brilliance, 10 Void, 10 Heart."])

    # Levels
    from_json_table("levels", 0, "Levels_Rebirth")
    from_json_table("levels", 1, "Levels_EXP_1_80")

    # Elite: blok kiri/kanan + 2 seksi bawah dipisah
    from_coords(6, 3, 4, 21, "B", "D", "Elite_Upgrades",
                ["STR/INT/AGI/END tanpa cap. Sisanya cap 100 poin."])
    from_coords(6, 3, 4, 10, "F", "H", "Elite_Cap_Break")
    from_coords(6, 25, 26, 33, "B", "C", "Elite_Milestones")
    from_json_table("elite", 1, "Elite_EXP")

    # Skills & Goddess
    from_json_table("skills", 0, "Class_Skills")
    from_json_table("goddess", 0, "Goddess_Choices")
    from_json_table("goddess", 1, "Goddess_Ranks")
    from_json_table("goddess", 2, "Goddess_Blessings")

    # Upgrade kecil
    from_json_table("pixie", 0, "Pixie")
    from_json_table("fragarach", 0, "Fragarach_Weapon",
                ["Baris terakhir adalah total Fragneron Shards: 683."])
    from_json_table("mounts", 0, "Mounts",
                ["n/a = tidak ada data (Rabid Raccoon, Baby Turtle)."])
    from_json_table("crypt", 0, "Crypt",
                ["Dua baris terakhir adalah rute probabilitas tertinggi, bukan lantai."])

    # Soul / Wings / DragonSoul: buang kolom catatan tempelan
    soul = J("soul")["tables"][0]
    add("Soul_Development", soul["headers"][:12], [r[:12] for r in soul["rows"]])
    wings = J("wings")["tables"][0]
    keep = [i for i, h in enumerate(wings["headers"]) if h]
    add("Wings", [wings["headers"][i] for i in keep],
        [[r[i] if i < len(r) else "" for i in keep] for r in wings["rows"]],
        ["Kolom material berisi rentang Min - Max per klik."])
    drag = J("dragonsoul")["tables"][0]
    add("Dragon_Soul", drag["headers"][:9], [r[:9] for r in drag["rows"]],
        ["Total dari nol tanpa luck/crit: 74.738 Dragon Cores."])

    # Angel/Demon & Handbook: blok kiri-kanan dipisah
    ad = J("angeldemon")["tables"][0]
    add("Angel_Pets", ad["headers"][:8],
        [[r[i] if i < len(r) else "" for i in range(8)] for r in ad["rows"] if r[0]])
    add("Demon_Pets", ad["headers"][8:16],
        [[r[i] if i < len(r) else "" for i in range(8, 16)] for r in ad["rows"] if len(r) > 8 and r[8]])
    hb = J("handbook")["tables"][0]
    add("Handbook_Monster", hb["headers"][:7],
        [[r[i] if i < len(r) else "" for i in range(7)] for r in hb["rows"] if r[0]])
    add("Handbook_Pet", hb["headers"][7:14],
        [[r[i] if i < len(r) else "" for i in range(7, 14)] for r in hb["rows"] if len(r) > 7 and r[7]])

    # Gems: 4 tabel sudah rapi
    from_json_table("gems", 0, "Gems_T1_T10")
    from_json_table("gems", 1, "Gems_Synthesis")
    from_json_table("gems", 2, "Gems_Beyond_T10")
    from_json_table("gems", 3, "Gems_Beyond_Recipes")

    # Guild: tabel 1 = dua blok (level + kapasitas) -> pisah
    gl = J("guild")["tables"][0]
    add("Guild_Levels", gl["headers"][:7], [r[:7] for r in gl["rows"]])
    add("Guild_Capacity", gl["headers"][7:15], [r[7:15] for r in gl["rows"]])
    from_json_table("guild", 1, "Guild_Skills")

    # Sperions: 3 tabel sudah rapi
    from_json_table("sperions", 0, "Sperion_Levels")
    from_json_table("sperions", 1, "Sperion_Forms")
    from_json_table("sperions", 2, "Sperion_Evolution")

    # Aktivitas
    from_json_table("daily", 0, "Daily_Activities")
    from_json_table("daily", 1, "Daily_Timed_Events")
    from_json_table("quiz", 0, "Daily_Quiz",
                ["Hanya bank soal + kunci jawaban; opsi pilihan tidak ada di sumber."])
    from_json_table("ladder", 0, "Ladder_Floors",
                ["Lantai 1-90 sesuai judul sumber."])
    from_json_table("ladder", 1, "Ladder_Loot")
    from_json_table("jungle", 0, "Jungle_Stages")
    from_json_table("jungle", 1, "Jungle_Drops")
    from_json_table("dungeons", 0, "Dungeons_Entries")
    from_json_table("dungeons", 1, "Dungeons_Loot",
                ["Group roll & bobot = peluang, bukan drop pasti."])
    from_json_table("worldboss", 0, "Boss_Entries")
    from_json_table("worldboss", 1, "Boss_Loot",
                ["Drop turun jika selisih level 5+."])
    from_json_table("guildevents", 0, "Guild_Events")
    from_json_table("guildevents", 1, "Guild_Boss_Growth")

    # Theme: 10 baris rotasi adalah SATU tabel (splitter lama salah potong)
    from_coords(28, 3, 4, 13, "B", "F", "Theme_Rotation")
    from_json_table("theme", 2, "Theme_Reward_Tracks")

    # Monsters: dua blok kolom -> dua sheet
    from_coords(29, 3, 4, 1146, "B", "F", "Monsters")
    from_coords(29, 3, 4, 1146, "H", "L", "Monsters_Best_Farm",
                ["Farm Bonfire terbaik level 50+."])
    from_json_table("quests", 0, "Quest_Guide")

    # Items: 3 tabel sudah rapi
    from_json_table("items", 0, "Items_Currencies")
    from_json_table("items", 1, "Items_Shop_Prices")
    from_json_table("items", 2, "Items_Sources")

    # Referensi lain
    from_json_table("honor", 0, "Honor_Ranks")
    from_json_table("titles", 0, "Titles")
    from_json_table("titles", 1, "Titles_Super")
    from_coords(34, 3, 4, 16, "B", "G", "VIP_Levels")
    from_coords(34, 3, 4, 5, "H", "M", "VIP_Passes")
    from_coords(34, 19, 20, 49, "B", "C", "VIP_Enchant_Req")
    from_json_table("f2p", 0, "F2P_Achievements")


# ---------------- Writer XLSX ----------------
def col_letters(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s

class Strings:
    def __init__(self):
        self.idx = {}
        self.items = []

    def add(self, v):
        if v not in self.idx:
            self.idx[v] = len(self.items)
            self.items.append(v)
        return self.idx[v]

def clean_headers(headers):
    out = []
    seen = {}
    for i, h in enumerate(headers):
        h = fix_text(str(h)) if h else ""
        if not h:
            h = f"Kol_{i + 1}"
        h = re.sub(r"\s+", "_", h.strip())[:60]
        if h in seen:
            seen[h] += 1
            h = f"{h}_{seen[h]}"
        else:
            seen[h] = 1
        out.append(h)
    return out

def prepare(spec, strings):
    """Normalisasi -> (headers, typed_rows, widths, wrap_cols)."""
    headers = clean_headers(spec["headers"])
    w = len(headers)
    typed = []
    for r in spec["rows"]:
        r = list(r) + [""] * (w - len(r))
        typed.append([norm(v) for v in r[:w]])
    widths, wraps = [], set()
    for ci in range(w):
        mx = len(headers[ci])
        for r in typed:
            t = r[ci]
            if t is None:
                continue
            s = str(t[1])
            mx = max(mx, min(len(s), 60))
            if "\n" in s:
                wraps.add(ci)
        widths.append(min(12 + mx * 1.05, 48))
    # simpan string ke pool
    for r in typed:
        for ci, t in enumerate(r):
            if t and t[0] == "s":
                r[ci] = ("s", strings.add(t[1]))
    return headers, typed, widths, wraps

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>\
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>\
<fills count="3"><fill><patternFill patternType="none"/></fill>\
<fill><patternFill patternType="gray125"/></fill>\
<fill><patternFill patternType="solid"><fgColor rgb="FF2F3D6E"/></patternFill></fill></fills>\
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>\
<border><left style="thin"><color rgb="FFB0B8D8"/></left>\
<right style="thin"><color rgb="FFB0B8D8"/></right>\
<top style="thin"><color rgb="FFB0B8D8"/></top>\
<bottom style="thin"><color rgb="FFB0B8D8"/></bottom><diagonal/></border></borders>\
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\
<cellXfs count="3">\
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>\
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">\
<alignment wrapText="1" vertical="top"/></xf>\
</cellXfs></styleSheet>"""

def sheet_xml(name, notes, headers, typed, widths, wraps, table_id):
    hr = len(notes) + 2  # baris header (1 spasi pemisah)
    last = hr + len(typed)
    lastcol = col_letters(len(headers) - 1)
    L = [f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
         f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">']
    L.append(f"<dimension ref=\"A1:{lastcol}{last}\"/>")
    L.append(f'<sheetViews><sheetView workbookViewId="0">'
             f'<pane ySplit="{hr - 1}" topLeftCell="A{hr}" activePane="bottomLeft" state="frozen"/>'
             f"</sheetView></sheetViews>")
    L.append("<cols>" + "".join(
        f'<col min="{i + 1}" max="{i + 1}" width="{widths[i]:.1f}" customWidth="1"/>' for i in range(len(headers))) + "</cols>")
    L.append("<sheetData>")
    rn = 0
    for n in notes:
        rn += 1
        L.append(f'<row r="{rn}"><c r="A{rn}" t="s"><v>{n}</v></c></row>')
    rn += 1  # baris kosong pemisah
    L.append(f"<row r=\"{hr}\">")
    for ci, h in enumerate(headers):
        L.append(f'<c r="{col_letters(ci)}{hr}" t="s" s="1"><v>{h}</v></c>')
    L.append("</row>")
    for r in typed:
        rn += 1
        L.append(f'<row r="{rn}">')
        for ci, t in enumerate(r):
            if t is None:
                continue
            ref = f"{col_letters(ci)}{rn}"
            if t[0] == "s":
                st = ' s="2"' if ci in wraps else ""
                L.append(f'<c r="{ref}" t="s"{st}><v>{t[1]}</v></c>')
            else:
                L.append(f'<c r="{ref}"><v>{t[1]}</v></c>')
        L.append("</row>")
    L.append("</sheetData>")
    if table_id:
        L.append(f'<tableParts count="1"><tablePart r:id="rIdT{table_id}"/></tableParts>')
    L.append("</worksheet>")
    return "".join(L), hr, last

def table_xml(tid, name, hr, last, headers):
    lastcol = col_letters(len(headers) - 1)
    ref = f"A{hr}:{lastcol}{last}"
    cols = "".join(f'<tableColumn id="{i + 1}" name="{escape(h)}"/>' for i, h in enumerate(headers))
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            f'id="{tid}" name="Tbl_{name}" displayName="Tbl_{name}" ref="{ref}">'
            f"<autoFilter ref=\"{ref}\"/>" f"<tableColumns count=\"{len(headers)}\">{cols}</tableColumns>"
            f'<tableStyleInfo name="TableStyleMedium9" showFirstColumn="0" showLastColumn="0" '
            f'showRowStripes="1" showColumnStripes="0"/></table>')

def build():
    strings = Strings()
    prepared = []
    for spec in SPECS:
        headers, typed, widths, wraps = prepare(spec, strings)
        # daftarkan catatan + header SEKARANG agar pool final sebelum SST ditulis
        note_ids = [strings.add(n) for n in spec["notes"]]
        head_ids = [strings.add(h) for h in headers]
        prepared.append((spec, headers, typed, widths, wraps, note_ids, head_ids))
    out = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
    # [Content_Types]
    ov = ['<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
          '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-package.extended-properties+xml"/>']
    for i in range(len(prepared)):
        ov.append(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    for i in range(len(prepared)):
        ov.append(f'<Override PartName="/xl/tables/table{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>')
    out.writestr("[Content_Types].xml",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                 '<Default Extension="xml" ContentType="application/xml"/>' + "".join(ov) + "</Types>")
    out.writestr("_rels/.rels",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                 '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                 '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
                 "</Relationships>")
    # workbook + rels
    sheets_xml = "".join(
        f'<sheet name="{escape(s["name"])}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, s in enumerate([p[0] for p in prepared]))
    out.writestr("xl/workbook.xml",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                 f"<sheets>{sheets_xml}</sheets></workbook>")
    rels = "".join(
        f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>'
        for i in range(len(prepared)))
    rels += ('<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
             '<Relationship Id="rIdSS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>')
    out.writestr("xl/_rels/workbook.xml.rels",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                 + rels + "</Relationships>")
    out.writestr("xl/styles.xml", STYLES)
    # siapkan string catatan README & header (didaftarkan saat prepare -> tulis ulang pool)
    sst = "".join(f"<si><t xml:space=\"preserve\">{escape(s)}</t></si>" for s in strings.items)
    out.writestr("xl/sharedStrings.xml",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                 f'count="{len(strings.items)}" uniqueCount="{len(strings.items)}">{sst}</sst>')
    # sheets + tables (indeks string sudah final dari prepare)
    for i, (spec, headers, typed, widths, wraps, note_ids, head_ids) in enumerate(prepared):
        xml, hr, last = sheet_xml(spec["name"], note_ids, head_ids, typed, widths, wraps, i + 1)
        out.writestr(f"xl/worksheets/sheet{i + 1}.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + xml)
        # rel tabel per sheet
        out.writestr(f"xl/worksheets/_rels/sheet{i + 1}.xml.rels",
                     '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                     f'<Relationship Id="rIdT{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table{i + 1}.xml"/>'
                     "</Relationships>")
        out.writestr(f"xl/tables/table{i + 1}.xml", table_xml(i + 1, re.sub(r"\W", "_", spec["name"]), hr, last, headers))
    out.writestr("docProps/core.xml",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                 'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>CSN Systems Clean</dc:title>'
                 "<dc:creator>CSN View</dc:creator><dc:description>Template rapi CSN Systems.xlsx: satu tabel per sheet.</dc:description></cp:coreProperties>")
    out.writestr("docProps/app.xml",
                 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
                 'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>CSN View</Application></Properties>')
    out.close()
    return len(prepared)

def readme_spec():
    notes = [
        "CSN Systems Clean — template rapi dari CSN Systems.xlsx.",
        "Aturan: satu tabel per sheet, baris 1 area catatan, lalu header + AutoFilter + freeze.",
        "Angka murni = angka. Sel n/a, -, Unspecified dikosongkan.",
        "Teks 'No explicit ...' dipertahankan (artinya: tidak dibatasi / tidak terpicu).",
        "Sel multi-baris memakai wrap text.",
    ]
    rows = [[s["name"], f'{len(s["rows"])} baris'] for s in SPECS]
    return {"name": "README", "notes": notes,
            "headers": ["Sheet_Baru", "Isi_Jumlah_Baris"], "rows": rows}

if __name__ == "__main__":
    build_specs()
    SPECS.insert(0, readme_spec())
    n = build()
    print(f"sheets={n} -> {OUT}")
    for s in SPECS:
        print(f"  {s['name']:22s} {len(s['rows'])}")

