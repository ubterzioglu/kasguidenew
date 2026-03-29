# Kas Grid Sweep - Strict Step-by-Step Runbook

Bu dosya, AI agent'in Kas icin grid sweep yaparken loop'a girmemesi icin hazirlanmis katı operasyon sozlesmesidir.

Ana ilke:
- Agent bir cagrida sadece 1 grid isler.
- 1 grid bittiginde rapor yazar ve durur.
- Sonraki grid baska bir cagrida islenir.
- Agent kendi kendine sinirsiz while-loop, recursive expansion veya acik uclu tarama yapamaz.

Bu dokumanin amaci:
- mevcut gridin sag, sol, ust ve alt komsularini kontrollu sekilde buyutmek
- her gridi veritabanina yazmak
- admin panelde hangi gridin sweep edildigini gostermek
- token biterse ya da agent degisirse kaldigi yerden devam edebilmek

## 1. Temel Kural

Her invocation sadece su isi yapar:
1. bir adet hedef grid sec
2. sadece o gridi tara
3. veriyi `raw_places` tablosuna yaz
4. grid metadata'sini `grid_sweeps` ve `grid_sweep_cells` tablolarina yaz
5. markdown raporu guncelle
6. dur

Agent ayni invocation icinde ikinci gride gecemez.

## 2. Seed Grid

Baslangic merkezi:
- `36.199383, 29.641333`
- ad: `Kas Merkez`

Seed grid:
- `cell_id = kas-google-grid-0001`
- `grid_x = 0`
- `grid_y = 0`

Grid boyutu:
- `500m x 500m`

Grid step degerleri:
- `lat_step = 0.0044915559`
- `lng_step = 0.0055659744`

Merkez hesaplama:
- `center_lat = seed_lat + (grid_y * lat_step)`
- `center_lng = seed_lng + (grid_x * lng_step)`

## 3. Komsu Sira Kurali

Komsu sirasi degismez:
1. right
2. left
3. up
4. down

Anlamlari:
- right = `(x + 1, y)`
- left = `(x - 1, y)`
- up = `(x, y + 1)`
- down = `(x, y - 1)`

Agent bu sirayi bozamaz.

## 4. En Kritik Anti-Loop Kurali

Agent sunlari yapamaz:
- `while true`
- sonsuz frontier expansion
- ayni run icinde birden fazla grid isleme
- rapor yazmadan bir sonraki gride atlama
- "hazir komsu da varken onu da yapayim" davranisi
- queue'yu recursive sekilde tuketme

Dogru davranis su:
- bir grid sec
- isle
- yaz
- raporla
- cik

## 5. Bir Run'da Mecburi Adimlar

Her run tam olarak bu sirayla ilerler.

### Adim 1 - Son durumu oku
Su kaynaklari oku:
- `docs/kas-run-report.md`
- son `grid_sweeps` kayitlari
- son `grid_sweep_cells` kayitlari

Amac:
- hangi gridler tamamlandi?
- hangileri partial kaldi?
- siradaki frontier adayi ne?

### Adim 2 - Hedef grid sec
Secim kurali su:
1. once `pending frontier` varsa onu al
2. yoksa seed gridin komsularini sira ile dene: right, left, up, down
3. daha once `completed` olan gridi asla tekrar secme
4. `failed` olan grid ancak operator acikca isterse tekrar denenir

Bu adimin sonunda tek bir hedef grid belli olmak zorunda.

### Adim 3 - Hedef grid koordinatini hesapla
Gerekli alanlar:
- `grid_x`
- `grid_y`
- `cell_id`
- `center_lat`
- `center_lng`
- `bbox`

BBox tek kare icin merkezden uretilir.

### Adim 4 - Sweep metadata kaydini ac
DB'de sunlari olustur:
- `grid_sweeps` kaydi, `status = running`
- ilgili `grid_sweep_cells` satiri, `status = running`

Admin panel sweepi burada gormeye baslamalidir.

### Adim 5 - Google Places type paketlerini cagir
Sadece tanimli tipler kullanilir.
Agent yeni type uyduramaz.

Varsayilan tip gruplari:
- Food
- Stay
- Tourism Activity
- Wellness
- Daily Life

Her API cagrisi icin:
- hata olursa en fazla 2 retry
- yine olmuyorsa failed type olarak kaydet
- run devam eder

### Adim 6 - Sonuclari tekille
Tekillestirme anahtari:
- `place.id`

Ayni `place.id` tekrar gelirse:
- yeni kayit acilmaz
- mevcut kaydin `matchedTypes` listesi genisletilir

