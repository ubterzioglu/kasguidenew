# Sweep V2

Bu dokuman, Kas icin temiz ve yeniden baslatilabilir grid sweep sisteminin tek kaynak tanimidir.

Bu surumun hedefi:
- sadece Google Places API kullanmak
- 500m x 500m tek grid mantigi ile ilerlemek
- her run'da sadece 1 grid islemek
- veriyi `raw_places` tablosuna yazmak
- sweep bilgisini admin panelde gostermek
- AI agent'i veya script'i loop'a sokmamak
- token bitse bile sonraki agent'in kaldigi yerden devam edebilmesini saglamak

Bu dokumanda OSM sweep primary yol degildir.
Bu sistemin ana veri kaynagi Google Places API'dir.

---

## 1. Sistem Ozeti

Sistem su mantikla calisir:
1. bir seed nokta secilir
2. bu nokta etrafinda 500m x 500m hucreler tanimlanir
3. her run'da sadece 1 hucre islenir
4. sonuclar `raw_places` tablosuna yazilir
5. hucre durumu `grid_sweeps` ve `grid_sweep_cells` tablolarina yazilir
6. bir sonraki hucre sadece sonraki run'da islenir

Canonical kural:
- `1 run = 1 grid`
- `1 run = 1 DB write cycle`
- `1 run = 1 report append`
- `run biter bitmez dur`

---

## 2. Sabitler

Seed merkez:
- ad: `Kas Merkez`
- `seed_lat = 36.199383`
- `seed_lng = 29.641333`
- Google Maps referansi:
  `https://www.google.com/maps/place/Ka%C5%9F+Merkez/@36.199383,29.6387527,17z/data=!3m1!4b1!4m6!3m5!1s0x14c1db31676431f9:0x3343d893cd8fd547!8m2!3d36.199383!4d29.641333!16s%2Fg%2F11rvbycq4p`

Grid boyutu:
- `500m x 500m`

Step sabitleri:
- `lat_step = 0.0044915559`
- `lng_step = 0.0055659744`

Seed grid:
- `grid_x = 1`
- `grid_y = 1`
- `grid_key = X1Y1`
- `cell_id = kas-google-grid-x1-y1`
- Bu grid, yukaridaki Google Maps noktasinin merkez hucresidir.

Grid merkez formulu:
```txt
center_lat = seed_lat + ((grid_y - 1) * lat_step)
center_lng = seed_lng + ((grid_x - 1) * lng_step)
```

Bu formulun anlami sununla aynidir:
- `X1Y1` karesinin tam merkezi = baslangic noktasi
- saga gitmek = merkez noktayi `500m` doguya tasimak
- sola gitmek = merkez noktayi `500m` batiya tasimak
- yukari gitmek = merkez noktayi `500m` kuzeye tasimak
- asagi gitmek = merkez noktayi `500m` guneye tasimak

Yani sweep mantigi koze-bazli degil, merkez-bazlidir.
Her grid bir merkez nokta ile tanimlanir.
Her sweep, bu merkez noktanin etrafinda `250m + 250m` alan tarar.
Sonuc olarak her run tam `500m x 500m` kare uretir.

Tek grid bbox formulu:
```txt
south = center_lat - (lat_step / 2)
west  = center_lng - (lng_step / 2)
north = center_lat + (lat_step / 2)
east  = center_lng + (lng_step / 2)
```

Kisa yorum:
- merkezden sola `250m`
- merkezden saga `250m`
- merkezden yukari `250m`
- merkezden asagi `250m`
- toplam alan = `500m x 500m`

---

## 3. Grid Degisken Sistemi

Bu sistemde her hucre iki degiskenle temsil edilir:
- `grid_x`
- `grid_y`

Insan okunur kisa anahtar:
- `grid_key = X{grid_x}Y{grid_y}`

Ornekler:
- baslangic hucre: `X1Y1`
- saga bir hucre: `X2Y1`
- sola bir hucre: `X0Y1`
- yukari bir hucre: `X1Y2`
- asagi bir hucre: `X1Y0`

Makine tarafinda kullanilacak id formati:
- `cell_id = kas-google-grid-x{grid_x}-y{grid_y}`

