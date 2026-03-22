# Kaş Guide New - Claude Code Proje Rehberi

## Proje Özeti

Kaş Guide, Kaş/Antalya için kapsamlı bir şehir rehberi uygulamasıdır. Next.js 15, TypeScript, Tailwind CSS ve Supabase ile geliştirilmektedir.

## Teknoloji Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Coolify / Vercel

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Ana sayfa
│   └── globals.css         # Global stiller
├── components/             # React component'leri
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ItemCard.tsx
│   └── CategoryFilter.tsx
└── lib/                    # Utility fonksiyonları
    ├── supabase.ts         # Supabase client
    └── api.ts              # API fonksiyonları
```

## Database Şeması

### Items Tablosu (Unified)

```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  long_text TEXT,
  item_type VARCHAR(50) NOT NULL, -- 'place', 'pet', 'hotel', 'artist'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  attributes JSONB DEFAULT '{}',
  images TEXT[],
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Önemli Kurallar

1. **SQL Template Tag**: Database sorguları için parameterized query kullan
2. **Unified Items Table**: Tüm içerik `items` tablosunda, `item_type` ile ayrım yapılıyor
3. **Status Workflow**: `pending` → `approved`/`rejected`
4. **Slug Generation**: Türkçe karakter normalizasyonu (ğ→g, ü→u, ş→s, ı→i, ö→o, ç→c)

## Kategoriler

| ID | İsim | İkon |
|----|------|------|
| restaurant | Restoran | 🍽️ |
| cafe | Kafe | ☕ |
| bar | Bar | 🍺 |
| beach | Plaj | 🏖️ |
| hotel | Otel | 🏨 |
| pension | Pansiyon | 🏠 |
| activity | Aktivite | 🎯 |
| shopping | Alışveriş | 🛍️ |
| culture | Kültür | 🏛️ |
| nature | Doğa | 🌿 |
| viewpoint | Manzara | 🌄 |
| dive | Dalış | 🤿 |
| boat | Tekne | ⛵ |
| petfriendly | Patili Dostu | 🐕 |
| breakfast | Kahvaltı | 🥐 |
| icecream | Dondurma | 🍦 |

## Development Komutları

```bash
npm run dev      # Development server başlat (localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint kontrolü
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# Admin
ADMIN_API_KEY=...

# External APIs
GOOGLE_PLACES_API_KEY=...

# Email
SMTP_HOST=smtp.zoho.eu
SMTP_USER=...
SMTP_PASS=...
```

## Eski Proje Referansı

Eski proje `old/` klasöründe bulunuyor. Referans için:
- `old/index.html` - Eski ana sayfa yapısı
- `old/script.js` - Eski JavaScript mantığı
- `old/api/` - Eski API endpoints
- `old/lib/db-items.js` - Eski database işlemleri

## Güvenlik Kuralları

1. **API Key**: Admin endpoint'leri için `X-API-Key` header'ı gerekli
2. **File Upload**: Sadece JPG/PNG/WEBP, max 2MB
3. **CSP Headers**: `vercel.json`'da tanımlı
4. **SSL**: Database bağlantısı SSL zorunlu

## Session Geçmişi

Detaylı geçmiş için [HISTORY.md](./HISTORY.md) dosyasına bakınız.

---

*Bu dosya proje boyunca güncellenecektir.*
