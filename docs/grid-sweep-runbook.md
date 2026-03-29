# Grid Sweep Runbook

Bu dosya, Kaş veri toplama akışındaki grid sweep mantığını başka bir AI agent'ın hızlıca devralabilmesi için tutulur.

## Amaç

OSM verisini tek büyük sorgu yerine 500m x 500m kare gridlere bölerek topluyoruz. Böylece:
- hangi alanların tarandığı takip ediliyor,
- hata alan hücreler tekrar denenebiliyor,
- admin panelinde "şu alan sweeplendi" bilgisi net görünüyor.

## Başlangıç Noktası

Grid origin sabiti:
- Kaş Merkez
- `36.199383, 29.641333`

Kod referansı:
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts#L89)

Bu origin bir grid anchor'ı gibi davranır. Kareler bu noktaya hizalanır.

## Grid Kuralı

- Hücre boyutu: `500m`
- Varsayılan parametre: `--cell-size-meters=500`
- Grid üretimi bbox'i kapsayan hizalı kareler üretir.
- Bbox tam bir kare gibi görünse bile, hizalama nedeniyle 1 yerine 4 hücre oluşabilir.

Kod referansı:
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts#L364)

## Sweep Kayıtları

Sweep metadata şu tablolarda tutulur:
- `grid_sweeps`
- `grid_sweep_cells`

Migration:
- [20260328211000_add_grid_sweeps.sql](/c:/.temp_private/newkasguide/supabase/migrations/20260328211000_add_grid_sweeps.sql#L1)

Bir gerçek import sırasında script şunları yapar:
1. sweep kaydı açar
2. her hücre için Overpass sorgusu atar
3. hücre sonucunu `success` veya `failed` olarak kaydeder
4. toplam ilerlemeyi `grid_sweeps` içinde günceller
5. sonuçları `raw_places` tablosuna upsert eder

Kod referansları:
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts#L137)
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts#L544)
- [scripts/import-osm.ts](/c:/.temp_private/newkasguide/scripts/import-osm.ts#L574)

## Admin Paneli

Admin review ekranı sweep geçmişini de gösterir:
- üst bölüm: son grid sweep kayıtları
- alt bölüm: review bekleyen mekanlar satır satır liste

Kod referansları:
- [src/lib/place-review-store.ts](/c:/.temp_private/newkasguide/src/lib/place-review-store.ts#L191)
- [src/app/admin/review/page.tsx](/c:/.temp_private/newkasguide/src/app/admin/review/page.tsx#L278)
- [src/app/admin/review/page.tsx](/c:/.temp_private/newkasguide/src/app/admin/review/page.tsx#L373)

URL:
- `/admin/review`

## İlk Gerçek Sweep

Tarih:
- 28 Mart 2026

Çalıştırılan ilk gerçek sweep:
- bölge: Kaş Merkez ilk sweep
- origin: `36.199383, 29.641333`
- hücre boyutu: `500m`
- kapsanan hücre sayısı: `4`
- sonuç: `52` ham kayıt import edildi

Özet:
- `fetched: 52`
- `prepared: 52`
- `inserted: 52`
- kategori dağılımı: `bar 9`, `restaurant 19`, `hotel 10`, `cafe 11`, `breakfast 1`, `activity 2`

Not:
- İlk iki Overpass endpoint zaman zaman düşebiliyor; script fallback ile diğer endpoint'e geçiyor.

## Komutlar

Tek sweep örneği:
```bash
npm run import:osm -- --grid --region=Kas Merkez Ilk Sweep --bbox=36.199383,29.641333,36.203875,29.646899 --pause-ms=0
```

Preset ile sweep örnekleri:
```bash
npm run import:osm -- --grid --preset=kas-core
npm run import:osm -- --grid --preset=cukurbag
npm run import:osm -- --grid --preset=kalkan
```

Dry run:
```bash
npm run import:osm -- --grid --preset=kas-core --dry-run
```

## Sonraki Agent İçin Devam Planı

1. `/admin/review` ekranından son sweep'i ve hata alan hücreleri kontrol et.
2. `grid_sweep_cells` içindeki `failed` hücreleri yeniden sweep etmek için aynı bbox ile tekrar run al.
3. Sweep sonrası sırayla şu komutları çalıştır:
   - `npm run normalize:places -- --limit=...`
   - `npm run dedupe:places -- --limit=...`
4. Review kuyruğunu admin panelden yönet.
5. Bölgeyi genişletirken önce `kas-core`, sonra `cukurbag`, sonra `kalkan` ilerle.

## Dikkat Edilecekler

- `raw_places` doğrudan yayına çıkmaz.
- Sweep başarısız olsa bile metadata tutulur; bu iyi bir şeydir.
- `getFlagValue()` artık URI encoded değerleri decode eder; boşluklu region isimleri güvenli kullanılabilir.
- Overpass çağrıları sandbox ağ kısıtında başarısız olabilir; gerekirse izinli network run gerekir.