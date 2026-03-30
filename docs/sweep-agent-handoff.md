# Sweep Agent Handoff

Bu dosya, su anda gercekten calisan Google grid sweep akisini baska bir AI agent'a tek seferde devretmek icin hazirlanmis canonical handoff dokumanidir.

Bu dokumanin amaci:
- calisan sweep mantigini netlestirmek
- baska agent'in gereksiz arastirma yapmadan devam edebilmesini saglamak
- loop'a girmeyi engellemek
- DB'ye ne yazildigini acikca gostermek
- bir sonraki grid'in nasil secilecegini standartlastirmak

Bu dosya baska agent'a dogrudan verilebilir.

---

## 1. Canonical Kaynaklar

Yeni agent once sadece su dosyalari okusun:
1. `docs/sweep-agent-handoff.md`
2. `docs/kas-run-report.md`
3. `scripts/import-google-grid.ts`

Ilk asamada baska dokuman okumasina gerek yok.

---

## 2. Sistem Ne Yapiyor?

Bu sistem, Kas icin `Google Places API` tabanli tek-grid ingestion akisidir.

Temel kural:
- `1 run = 1 grid`
- `1 run = 1 DB write cycle`
- `1 run = 1 report append`
- `run bitince dur`

Bu sistemin amaci bir noktadan baslayip `500m x 500m` kareler halinde mekan toplamak ve veriyi asama asama buyutmektir.

Bu sistem su anda OSM degil, `Google Places API` uzerinden calisir.

---

## 3. Seed Grid Tanimi

Baslangic referansi:
- ad: `Kas Merkez`
- `seed_lat = 36.199383`
- `seed_lng = 29.641333`

Baslangic grid:
- `grid_x = 1`
- `grid_y = 1`
- `grid_key = X1Y1`
- `cell_id = kas-google-grid-x1-y1`

Bu grid, verdigimiz Google Maps referans noktasinin merkez hucresidir.

Grid boyutu:
- `500m x 500m`

Step sabitleri:
- `lat_step = 0.0044915559`
- `lng_step = 0.0055659744`

Grid merkez formulu:
```txt
center_lat = seed_lat + ((grid_y - 1) * lat_step)
center_lng = seed_lng + ((grid_x - 1) * lng_step)
```

Tek grid bbox formulu:
```txt
south = center_lat - (lat_step / 2)
west  = center_lng - (lng_step / 2)
north = center_lat + (lat_step / 2)
east  = center_lng + (lng_step / 2)
```

Bu mantikta:
- `X1Y1` baslangic merkez kare
- `X2Y1` sag komsu
- `X0Y1` sol komsu
- `X1Y2` ust komsu
- `X1Y0` alt komsu

Yonsel hareket kurali:
- right => `X+1, Y`
- left => `X-1, Y`
- up => `X, Y+1`
- down => `X, Y-1`

---

## 4. Script Dosyasi ve Gercek Komut

Calisan script:
- `scripts/import-google-grid.ts`

En temel komut:
```bash
npm run import:google:grid -- --grid-x=1 --grid-y=1
```

Baska grid ornekleri:
```bash
npm run import:google:grid -- --grid-x=2 --grid-y=1
npm run import:google:grid -- --grid-x=1 --grid-y=2
npm run import:google:grid -- --cell-id=kas-google-grid-x2-y1
```

Dry-run:
```bash
npm run import:google:grid -- --grid-x=1 --grid-y=1 --dry-run
```

Desteklenen bayraklar:
- `--grid-x`
- `--grid-y`
- `--grid-key`
- `--cell-id`
- `--center-lat`
- `--center-lng`
- `--cell-size-meters`
- `--limit`
- `--types`
- `--lang`
- `--dry-run`

---

## 5. Sweep Su Anda Neleri Topluyor?

Script her grid icin tek bir Google Places cagrisi degil, birden fazla type ile tarama yapar.

Aktif type listesi su anda sunlar:

### Food & Drink
- `restaurant`
- `cafe`
- `bar`
- `pub`
- `bakery`
- `coffee_shop`
- `breakfast_restaurant`
- `meal_takeaway`
- `meal_delivery`
- `sandwich_shop`
- `seafood_restaurant`
- `turkish_restaurant`

### Stay
- `hotel`
- `guest_house`
- `hostel`
- `bed_and_breakfast`
- `lodging`
- `resort_hotel`
- `motel`
- `inn`

### Tourism & Activity
- `tourist_attraction`
- `museum`
- `art_gallery`
- `marina`
- `park`
- `beach`
- `travel_agency`
- `tour_agency`
- `tourist_information_center`

### Wellness
- `gym`
- `spa`
- `massage`
- `massage_spa`
- `yoga_studio`
- `wellness_center`

### Daily Life
- `pharmacy`
- `beauty_salon`
- `barber_shop`
- `laundry`
- `supermarket`
- `convenience_store`
- `gift_shop`
- `shopping_mall`
- `car_rental`
- `parking`
- `gas_station`

Not:
- Type listesi operator karari olmadan degistirilmemeli.
- Agent kendi basina yeni type eklememeli.

---

## 6. Google'dan Hangi Alanlar Cekiliyor?

Su alanlar Google Places API'den isteniyor ve kullaniliyor:
- `id`
- `displayName`
- `formattedAddress`
- `websiteUri`
- `nationalPhoneNumber`
- `internationalPhoneNumber`
- `location`
- `googleMapsUri`
- `primaryType`
- `types`
- `businessStatus`

DB'ye yazilan kullanisli alanlar:
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `website_raw`
- `phone_raw`
- `category_raw`

Yani bu sweep su anda su bilgileri de toplayabiliyor:
- mekan adi
- koordinat
- adres
- kategori
- website
- telefon

---