Ornekler:
- `X1Y1 -> kas-google-grid-x1-y1`
- `X2Y1 -> kas-google-grid-x2-y1`
- `X1Y2 -> kas-google-grid-x1-y2`

Bu yapi sayesinde agent su karari vermek zorunda kalmaz:
- "hangi koordinat hangi yone denk geliyor?"

Cunku kural sabittir.

---

## 4. Yonsel Hareket Kurali

Bir gridden komsu gride gecis tamamen `grid_x` ve `grid_y` degiskenleriyle yapilir.

Kural:
- `right  => (grid_x + 1, grid_y)`
- `left   => (grid_x - 1, grid_y)`
- `up     => (grid_x, grid_y + 1)`
- `down   => (grid_x, grid_y - 1)`

Ornek:
- mevcut grid `X1Y1` ise
- right = `X2Y1`
- left = `X0Y1`
- up = `X1Y2`
- down = `X1Y0`
- `X2Y1`, `X1Y1` merkezinden tam `500m` saga kaymis yeni merkezdir
- bu yeni merkez etrafinda yine `250m` sola ve `250m` saga taranir

Bunlarin merkez koordinatlari formulle hesaplanir:

```txt
center_lat = seed_lat + ((grid_y - 1) * lat_step)
center_lng = seed_lng + ((grid_x - 1) * lng_step)
```

Bu sayede iki koordinat yetiyor:
- `grid_x`
- `grid_y`

---

## 5. Ne Toplaniyor?

Amac: bir grid icindeki olabildigince fazla mekani toplamak.

Google Places tarafinda tek bir sorgu tum mekanlari getirmez.
Bu yuzden grid icin type gruplari kullanilir.

### Group A - Food
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

### Group B - Stay
- `hotel`
- `guest_house`
- `hostel`
- `bed_and_breakfast`
- `lodging`
- `resort_hotel`
- `motel`
- `inn`

### Group C - Tourism
- `tourist_attraction`
- `museum`
- `art_gallery`
- `marina`
- `park`
- `beach`
- `travel_agency`
- `tour_agency`
- `tourist_information_center`

### Group D - Wellness
- `gym`
- `spa`
- `massage`
- `massage_spa`
- `yoga_studio`
- `wellness_center`

### Group E - Daily Life
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

Kural:
- Agent bu listeyi kendi kendine degistiremez.
- Yeni type eklemek operator karariyla olur.

---

## 6. Anti-Loop Kurallari

Bu sistemin en kritik bolumu budur.

Agent sunlari yapamaz:
- ayni run icinde birden fazla grid islemek
- frontier queue'yu ayni run'da tuketmek
- `while true` veya open-ended loop kullanmak
- recursive expansion yapmak
- rapor yazmadan bir sonraki gride gecmek
- "hazir buradayken bir grid daha" demek

Dogru davranis:
1. hedef grid sec
2. o gridi isle
3. DB'ye yaz
4. rapor yaz
5. dur

Bu kural ihlal edilirse sistem kabul edilmez.

---

## 7. Tek Run Akisi

Her run tam olarak bu sira ile ilerler.

### Step 1 - Son durumu oku
Oku:
- `docs/sweep.md`
- `docs/kas-run-report.md`
- son `grid_sweeps` kayitlari
- son `grid_sweep_cells` kayitlari

AmaÃ§:
- hangi gridler tamamlandi?
- hangi gridler fail oldu?
- siradaki aday grid hangisi?

### Step 2 - Hedef grid sec
Secim kurali:
1. once `docs/kas-run-report.md` icindeki son bloktaki `next_candidates` listesini oku
2. listedeki ilk uygun gridi sec
3. eger aday yoksa merkez gridin komsularini kullan: right, left, up, down
4. `completed` olan gridi tekrar secme
5. `failed` olan gridi tekrar secmek icin operator onayi gerekir

Bu adimin sonunda sadece 1 hedef grid olmali.

### Step 3 - Grid geometri bilgisini hesapla
Hesaplanacaklar:
- `grid_x`
- `grid_y`
- `grid_key`
- `cell_id`
- `center_lat`
- `center_lng`
- `bbox`
- `search_radius`

Not:
- Google Nearby Search daire ile arama yapar
- kareyi kapsamak icin yaricap hucreyi saran minimum daireden secilir
- sonra gelen sonuclar tekrar kare bbox icine filtrelenir

