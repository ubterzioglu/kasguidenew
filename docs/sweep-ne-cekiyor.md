# Sweep Tam Olarak Ne Cekiyor?

Bu dokuman, `scripts/import-osm.ts` icindeki mevcut sweep mantiginin gercekte ne yaptigini aciklar.

## Kisa Ozet

Mevcut sistem:
- Google Maps taramasi yapmiyor.
- Web scraping yapmiyor.
- Sadece OSM / Overpass verisi cekiyor.
- Cekilen kayitlari `raw_places` tablosuna yaziyor.
- Grid mantiginda `bbox` icine temas eden tum kareleri tarıyor.

Yani "500m" su anda:
- tek bir merkezden capi 500m olan alan degil,
- tek bir kutu ciz ve sadece onu tara mantigi da degil,
- origin noktasina hizalanmis 500m x 500m karelerden bbox ile kesisenlerin tamami.

Bu yuzden 500m beklentisi ile bazen 1 hucre yerine 4 hucre sweep edilebiliyor.

## Kod Nerede?

Ana dosya:
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts)

Kategori esleme mantigi:
- [scripts/lib/ingestion-config.ts](/c:/.temp_private/newkasguide/scripts/lib/ingestion-config.ts)

## Sweep Hangi Kaynaklari Cekiyor?

Sadece Overpass sorgusu ile su OSM nesneleri cekiliyor:
- `node`
- `way`
- `relation`

Sorgu `out center tags;` kullandigi icin:
- `node` ise kendi koordinati kullanilir
- `way` ve `relation` ise merkez noktasi kullanilir

## Overpass Sorgusu Tam Olarak Neyi Cekiyor?

Mevcut sorgu su tag gruplarini cekiyor:

### 1. `amenity`
- `restaurant`
- `cafe`
- `bar`
- `pub`
- `fast_food`

### 2. `tourism`
- `hotel`
- `guest_house`
- `motel`
- `hostel`
- `apartment`
- `attraction`
- `museum`
- `gallery`

### 3. `natural`
- `beach`

### 4. `leisure`
- `beach_resort`
- `sports_centre`
- `marina`
- `park`
- `water_park`

### 5. `sport`
- `scuba_diving`

### 6. `shop`
- `scuba_diving`

### 7. `breakfast`
- `yes`

## Bunlar Hangi Internal Kategorilere Mapleniyor?

Script bunlari su kategorilere ceviriyor:
- `diving`
- `hotel`
- `beach`
- `breakfast`
- `meyhane`
- `bar`
- `cafe`
- `restaurant`
- `activity`

### Ozel durumlar

- `meyhane` OSM'de dogrudan sorgulanmiyor.
  `name` alaninda `meyhane` gecerse `meyhane` oluyor.
- `pub`, isimde `meyhane` gecmiyorsa `bar` oluyor.
- `restaurant`, `cafe` veya `fast_food` icinde `cuisine=breakfast/brunch` varsa `breakfast` oluyor.
- `sport=scuba_diving`, `shop=scuba_diving` veya isimde `dive` geciyorsa `diving` oluyor.

## Sweep Sonucunda Hangi Alanlar Kaydediliyor?

`raw_places` tablosuna su alanlar yaziliyor:
- `source_name = osm_overpass`
- `source_id = type/id` formatinda OSM kimligi
- `name_raw`
- `lat`
- `lng`
- `address_raw`
- `website_raw`
- `phone_raw`
- `category_raw`
- `raw_payload` icinde tum temel OSM tagleri

Import asamasinda tek duplicate kontrolu:
- ayni `source_name + source_id` tekrar gelirse overwrite/upsert olur

Yani bu asamada isim benzerligiyle duplicate temizligi yapilmiyor.
O daha sonra `normalize` ve `dedupe` scriptlerinde yapiliyor.

## 500m Neden Yanlis Gibi Duruyor?

Cunku mevcut grid mantigi su sekilde calisiyor:

1. Kaş Merkez origin noktasi sabit aliniyor
- `36.199383, 29.641333`

2. `500m`, dereceye cevriliyor
- `latStep ~= 0.0044915559`
- `lngStep ~= 0.0055659744`