## 7. Veritabanina Ne Yaziliyor?

### A. `raw_places`
Her benzersiz Google Place icin `source_name = google_places` olacak sekilde upsert yapilir.

Yazilan alanlar:
- `source_name`
- `source_id`
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `website_raw`
- `phone_raw`
- `category_raw`
- `raw_payload`

`raw_payload.google` icinde su metadata tutulur:
- `place`
- `matchedTypes`
- `cellId`
- `gridX`
- `gridY`
- `gridKey`
- `bbox`

### B. `grid_sweeps`
Her run icin ust seviye bir sweep kaydi olusur.

Burada saklanan temel alanlar:
- `region_name`
- `preset_name = google_single_grid_v2`
- `origin_lat`
- `origin_lng`
- `bbox_*`
- `cell_size_meters`
- `status`
- `processed_cells`
- `successful_cells`
- `failed_cells`

### C. `grid_sweep_cells`
Her run tek grid oldugu icin 1 hucre kaydi eklenir.

Burada saklanan temel alanlar:
- `sweep_id`
- `cell_index = 1`
- `south`
- `west`
- `north`
- `east`
- `status`
- `fetched_count`
- `prepared_count`
- `error_message`
- `started_at`
- `completed_at`

### D. `docs/kas-run-report.md`
Her live run sonunda append-only markdown blok eklenir.

---

## 8. Su Ana Kadar Dogrulanmis Canli Run'lar

### Run 1 - X1Y1
- `grid_key = X1Y1`
- `cell_id = kas-google-grid-x1-y1`
- `status = completed`
- `api_calls = 46`
- `raw_rows_written = 249`
- `fetched = 320`
- `unique_places = 249`
- `failed_types = []`
- bbox:
  - `south = 36.197137`
  - `west = 29.63855`
  - `north = 36.201629`
  - `east = 29.644116`

### Run 2 - X2Y1
- `grid_key = X2Y1`
- `cell_id = kas-google-grid-x2-y1`
- `status = completed`
- `api_calls = 46`
- `raw_rows_written = 27`
- sonraki adaylar:
  - `X3Y1`
  - `X1Y1`
  - `X2Y2`
  - `X2Y0`

Bu iki run da veritabanina yazildi ve `docs/kas-run-report.md` icine append edildi.

---

## 9. Baska Agent Bir Sonraki Grid'i Nasil Secmeli?

Agent yeni grid secerken su sirayi izlemeli:
1. `docs/kas-run-report.md` dosyasindaki son bloğu oku
2. `next_candidates` listesini al
3. zaten islenmis grid varsa ele
4. en mantikli yeni komsuyu sec
5. sadece o gridi isle
6. sonucu raporla ve dur

Pratikte su an bir sonraki mantikli adaylar:
- `X2Y2`
- `X2Y0`
- `X3Y1`

`X1Y1` yeniden secilmemeli cunku zaten islendi.

---

## 10. Anti-Loop Kurallari

Agent sunlari yapamaz:
- ayni run icinde ikinci bir grid islemek
- `while true` benzeri acik uclu loop kurmak
- frontier queue'yu tek run icinde tuketmek
- recursive expansion yapmak
- "hazir buradayken sagdaki gridi de cekeyim" demek
- rapor yazmadan sonraki gride gecmek

Dogru davranis su:
1. hedef gridi sec
2. tek run yap
3. DB'ye yaz
4. markdown rapora append et
5. dur

Bu proje icin en onemli kural budur.

---

## 11. Admin Panelde Nereden Kontrol Edilir?

Admin akisi:
- giris: `/admin`
- sweep ve review ekranı: `/admin/review`
- hero yonetimi: `/admin/hero-slides`

Sweep tarafinda kontrol edilmesi gerekenler:
- yeni `grid_sweeps` kaydi olustu mu
- ilgili `grid_sweep_cells` kaydi olustu mu
- `raw_places` sayisi artti mi
- yeni grid anahtari gorunuyor mu

---

## 12. Operasyon Checklist

Yeni agent her run oncesi bunu uygulasin:
1. `.env.local` icinde `GOOGLE_API_KEY` var mi kontrol et
2. `docs/kas-run-report.md` dosyasinin son blogunu oku
3. bir sonraki gridi sec
4. once gerekirse dry-run al
5. sonra live run yap
6. komut ciktisini kontrol et
7. DB'ye yazildigini dogrula
8. admin panelde gorunurlugu kontrol et
9. sonra dur

---

## 13. Kisa Master Prompt

Baska agent'a dogrudan su prompt verilebilir:

> Sen Kas icin tek-grid Google Places sweep agent'isin.
> Sadece 1 adet `500m x 500m` grid isle ve sonra dur.
> Seed merkez `36.199383, 29.641333` ve ilk grid `X1Y1`'dir.
> Grid sistemi `grid_x` ve `grid_y` ile calisir.
> Right = `X+1,Y`, Left = `X-1,Y`, Up = `X,Y+1`, Down = `X,Y-1`.
> Once `docs/sweep-agent-handoff.md` ve `docs/kas-run-report.md` dosyalarini oku.
> Son bloktaki `next_candidates` listesinden daha once islenmemis 1 grid sec.
> Sadece o gridi `scripts/import-google-grid.ts` ile isle.
> Sonuclari `raw_places`, `grid_sweeps`, `grid_sweep_cells` ve `docs/kas-run-report.md` icine yaz.
> Ayni run icinde ikinci gride gecme.
> Run bitince dur.

---

## 14. Tek Cumlelik Ozet

Bu proje icin sweep, `X1Y1` seed merkezinden baslayan ve her cagrida sadece 1 adet `500m x 500m` Google Places grid'ini isleyip sonucu DB'ye ve markdown rapora yazan kontrollu ingestion akisidir.