### Adim 7 - Ham veriyi yaz
Her benzersiz kayit `raw_places` tablosuna yazilir.
Zorunlu alanlar:
- `source_name = google_places`
- `source_id = place.id`
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `category_raw`
- `raw_payload.google`

`raw_payload.google` icinde bunlar bulunmali:
- orijinal place nesnesi
- `matchedTypes`
- `cellId`
- `grid_x`
- `grid_y`
- `bbox`

### Adim 8 - Grid sonucunu kapat
Grid status kurali:
- tum type'lar fail ise `failed`
- bazi type'lar fail ise `partial`
- hic fail yoksa `completed`

Sunlari DB'ye yaz:
- fetched count
- unique place count
- inserted row count
- failed type listesi
- started_at
- completed_at

### Adim 9 - Sonraki komsulari hesapla ama isleme
Bu cok onemli.
Agent sadece siradaki frontier adaylarini hesaplar.
Ama onlari bu run icinde islemez.

Hedef gridin komsularini sirayla cikar:
1. right
2. left
3. up
4. down

Her biri icin not dus:
- daha once tamamlanmis mi?
- daha once fail olmus mu?
- yeni aday mi?

Bu bilgi sadece rapora yazilir.

### Adim 10 - Markdown raporu append et ve dur
Dosya:
- `docs/kas-run-report.md`

Run sonunda append edilecek blok:

```md
## Session YYYY-MM-DD HH:mm
- processed_cell: kas-google-grid-0001
- grid_x: 0
- grid_y: 0
- status: completed
- api_calls: 46
- raw_rows_written: 249
- next_candidates:
  - kas-google-grid-0001-right
  - kas-google-grid-0001-left
  - kas-google-grid-0001-up
  - kas-google-grid-0001-down
- note: tek grid islendi, run sonlandirildi
```

Rapor yazildiktan sonra agent durur.

## 6. Run Limiti

Bu dokumanda run limiti serttir:
- maksimum islenecek grid sayisi: `1`
- maksimum toplam sure: `15 dakika`
- maksimum API call: `120`

Limitlerden biri dolarsa agent rapor yazar ve durur.

## 7. Sonraki Grid Nasil Secilecek?

Bir sonraki invocation su mantikla calisir:
1. `docs/kas-run-report.md` dosyasini oku
2. son bloktaki `next_candidates` listesini oku
3. bu adaylarin DB'de zaten islenip islenmedigini kontrol et
4. ilk uygun adayi sec
5. sadece onu isle
6. sonra yeni aday listesini yaz ve dur

Yani buyume vardir ama tek invocation icinde degil, invocation'lar zinciri icindedir.

## 8. Agent'a Verilecek En Net Talimat

Asagidaki blok dogrudan agente verilebilir:

> Sen Kas icin tek-grid sweep agent'isin.
> Her cagrida yalnizca 1 adet 500m x 500m grid isle.
> Baslangic merkezi Kas Merkez: 36.199383, 29.641333.
> Seed grid kas-google-grid-0001'dir.
> Komsu sirasi her zaman right, left, up, down olsun.
> Bir grid tamamlaninca ayni cagrida ikinci gride gecme.
> Google Places verisini raw_places tablosuna yaz.
> Sweep bilgisini grid_sweeps ve grid_sweep_cells tablolarina yaz.
> Session sonunda docs/kas-run-report.md dosyasina rapor append et.
> Sonraki aday gridleri sadece raporla, isleme.
> Raporu yazdiktan sonra dur.

## 9. Operator Notu

Eger agent hala loop'a giriyorsa sorun genelde su olur:
- frontier'i ayni run icinde tuketmeye calismasi
- "hazir buradayken bir komsu daha yapayim" demesi
- raporu session sonunda degil tum frontier bitince yazmaya calismasi

Bu dokuman bunu yasaklar.
Dogru model:
- 1 run = 1 grid
- 1 rapor = 1 grid
- sonra dur

## 10. Onerilen Dosyalar

Agent'a birlikte ver:
- `docs/kas.md` -> bu katı operasyon runbook'u
- `docs/sweep-ne-cekiyor.md` -> teknik arka plan
- `scripts/import-google-grid.ts` -> gercek import implementasyonu

## 11. Sonuc

Bu modelde sistem su sekilde buyur:
- once merkez
- sonra sag
- sonra sol
- sonra ust
- sonra alt
- sonra bir sonraki halka

Ama hicbir zaman tek cagrida sonsuz buyume olmaz.
Buyume kontrollu, raporlu ve yeniden baslatilabilir olur.
