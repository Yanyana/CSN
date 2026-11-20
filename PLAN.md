# Perencanaan View CSN — Crystal Saga: Nova

## Goal

Membangun satu view web lokal yang memudahkan pemain mencari informasi
dari `CSN Systems.xlsx` dan menyusun build karakter yang efisien.
Ruang lingkup: 35 sheet, dari kalkulator sampai quest level 80.
Tidak ada backend, tidak ada edit data dari web. Web hanya membaca.

## Success Criteria

- Seorang pemain yang baru buka view bisa menjawab dalam 1 menit:
  di mana dapat item X, syarat level dan biaya Y, jadwal event Z.
- Semua 35 sheet terjangkau lewat satu search global.
  Tidak perlu ingat nama sheet.
- Tiga kalkulator bisa dipakai interaktif:
  `Calcs`, `Enchantment Calc`, `Progression Calcs`.
- Panduan build efisien tersedia:
  jalur level 1-80, rebirth 1-3, prioritas elite,
  pilihan goddess, prioritas gem, soul, dan upgrade murah per klik.
- Tabel besar tetap lancar dibuka:
  `Items` 6630 baris, `Dungeons` 4372 baris,
  `Sperions` 1623, `Monsters` 1146, `Dragon Soul` 1000.
- Teks rusak tampil bersih:
  `Ã—` jadi `×`, `â€”` jadi `—`.

## Approach

### Bukti workspace yang dipakai

Hasil bedah langsung file dengan parser stdlib:

- 35 sheet terkonfirmasi dari `xl/workbook.xml`.
  Nama dan jumlah baris XML sudah dicatat semua.
- Sheet kecil, sedang, dan besar dipetakan.
  Terbesar `Items` 6630, `Dungeons` 4372.
- Struktur multi-tabel dipetakan:
  `Calcs` 4 blok, `Enchantment` form plus 3 tabel,
  `Progression` 3 kalkulator, `Levels` 2 tabel,
  `Elite` 4 tabel, `Goddess` 3 tabel, `Gems` 3 tabel,
  `Guild` 3 tabel, `Dungeons` 2 tabel, `World Bosses` 2 tabel,
  `Theme` 2 tabel, `Items` 3 tabel.
- Kolom kunci tiap sheet dicatat.
  Contoh `Class Skills`: Class, Skill, level skill 1-5,
  gate level, efek, syarat, cooldown, cast, MP.
  5 kelas x 180 baris: Knight, Ranger, Rogue, Mage, Priest.
- Relasi terbukti:
  1039 monster unik di `Monsters`, irisan 11 dengan `Handbook`
  dan 8 dengan `Monster Jungle`.
  144 NPC-map unik di `Quest Guide`.
  107 achievement F2P yang namanya sama dengan `Titles`.
- Keterbatasan data dicatat:
  `Daily Quiz` hanya soal plus kunci, tanpa opsi.
  `Ladder` judul 1-90 tapi data 169 baris.
  Dua mount `n/a`, baris Angel terakhir kosong.

### Bukti eksternal yang dipakai

- Peran kelas diringkas dari sumber independen yang merujuk
  overview resmi mobile: Knight daya tahan jarak dekat,
  Mage damage sihir jarak jauh, Rogue stealth burst,
  Priest healing support, Pixie/Archer busur jarak jauh.
- Metode perbandingan upgrade yang dipakai:
  catat aturan dari layar client, hitung attempt dari
  budget dibagi biaya, bandingkan stat sebelum dan sesudah,
  jangan klaim rate tanpa data client.
- Checklist sesi pertama yang dipakai:
  ikuti Main Quest, catat reward sign-in dan online-time,
  baca deadline event sebelum belanja resource.

### Keputusan IA

Kelompokkan 35 sheet jadi 5 area.
Alasannya: pemain berpikir per kebutuhan, bukan per nama sheet.