3. Verdigimiz `bbox`, bu origin'e hizalanmis karelerle kesisiyorsa o karelerin hepsi aliniyor.

### Kritik nokta

Eger bir bbox'i "tam 1 kare" sanip elle yuvarlanmis koordinatlarla verirsek,
`Math.floor` ve `Math.ceil` kullanildigi icin komsu kareler de dahil olabilir.

Ornek:
- teorik tek hucre kuzey siniri: `36.2038745559`
- teorik tek hucre dogu siniri: `29.6468989744`

Ama biz bunu su sekilde verirsek:
- `36.203875`
- `29.646899`

bu cok kucuk yuvarlama farki bile sonraki hucreyi de kapsiyor gibi okunabilir.
Sonuc:
- 1 hucre beklerken 2x2 = 4 hucre sweep edilebilir.

## Yani Su Anki 500m'in Gercek Anlami Ne?

Su anki anlam:
- her bir grid hucre kenari yaklasik 500 metredir
- ama sweep edilen toplam alan, verdigin bbox'in kac hucreye temas ettigine baglidir
- bu yuzden "500m sweep" ile "toplam taranan alan 500m" ayni sey degildir

## Ilk Sweep Neden 4 Hucre Oldu?

Ilk sweep komutu pratikte su hucreleri taradi:
- Grid #1
- Grid #2
- Grid #3
- Grid #4

Toplam:
- `52` kayit geldi
- `4` hucre islendi

Bu, sistemin bozuk oldugu anlamina gelmiyor.
Ama "tek 500m kare" beklentisi varsa mevcut komut semantigi kafa karistirici.

## Su Anda Sistem Ne Yapiyor, Ne Yapmiyor?

Yapiyor:
- OSM POI topluyor
- OSM taglerini sakliyor
- sweep metadata tutuyor
- hangi gridlerin tarandigini admin panelde gosteriyor

Yapmiyor:
- Google Maps yorum / puan / telefon scrape etmiyor
- web sitesi crawl etmiyor
- tek hucre secimini hucre ID bazli dogrudan vermiyor
- tam "bu kare ve sadece bu kare" garantisini kullanici dostu sekilde sunmuyor

## Bence Problem Nerede?

Bence problem `500m` degerinin kendisinden cok, komutun anlami:
- `bbox` veriyoruz
- sistem bbox'i gridlere boluyor
- ama kullanici bunu tek sweep boyutu gibi yorumluyor

Yani teknik olarak su anki davranis tutarli,
ama urun dili olarak yaniltici.

## Daha Dogru Bir Sonraki Adim Ne Olur?

Bence su 3 yaklasimdan birine gecmemiz gerekir:

### Secenek 1
Tek hucre sweep mantigi
- komut `origin + direction + cell-size` ile sadece 1 kare uretsin
- en net davranis bu olur

### Secenek 2
Hucre ID bazli mantik
- belirli `latIndex/lngIndex` hucresini tara
- tekrar deneme ve operasyon kolaylasir

### Secenek 3
Bbox sweep kalsin ama adini degistirelim
- "500m hucreli bbox tarama" diyelim
- boylece beklenti dogru kurulur

## Benim Onerim

Su anki yapi icin en temiz tanim su:

> Sistem, Kas Merkez origin'ine hizalanmis 500m x 500m grid hucreleri uretir ve verilen bbox ile kesisen tum hucreleri sweep eder.

Bu tanim dogru.
"500m sweep yapiyor" demek ise tek basina eksik ve yanlis anlasilmaya acik.

## Sonuc

Evet, hissin dogru:
- `500m` su an urun davranisi olarak beklenenden farkli gorunuyor.
- Teknik olarak sebep, bbox intersection + origin alignment + ceil/floor mantigi.
- Yani problem daha cok komut semantigi ve grid secim modeli.

## Yapilan Iyilestirmeler (2026-03)

Uc farkli sweep modu eklendi:

### Mod1: Bbox Multi-Cell Sweep
Mevcut davranis, daha net isimlendirme ile:
- `--grid --preset kas-core` veya `--grid --bbox ...`
- Belirtilen bbox ile kesisen tum hucreleri tarar
- "500m hucreli bbox tarama" olarak adlandirilmalidir