### Step 4 - Sweep kaydini ac
DB tarafinda su durum olusturulur:
- `grid_sweeps.status = running`
- `grid_sweep_cells.status = running`

Bu, admin panelin "bu grid su anda sweep ediliyor" diyebilmesi icin zorunludur.

### Step 5 - Google sorgularini cagir
Her type icin:
- Places Nearby Search cagir
- en fazla 2 retry yap
- hala fail ise o type'i `failed_type` olarak not et
- run'i tamamen durdurma

### Step 6 - Sonuclari bbox icine filtrele
Google dairesel arama doner.
Bizim kabul ettigimiz alan tek kare bbox'tir.

Kural:
- bbox disindaki sonuc yazilmaz
- sadece kare icinde kalan sonuc aday kabul edilir

### Step 7 - Tekillestir
Tekillestirme anahtari:
- `place.id`

Ayni `place.id` birden fazla type'ta gelirse:
- tek kayit tutulur
- `matchedTypes` listesi genisletilir

### Step 8 - `raw_places` yaz
Her benzersiz kayit icin:
- `source_name = google_places`
- `source_id = place.id`
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `category_raw`
- `raw_payload.google`

`raw_payload.google` icinde su alanlar zorunludur:
- `place`
- `matchedTypes`
- `cellId`
- `grid_x`
- `grid_y`
- `grid_key`
- `bbox`

### Step 9 - Grid sonucunu kapat
Status kurali:
- tum type'lar fail ise `failed`
- en az bir type fail ise `partial`
- hic fail yoksa `completed`

Yazilacak alanlar:
- `fetched_count`
- `prepared_count`
- `inserted_count`
- `error_message`
- `started_at`
- `completed_at`

### Step 10 - Sonraki adaylari hesapla ama isleme
Hedef gridin komsularini cikar:
1. right
2. left
3. up
4. down

Her biri icin not dus:
- daha once tamamlandi mi?
- daha once fail oldu mu?
- yeni aday mi?

Bu bilgiler sadece rapora yazilir.
Bu run icinde yeni grid islenmez.

### Step 11 - Rapor yaz ve dur
Dosya:
- `docs/kas-run-report.md`

Run sonunda append edilir.
Ardindan run biter.

---

## 8. DB Sozlesmesi

### `raw_places`
Ham veri hedefidir.

Google sweep icin minimum alanlar:
- `source_name = google_places`
- `source_id`
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `category_raw`
- `raw_payload`

### `grid_sweeps`
Run seviyesinde ust metadata tutar.

Minimum alanlar:
- `region_name`
- `preset_name`
- `origin_lat`
- `origin_lng`
- `bbox_south`
- `bbox_west`
- `bbox_north`
- `bbox_east`
- `cell_size_meters`
- `total_cells`
- `processed_cells`
- `successful_cells`
- `failed_cells`
- `status`
- `started_at`
- `completed_at`

Ek Ã¶neri:
- `region_name` icine `grid_key` de eklenebilir
- ornek: `Kas Sweep X1Y1`

### `grid_sweep_cells`
Hucre seviyesinde sonuc tutar.

Minimum alanlar:
- `sweep_id`
- `cell_index`
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

---

## 9. Admin Panel Beklentisi

Admin panel adresi:
- `/admin/review`

Admin panelde gorunmesi gerekenler:
- son sweep kayitlari
- hucre bazli son durum
- hangi gridin sweep edildigi
- `grid_key` veya `cell_id`
- status: `running | completed | partial | failed`
- review bekleyen ham kayitlar

Yani admin panel sadece sonuc ekrani degil, operasyon kayit ekranidir.

---

## 10. Rapor Formati

Dosya:
- `docs/kas-run-report.md`

Kural:
- append-only
- eski bloklar silinmez
- 1 blok = 1 grid

Ornek:

```md
## Session YYYY-MM-DD HH:mm
- processed_cell: kas-google-grid-x1-y1
- grid_key: X1Y1
- grid_x: 1
- grid_y: 1
- status: completed
- api_calls: 46
- raw_rows_written: 249
- next_candidates:
  - X2Y1
  - X0Y1
  - X1Y2
  - X1Y0
- note: tek grid islendi, run sonlandirildi
```

