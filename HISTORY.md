# Kaş Guide New - Proje Tarihi

## 2026-03-22 - Proje Başlangıcı

### Yapılan İşlemler

1. **Proje Yapısı Oluşturuldu**
   - Eski proje (https://github.com/ubterzioglu/kasguide) `old/` klasörüne klonlandı
   - `.gitignore` oluşturuldu (`old/` ve `.kilocode/` dahil)
   - GitHub'a push edildi: https://github.com/ubterzioglu/kasguidenew

2. **Next.js Projesi Başlatıldı**
   - Next.js 15 + TypeScript + Tailwind CSS
   - App Router yapısı kullanılıyor
   - `src/app/` klasör yapısı

3. **Supabase Bağlantısı**
   - Mevcut Supabase database bilgileri `.env.local` dosyasına eklendi
   - `src/lib/supabase.ts` dosyası oluşturuldu
   - Database URL: `postgresql://postgres:***@db.ibltmprnsrieobmjxlwu.supabase.co:5432/postgres`

### Mevcut Dosya Yapısı

```
newkasguide/
├── .env.local              # Environment variables (Supabase, SMTP, API keys)
├── .gitignore              # old/, .kilocode/, node_modules/ vb.
├── package.json            # Next.js 15, React 19, Supabase
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js config
├── tailwind.config.ts      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── HISTORY.md              # Bu dosya
├── AGENTS.md               # Agent kuralları
├── old/                    # Eski proje (referans için)
│   ├── index.html          # Eski ana sayfa
│   ├── script.js           # Eski JavaScript
│   ├── style.css           # Eski stiller
│   ├── api/                # Eski API endpoints
│   ├── db/                 # Database connection
│   └── lib/                # Eski library'ler
├── .kilocode/              # Kilocode rules
└── src/
    ├── app/
    │   ├── globals.css     # Global stiller
    │   ├── layout.tsx      # Root layout
    │   └── page.tsx        # Ana sayfa (yapım aşamasında)
    └── lib/
        └── supabase.ts     # Supabase client ve types
```

### Sonraki Adımlar

1. [ ] Ana sayfa (`src/app/page.tsx`) oluştur
2. [ ] Supabase'den veri çekme fonksiyonları yaz
3. [ ] Kategori filtreleme sistemi
4. [ ] Item kartları component'i
5. [ ] Header ve Footer component'leri
6. [ ] Search functionality

### Eski Proje Notları

- **Database**: Supabase PostgreSQL
- **Unified Items Table**: Tüm içerik (places, hotels, pets, artists) `items` tablosunda
- **Item Type**: `item_type` field ile ayrım yapılıyor
- **Status Workflow**: `pending` → `approved`/`rejected`
- **Slug Generation**: Türkçe karakter normalizasyonu ile otomatik

### Önemli Environment Variables

```env
DATABASE_URL=postgresql://postgres:***@db.ibltmprnsrieobmjxlwu.supabase.co:5432/postgres
ADMIN_API_KEY=***
GOOGLE_PLACES_API_KEY=***
SMTP_HOST=smtp.zoho.eu
```

---

*Bu dosya her session'da güncellenecektir.*