### Mod2: Single-Cell Sweep (YENI)
Tam olarak 1 hucre tarar:
- `--single-cell --direction north --cell-size 500`
- Origin'den belirtilen yonde tam 1 hucre uretir ve tarar
- "500m sweep" beklentisi bu modla karsilanir

### Mod3: Cell-ID Sweep (YENI)
Belirli bir hucreyi index ile tarar:
- `--cell-id 0 1` (latIndex=0, lngIndex=1)
- Origin'e gore hesaplanan belirli hucreyi tarar
- Tekrar deneme ve operasyon kolaylastirir

### Kullanim Ornekleri

```bash
# Bbox multi-cell sweep (eski davranis)
npx tsx scripts/import-osm.ts --grid --preset kas-core

# Tek hucre sweep (kuzeydirection)
npx tsx scripts/import-osm.ts --single-cell --direction north --cell-size 500

# Cell-ID sweep (belirli hucre)
npx tsx scripts/import-osm.ts --cell-id 0 1
```

### Onemli Not

"500m sweep" terimi artik yaniltici degil:
- **Single-cell sweep**: Tam 500m x 500m = 1 hucre
- **Bbox sweep**: 500m'lik hucrelerden olusan coklu hucre taramasi
- **Cell-ID sweep**: Belirli bir 500m'lik hucre

## Teknik Implementasyon Detaylari (2026-03-28)

### Eklenen Fonksiyonlar

#### `dispatchSweepMode()` (satir 341-414)
CLI argumanlarini analiz ederek uygun sweep modunu calistirir:
- `--single-cell` flag'i varsa `runSingleCellSweep()` cagirir
- `--cell-id` flag'i varsa `runCellIdSweep()` cagirir
- Varsayilan: `main()` fonksiyonunu cagirir (bbox multi-cell sweep)

#### `runSingleCellSweep()` (satir 589-700)
Tek hucre sweep modu:
- Parametreler: `centerLat`, `centerLng`, `direction`, `cellSizeMeters`, `options`, `client`
- Yonler: `north`, `south`, `east`, `west`
- Donus: `{ sweepId, cellIndex, totalFetched, status }`
- Dry-run modunda veri yazmadan sadece bilgi doner

#### `runCellIdSweep()` (satir 934-1041)
Hucre ID bazli sweep modu:
- Parametreler: `latIndex`, `lngIndex`, `options`, `client`
- Origin noktasina gore hesaplanan belirli hucreyi tarar
- Donus: `{ sweepId, cellIndex, totalFetched, status }`
- Dry-run modunda hucre sinirlari ve bilgi doner

### Dry-Run Modu

Tum sweep modlari `--dry-run` flag'i ile calisabilir:
```bash
# Single-cell dry-run
npx tsx scripts/import-osm.ts --dry-run --single-cell --direction north --cell-size 500

# Cell-ID dry-run
npx tsx scripts/import-osm.ts --dry-run --cell-id 0 1

# Bbox multi-cell dry-run
npx tsx scripts/import-osm.ts --dry-run --grid --preset kas-core
```

Dry-run modunda:
- Supabase istemcisi olusturulmaz
- Veri tabanina yazma yapilmaz
- Sadece sweep bilgileri JSON olarak dondurulur

### Sabitler ve Yardimci Fonksiyonlar

Kullanilan sabitler:
- `METERS_PER_DEGREE_LAT = 111_320`
- `DEFAULT_GRID_ORIGIN = { lat: 36.199383, lng: 29.641333 }`
- `GRID_PRESETS`: `kas-core`, `kas-wide`, `kalkan`, `cukurbag`

Yardimci fonksiyonlar:
- `buildGridCells()`: bbox'tan grid hucreleri olusturur
- `buildOverpassBboxQuery()`: Overpass bbox sorgusu olusturur
- `fetchOverpass()`: Overpass API'den veri ceker
- `createGridSweep()`: grid_sweeps kaydi olusturur
- `recordGridSweepCell()`: grid_sweep_cells kaydi olusturur
- `syncGridSweep()`: sweep durumunu gunceller