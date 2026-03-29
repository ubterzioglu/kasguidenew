# Sweep Agent Handoff

Bu dosya, yeni bir AI agent'in Kas grid sweep isini hic arka plan bilmeden devralabilmesi icin hazirlandi.

## Canonical Docs

Once su dosyalari oku:
1. `docs/sweep.md`
2. `docs/kas-run-report.md`

Bu iki dosya yetiyorsa baska dokuman okuma.

## Sistem Ozeti

- Kaynak: `Google Places API`
- Grid boyutu: `500m x 500m`
- Baslangic grid'i: `X1Y1`
- Baslangic `cell_id`: `kas-google-grid-x1-y1`
- Baslangic merkez: `36.199383, 29.641333`
- Hareket mantigi:
  - right = `X+1, Y`
  - left = `X-1, Y`
  - up = `X, Y+1`
  - down = `X, Y-1`

En kritik kural:
- `1 run = 1 grid`
- run bitince dur

## Ilk Grid Sonucu

Ilk gercek import tamamlandi.

Sonuc:
- `grid_key = X1Y1`
- `cell_id = kas-google-grid-x1-y1`
- `status = completed`
- `raw_rows_written = 249`
- `api_calls = 46`
- `fetched = 320`
- `unique_places = 249`
- `failed_types = []`

Bu run veritabanina yazildi.
Bu run markdown rapora append edildi.
Bu run admin panelde sweep olarak gorunmelidir.

## X1Y1 BBox

- `south = 36.197137`
- `west = 29.63855`
- `north = 36.201629`
- `east = 29.644116`

Bu kare, Kas Merkez noktasini ortalayan ilk 500m x 500m grid'dir.

## Sonraki Adaylar

Siradaki komsular:
1. `X2Y1`
2. `X0Y1`
3. `X1Y2`
4. `X1Y0`

Varsayilan sonraki hedef:
- `X2Y1`

Ama secmeden once `docs/kas-run-report.md` ve son `grid_sweeps` kayitlarini kontrol et.

## Tek Run Protokolu

Her yeni run tam olarak bunu yapar:
1. `docs/kas-run-report.md` dosyasini oku
2. `next_candidates` listesinden ilk uygun adayi sec
3. sadece 1 grid isle
4. sonucu `raw_places` tablosuna yaz
5. sonucu `grid_sweeps` ve `grid_sweep_cells` tablolarina yaz
6. `docs/kas-run-report.md` dosyasina yeni blok append et
7. dur

Yapilmayacaklar:
- ayni run icinde ikinci gride gecmek
- while loop kurmak
- frontier queue tuketmek
- acik uclu expansion yapmak

## Kullanilacak Komutlar

### X1Y1 dry-run
```bash
npm run import:google:grid -- --grid-x=1 --grid-y=1 --dry-run
```

### X1Y1 live run
```bash
npm run import:google:grid -- --grid-x=1 --grid-y=1
```

### X2Y1 live run
```bash
npm run import:google:grid -- --grid-x=2 --grid-y=1
```

### Grid key yerine cell id ile
```bash
npm run import:google:grid -- --cell-id=kas-google-grid-x2-y1
```

## Script Davranisi

Script dosyasi:
- `scripts/import-google-grid.ts`

Script su alanlari destekler:
- `--grid-x`
- `--grid-y`
- `--grid-key`
- `--cell-id`
- `--center-lat`
- `--center-lng`
- `--cell-size-meters`
- `--limit`
- `--dry-run`

Script su ciktilari verir:
- `gridKey`
- `cellId`
- `bbox`
- `apiCalls`
- `fetched`
- `uniquePlaces`
- `inserted`
- `failedTypes`
- `nextCandidates`

## Admin Kontrol

Admin ekranı:
- `/admin/review`

Burada gorunmesi gerekenler:
- yeni sweep kaydi
- sweep status
- grid'e ait bbox bilgisi
- review bekleyen kayitlar

## Agent'a Verilecek Kisa Talimat

> Sen Kas icin tek-grid sweep agent'isin.
> Sadece bir adet 500m x 500m grid isle ve sonra dur.
> Baslangic merkezi Kas Merkez: 36.199383, 29.641333.
> X1Y1 ilk merkez grid'dir.
> Hareket sistemi `grid_x` ve `grid_y` uzerinden calissin.
> Right = X+1, Left = X-1, Up = Y+1, Down = Y-1.
> Son rapordaki `next_candidates` listesinden ilk uygun gridi sec.
> Ayni run icinde ikinci gride gecme.
> Sonucu `raw_places`, `grid_sweeps`, `grid_sweep_cells` ve `docs/kas-run-report.md` icine yaz.
> Sonraki adaylari sadece raporla.
> Raporu yazdiktan sonra dur.

## Tek Cumlelik Ozet

Bu projede sweep, `X1Y1` merkez gridinden baslayan ve her cagrida sadece 1 adet 500m x 500m kareyi isleyip sonra duran Google Places ingestion akışıdır.