1. Kalkulator: `Calcs`, `Enchantment Calc`, `Progression Calcs`.
2. Build karakter: `Levels & Rebirth`, `Elite`, `Class Skills`,
   `Goddess`, `Pixie`, `Soul Development`, `Dragon Soul`,
   `Sperions`, `Gems`, `Guild LvlSkills`.
3. Upgrade dan koleksi: `Fragarach Weapon`, `Wings`, `Mounts`,
   `AngelDemon`, `Handbook`.
4. Aktivitas dan event: `Daily Activities`, `Crypt`, `Daily Quiz`,
   `Crystal Ladder`, `Monster Jungle`, `Dungeons`,
   `World Bosses`, `Guild Events`, `Theme & Timed Events`.
5. Referensi dunia: `Monsters`, `Quest Guide`,
   `Items, Shops & Currencies`, `Honor Ranks`, `Titles`,
   `VIP & Passes`, `F2P Achieve`, `HowTo`.

### Keputusan build efisien

Fokus view build pada yang terbukti dari data:

- Jalur level: quest order 1-747 plus tabel EXP 1-80.
  Pemain lihat quest berikutnya, NPC, reward, dan EXP kumulatif.
- Rebirth 1-3: tampilkan total bahan 170 gold,
  60 Ice, 60 Brilliance, 10 Void, 10 Heart,
  plus buff EXP 15/20/25% dan bonus atribut 100/200/300.
- Elite: pisahkan stat tanpa cap (STR/INT/AGI/END)
  dari stat cap 100 (PATK/MATK 0,2% per poin, dst).
  Tampilkan milestone tiap 100 dan tabel EXP elite.
- Goddess: default tampilkan biaya per level 1-5
  (contoh Wrath 10/22/37/57/83 crystal)
  dan syarat rank untuk buka blessing lanjutan.
- Gem: bedakan T1-T10 biasa, Natural/Magical/Divine,
  dan resep beyond-T10 yang butuh shard elemen.
- Soul: tampilkan syarat level karakter per node
  dan biaya PC/SS/CE/Gold per rank.
- Upgrade murah per klik: Pixie total Xstal per tahap
  (2070 sampai 3372500), Mount Xstal minimum,
  Wings min-max per klik. Ini jadi dasar rekomendasi hemat.
- Honor dan wage harian: tampilkan threshold
  Peasant 0 sampai Viscount 21788 ke atas,
  plus isi Coupons dan Event Coin per rank.
- F2P 107 sebagai checklist, terhubung ke `Titles`.

## Steps

### 1. Pipeline data Excel ke JSON

- Skrip Python stdlib saja, tanpa pip.
  Alasan: mesin ini tidak punya pip atau openpyxl.
  Parser zip plus XML sudah terbukti membaca semua sheet.
- Keluaran: satu JSON per sheet plus satu indeks search.
- Pembersihan wajib:
  perbaiki `Ã—` dan `â€”`,
  normalkan `1.0` jadi `1` untuk level dan ID,
  ubah `No explicit cap`, `Unspecified`, `n/a`, `-`
  jadi label yang jelas di UI.
- Forward-fill nama shop yang ter-merge di `Items`.
- Pisahkan multi-tabel per sheet jadi koleksi bernama.
  Contoh `dungeons.entries` dan `dungeons.loot`.
- Validasi jumlah baris JSON sama dengan hitungan XML.

### 2. Kerangka view statis

- Satu situs statis, tanpa build tool.
  Alasan: repo sekarang hanya berisi xlsx,
  tidak ada toolchain. Vanilla HTML, CSS, JS cukup.
- Struktur halaman:
  home dengan search, halaman kategori,
  halaman daftar per sheet, halaman detail baris,
  3 halaman kalkulator, 1 halaman panduan build.
- Bahasa UI Indonesia.
  Nama item, monster, NPC, dan lokasi tetap Inggris
  sesuai Excel.

### 3. Search global dan faset

- Indeks teks lintas semua kolom nama dan lokasi.
- Hasil dikelompokkan per sheet asal.
- Faset per tipe:
  level, lokasi atau map, shop atau currency,
  sumber (drop, shop, quest, event),
  tradeable, jadwal atau window waktu.