---

## 11. Run Limitleri

Her run icin sert limitler:
- maksimum grid sayisi: `1`
- maksimum sure: `15 dakika`
- maksimum API call: `120`
- maksimum retry: `2 / type`

Bu limitlerden biri dolarsa:
- mevcut run kapatilir
- DB durumu yazilir
- rapor append edilir
- process durur

---

## 12. Script Tasarimi

Ideal script karakteri su olmali:
- tek sorumluluklu
- tek grid odakli
- idempotent olmaya yakin
- tekrar calistirilabilir
- yan etkileri acik
- queue tuketmeyen

Script input'u basit olmali:
- `grid_x`
- `grid_y`
- veya `cell_id`
- veya `center_lat`, `center_lng`
- `cell_size_meters`
- `limit`
- `dry_run`

Script output'u net JSON olmali:
- `grid_key`
- `cell_id`
- `status`
- `api_calls`
- `fetched`
- `unique_places`
- `inserted`
- `failed_types`
- `next_candidates`

---

## 13. Neden Bu Yapi Scripti Bogmaz?

Cunku:
- tek grid isler
- sabit type listesi vardir
- queue'yu ayni run'da tuketmez
- frontier expansion'i rapora birakir
- computation ucuzdur
- state acikca DB + markdown icinde tutulur
- restart edilmesi kolaydir

Yani sistem "ajanik" ama "otonom sonsuz loop" degildir.

---

## 14. Neden Bu Yapi AI'yi Bogmaz?

Cunku AI'dan beklenen sey sinirlidir:
- sadece 1 grid sec
- sadece 1 grid isle
- sadece 1 rapor yaz
- sonra dur

AI'nin karar alani daraltilmistir:
- type listesi sabit
- komsu sirasi sabit
- seed sabit
- hareket denklemi sabit
- stop kurallari sabit
- sonraki is sadece raporda not edilir

Bu yuzden model uzun zincirli planning yapmaya zorlanmaz.

---

## 15. Copy-Paste Master Prompt

Asagidaki prompt dogrudan AI agent'a verilebilir:

> Sen Kas icin Google Places tabanli tek-grid sweep agent'isin.
> Tek gorevin bir adet 500m x 500m grid islemek.
> Baslangic merkezi Kas Merkez: 36.199383, 29.641333.
> Bu nokta X1Y1 karesinin tam merkezidir.
> Baslangic gridi X1Y1 ve cell_id kas-google-grid-x1-y1 olsun.
> Her grid merkez-bazli tanimlansin.
> Her harekette merkez nokta tam 500m kaydirilsin.
> Her run'da merkez noktanin etrafinda 250m sola, 250m saga, 250m yukari, 250m asagi taranarak 500m x 500m kare elde edilsin.
> Hareket sistemi grid_x ve grid_y uzerinden calissin.
> Right = X+1, Left = X-1, Up = Y+1, Down = Y-1.
> Son rapordaki next_candidates listesinden ilk uygun gridi sec.
> Ayni run icinde ikinci gride gecme.
> Google Places Nearby Search ile type gruplarini tara.
> Sonuclari kare bbox icine filtrele.
> place.id ile tekillestir.
> Sonuclari raw_places tablosuna yaz.
> Sweep sonucunu grid_sweeps ve grid_sweep_cells tablolarina yaz.
> Session sonunda docs/kas-run-report.md dosyasina rapor append et.
> Sonraki aday gridleri sadece raporla, isleme.
> Raporu yazdiktan sonra dur.
> Loop'a girme. Frontier'i ayni run'da tuketme. Ek grid isleme.

---

## 16. Sonuc

Bu sistemin temiz tanimi sudur:
- kaynak: Google Places API
- geometri: 500m x 500m tek kare
- grid degiskenleri: `grid_x`, `grid_y`, `grid_key`
- yazim hedefi: `raw_places`
- operasyon metadata'si: `grid_sweeps` + `grid_sweep_cells`
- gorunurluk: admin panel
- state: DB + `docs/kas-run-report.md`
- anti-loop mantigi: `1 run = 1 grid`

Bu yapi, "X1Y1'den basla, sag-sol-yukari-asagi git" mantigini en net sekilde kurar.