- Contoh uji: `Fairy Tear` harus ketemu
  Title, F2P, dan Item.
  `Light Wings` harus ketemu Wings, Titles, F2P.
  Filter `Class Skills` Knight harus urut level 1-5.
  Filter `Monsters` level 50+ tampil daftar farm.

### 4. Halaman daftar dan detail

- Daftar: tabel ringkas plus pagination 50-100 baris.
  Wajib untuk `Items`, `Dungeons.loot`, `Quest`,
  `Monsters`, `Soul`, `Sperions`, `Dragon Soul`.
- Detail: tampilkan semua kolom sheet itu,
  dengan baris multi-baris dipecah rapi.
- Link silang tahap 1:
  monster ke `Handbook` dan loot dungeon atau boss,
  item ke shop dan sumber drop,
  quest ke NPC-map,
  title ke achievement F2P.

### 5. Tiga kalkulator interaktif

- `Calcs`: form POI, CP, Honor, Mount.
  Rumus meniru nilai sheet.
  Contoh POI 100 x 3 = 30000 harus cocok.
- `Enchant`: pilih equipment dari 1998 baris,
  level sekarang, VIP, 4 slot material.
  Tampilkan syarat material, estimasi gold, peluang,
  dan syarat VIP minimum.
- `Progression`: sintesis gem, kalkulator rebirth,
  kalkulator elite. Tampilkan total bahan dan sisa EXP.

### 6. Halaman panduan build efisien

- Urutan isi:
  pilih kelas, jalur quest 1-80,
  rebirth 1-3, elite prioritas,
  goddess, gem, soul, upgrade murah,
  honor harian, checklist F2P.
- Setiap saran mencantumkan angka dari data.
  Contoh: total shard rebirth, biaya blessing,
  total Xstal pixie, threshold honor.
- Tidak ada klaim tier PvP atau fastest leveling.
  Hanya efisiensi biaya dari data sheet.

### 7. Polish dan uji beban

- Tema gelap sederhana, terbaca di HP dan desktop.
- Tabel besar diuji scroll dan filter.
- Cek jadwal event: Escort dan Plunder tampil benar,
  window 13:00, 14:30, 18:30.
- Cek quiz: hanya tampil soal dan jawaban.

## Validation Plan

- Skrip hitung baris: cocokkan JSON dengan hitungan XML.
  Contoh: Items 6630, Dungeons 4372, Quest 747,
  Monsters 1146, Class Skills 903, Soul 691.
- Uji manual:
  cari `Fairy Tear`, filter Knight level 1-5,
  filter monster level 50+, buka jadwal Escort,
  hitung POI 100 x 3.
- Uji beban: buka halaman Items dan Dungeons loot,
  pastikan filter tetap responsif.
- Uji kalkulator: bandingkan 3 contoh tiap kalkulator
  dengan nilai Excel.
- Bukti yang disimpan: screenshot hasil search
  dan perbandingan angka kalkulator.

## Risks / Open Questions

- Risiko: rumus Excel berupa formula, bukan angka mati.
  Mitigasi: pakai nilai terhitung dan tulis ulang
  rumus sederhana di JS, tandai belum 100% sama.
- Risiko: merge sel dan judul ganda.
  Mitigasi: pisahkan koleksi per tabel saat konversi.
- Risiko: data quiz tanpa opsi.
  Mitigasi: tampilkan sebagai bank soal, bukan kuis.
- Risiko: perbedaan versi browser dan mobile untuk kelas.
  Mitigasi: pakai nama kelas dari data Excel
  (Knight, Ranger, Rogue, Mage, Priest) dan catat
  bila client pemain memakai nama cabang berbeda.
- Pertanyaan terbuka: tidak ada.
  Asumsi default web lokal statis dan tema gelap.

## Sources

- https://crystalsaganova.com/classes/
- https://crystalsaganova.com/guides/beginner.html
- https://crystalsaganova.com/guides/equipment.html
