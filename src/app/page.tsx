'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { DEFAULT_HERO_SLIDES, HERO_ROTATION_MS, type HeroSlide } from '@/lib/hero-slide-data'
import { CATEGORIES } from '@/lib/supabase'

type CategoryPlace = {
  id: string
  slug: string
  name: string
  headline: string
  shortDescription: string
  categoryPrimary: string
  address: string | null
  phone: string | null
  website: string | null
  imageUrl: string | null
}

const CATEGORY_GROUPS = [
  {
    title: 'YEME & ICME & KONAKLAMA',
    tone: 'food',
    ids: ['bar', 'meyhane', 'restoran', 'cafe', 'kahvalti', 'oteller'],
  },
  {
    title: 'GEZI & KESIF',
    tone: 'explore',
    ids: ['tarih', 'doga', 'plaj', 'carsi', 'gezi'],
  },
  {
    title: 'AKTIVITE & EGLENCE',
    tone: 'fun',
    ids: ['dalis', 'aktivite', 'etkinlik'],
  },
  {
    title: 'ICERIK & MEDYA',
    tone: 'editorial',
    ids: ['yazilar', 'roportaj', 'fotograf', 'oss', 'kas-local'],
  },
] as const

const CATEGORY_IDS = CATEGORY_GROUPS.flatMap((group) => group.ids)
const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]))
const CATEGORY_ROW_SPLIT_INDEX = Math.ceil(CATEGORY_IDS.length / 2)
const CATEGORY_ROWS = [
  CATEGORY_IDS.slice(0, CATEGORY_ROW_SPLIT_INDEX),
  CATEGORY_IDS.slice(CATEGORY_ROW_SPLIT_INDEX),
]

const EXPERIENCE_PILLARS = [
  {
    title: 'Nerede Kalmalı?',
    description:
      'Butik otellerden sakin apartlara kadar ruhuna ve bütçene uyan konaklamayı tek bakışta bul.',
    accent: 'Konaklama',
  },
  {
    title: 'Ne Yemeli?',
    description:
      'Meyhaneler, kahvaltı durakları, manzaralı restoranlar ve lokal favoriler aynı rehberde.',
    accent: 'Lezzet',
  },
  {
    title: 'Ne Yapmalı?',
    description:
      'Dalıştan tekne günlerine, gün batımı rotalarından kısa keşiflere kadar planını hızla kur.',
    accent: 'Deneyim',
  },
  {
    title: 'Plaj Rehberi',
    description:
      'Kalabalık mı sakin mi? Platform mu koy mu? Deniz keyfine göre doğru sahili seç.',
    accent: 'Sahil',
  },
] as const

const TRUST_GALLERY = [
  {
    handle: '@kasmorningclub',
    title: 'Gün doğumunda liman turu',
    detail: 'Kullanıcıların en çok kaydettiği sabah rotalarından biri.',
  },
  {
    handle: '@mavikoynotlari',
    title: 'Sessiz plaj tavsiyesi',
    detail: '“Kalabalığa girmeden yüzmek isteyenlere birebir.”',
  },
  {
    handle: '@akdenizsofrasi',
    title: 'Akşam için meyhane shortlist',
    detail: 'Masa kurmadan önce bakanların favori paylaşımı.',
  },
] as const

const CURATED_ROUTES = [
  {
    name: 'Yalnız Gezgin',
    label: 'Sessiz ve özgür',
    summary: 'Sabah kahvesi, yüzme molası ve tek başına akacak hafif bir gün.',
    highlights: ['Sakin koy', 'Tek kişilik masa', 'Yürüyüş rotası'],
  },
  {
    name: 'Romantik Çift',
    label: 'Yumuşak tempo',
    summary: 'Gün batımı, iyi bir masa ve fotoğrafı güzel birkaç durak tek hatta.',
    highlights: ['Gün batımı', 'Şarap & meze', 'Rezervasyon önerisi'],
  },
  {
    name: 'Adrenalin Tutkunu',
    label: 'Yüksek enerji',
    summary: 'Dalış, deniz, tekne ve hareket isteyenler için yoğun ama akışkan rota.',
    highlights: ['Dalış', 'Tekne günü', 'Aktivite seçimi'],
  },
  {
    name: 'Dijital Göçebe',
    label: 'Work & flow',
    summary: 'İyi Wi-Fi, sakin masa, kahve ve akşam sosyalleşmesi aynı kurgu içinde.',
    highlights: ['Wi-Fi', 'Kafe shortlist', 'Akşam topluluk'],
  },
] as const

const WEEKLY_SIGNALS = [
  {
    title: 'Bu hafta kaçırma',
    value: '3 etkinlik',
    copy: 'Gün batımı buluşmaları, canlı müzik ve tek günlük rotalar öne çıkıyor.',
  },
  {
    title: 'En çok kaydedilen',
    value: 'Sessiz plajlar',
    copy: 'Aramalarda yükselen tema sakin koylar ve erken saat deniz planı.',
  },
  {
    title: 'Hızlı aksiyon',
    value: 'Rezervasyon önceliği',
    copy: 'Akşam için masa ayırmadan önce rehberden shortlist çıkar, sonra harekete geç.',
  },
] as const

export default function HomePage() {
  const [activeScene, setActiveScene] = useState(0)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES)
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([])
  const [categoryPlaces, setCategoryPlaces] = useState<CategoryPlace[]>([])
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryStatus, setCategoryStatus] = useState(
    'Bir veya birden fazla kategori secerek yayindaki mekanlari gorebilirsin.',
  )

  const scene = heroSlides[activeScene] ?? heroSlides[0]
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('tr')
  const filteredCategoryPlaces = categoryPlaces.filter((place) => {
    if (!normalizedSearchQuery) {
      return true
    }

    return [
      place.name,
      place.headline,
      place.shortDescription,
      place.address ?? '',
      CATEGORY_MAP.get(place.categoryPrimary)?.name ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase('tr')
      .includes(normalizedSearchQuery)
  })

  useEffect(() => {
    let isMounted = true

    async function loadHeroSlides() {
      try {
        const response = await fetch('/api/hero-slides', {
          cache: 'no-store',
        })

        const payload = (await response.json()) as { slides?: HeroSlide[] } | undefined

        if (!response.ok || !payload?.slides?.length) {
          return
        }

        if (isMounted) {
          setHeroSlides(payload.slides)
        }
      } catch {
        // Seed slides remain in place when the API is unavailable.
      }
    }

    void loadHeroSlides()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % heroSlides.length)
    }, HERO_ROTATION_MS)

    return () => window.clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    setActiveScene((current) => (current >= heroSlides.length ? 0 : current))
  }, [heroSlides.length])

  function resolveCategoryTone(categoryId: string) {
    return (
      CATEGORY_GROUPS.find((group) => (group.ids as readonly string[]).includes(categoryId))?.tone ??
      'food'
    )
  }

  function toggleCategoryFilter(categoryId: string) {
    setActiveCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
  }

  function renderCategoryTile(categoryId: string) {
    const category = CATEGORY_MAP.get(categoryId)

    if (!category) {
      return null
    }

    const tone = resolveCategoryTone(category.id)
    const isActive = activeCategoryIds.includes(category.id)

    return (
      <button
        key={category.id}
        type="button"
        className={`category-tile category-tile-${tone}${isActive ? ' is-active' : ''}`}
        onClick={() => toggleCategoryFilter(category.id)}
        aria-pressed={isActive}
      >
        <span className="category-tile-main">
          <strong className="category-tile-label">{category.name}</strong>
          <span className="category-tile-separator" aria-hidden="true">
            |
          </span>
        </span>
      </button>
    )
  }

  useEffect(() => {
    let cancelled = false

    async function loadCategoryPlaces() {
      if (activeCategoryIds.length === 0) {
        setCategoryPlaces([])
        setIsCategoryLoading(false)
        setCategoryStatus('Bir veya birden fazla kategori secerek yayindaki mekanlari gorebilirsin.')
        return
      }

      const selectedCategoryNames = activeCategoryIds
        .map((categoryId) => CATEGORY_MAP.get(categoryId)?.name || categoryId)
        .filter(Boolean)

      setIsCategoryLoading(true)
      setCategoryStatus(`${selectedCategoryNames.join(', ')} icin mekanlar yukleniyor...`)

      try {
        const responses = await Promise.all(
          activeCategoryIds.map((categoryId) =>
            fetch(`/api/places?category=${encodeURIComponent(categoryId)}`, {
              cache: 'no-store',
            }),
          ),
        )

        const payloads = await Promise.all(
          responses.map(async (response) => ({
            ok: response.ok,
            payload: (await response.json()) as { places?: CategoryPlace[]; error?: string },
          })),
        )

        const failedResponse = payloads.find((entry) => !entry.ok)

        if (failedResponse) {
          throw new Error(failedResponse.payload.error || 'Mekanlar yuklenemedi.')
        }

        const mergedPlaces = new Map<string, CategoryPlace>()

        for (const entry of payloads) {
          for (const place of entry.payload.places ?? []) {
            if (!mergedPlaces.has(place.id)) {
              mergedPlaces.set(place.id, place)
            }
          }
        }

        if (cancelled) {
          return
        }

        const places = Array.from(mergedPlaces.values())
        setCategoryPlaces(places)
        setCategoryStatus(
          places.length > 0
            ? `${selectedCategoryNames.join(', ')} icin ${places.length} yayin kaydi bulundu.`
            : 'Secili kategoriler icin henuz yayinda mekan yok.',
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setCategoryPlaces([])
        setCategoryStatus(error instanceof Error ? error.message : 'Mekanlar yuklenemedi.')
      } finally {
        if (!cancelled) {
          setIsCategoryLoading(false)
        }
      }
    }

    void loadCategoryPlaces()

    return () => {
      cancelled = true
    }
  }, [activeCategoryIds])

  if (!scene) {
    return null
  }

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-story-grid">
            <div className="hero-featured-card hero-carousel-card hero-story-card">
              <div
                className="hero-carousel-media"
                style={{ backgroundImage: `url(${scene.imageUrl})` }}
              ></div>
              <div className="hero-carousel-shade"></div>

              <div className="hero-featured-copy hero-carousel-copy">
                <div className="hero-featured-kicker">{scene.eyebrow}</div>
                <h1 className="hero-story-title">Kaş&apos;ı Bir Turist Gibi Değil, Bir Yerlisi Gibi Yaşa.</h1>
                <p className="hero-featured-description hero-story-description">
                  En gizli koylar, en lezzetli mezeler ve sadece müdavimlerin bildiği rotalar.
                  Kaş&apos;ın dijital anahtarı elinde.
                </p>

                <div className="hero-featured-meta hero-story-meta">
                  {scene.tags.map((tag) => (
                    <span key={`${scene.id}-${tag}`} className="hero-meta-chip">
                      {tag}
                    </span>
                  ))}
                  <span className="hero-meta-chip hero-meta-chip-accent">Local picks</span>
                </div>

                <div className="hero-featured-actions">
                  <a href="#categories" className="hero-primary-action">
                    Keşfetmeye Başla
                  </a>
                  <a href="#routes" className="hero-secondary-action">
                    Hazır Rotaları Gör
                  </a>
                </div>
              </div>

              <div className="hero-carousel-controls">
                <div className="hero-carousel-nav">
                  <button
                    type="button"
                    className="hero-carousel-arrow"
                    onClick={() =>
                      setActiveScene((current) => (current - 1 + heroSlides.length) % heroSlides.length)
                    }
                    aria-label="Önceki sahne"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="hero-carousel-arrow"
                    onClick={() => setActiveScene((current) => (current + 1) % heroSlides.length)}
                    aria-label="Sonraki sahne"
                  >
                    ›
                  </button>
                </div>

                <div className="hero-carousel-dots" aria-label="Hero sahneleri">
                  {heroSlides.map((heroScene, index) => (
                    <button
                      key={heroScene.id}
                      type="button"
                      className={`hero-carousel-dot${index === activeScene ? ' active' : ''}`}
                      onClick={() => setActiveScene(index)}
                      aria-label={`Sahne ${index + 1}`}
                      aria-pressed={index === activeScene}
                    ></button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="hero-story-aside">
              <div className="hero-insight-card hero-insight-card-proof">
                <span className="hero-insight-label">Bugünün hissi</span>
                <strong>{scene.title}</strong>
                <p>{scene.description}</p>
              </div>

              <div className="hero-insight-card hero-insight-card-weather">
                <span className="hero-insight-label">Kaş modu</span>
                <div className="hero-signal-row">
                  <strong>Sakin sabah</strong>
                  <span>Yüzme + kahve + akşam masa</span>
                </div>
                <div className="hero-signal-row">
                  <strong>Hızlı karar</strong>
                  <span>Plaj, meyhane ve rota seçimini 3 dakikada yap</span>
                </div>
              </div>

              <div className="hero-insight-card hero-insight-card-cta">
                <span className="hero-insight-label">Topluluğa gir</span>
                <p>
                  Güncel etkinlikler, masa önerileri ve son dakika local tavsiyeleri için
                  WhatsApp kanalına katıl.
                </p>
                <a
                  href="https://chat.whatsapp.com/GODQNmpRlAaDDtyaDnIyn4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-aside-link"
                >
                  WhatsApp Topluluğu
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="landing-section landing-problem-section">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">Kafa karışıklığını azalt</span>
            <h2 className="landing-section-title">Kaş çok seçenekli. Rehberin işi doğru seçeneği hızlandırmak.</h2>
            <p className="landing-section-copy">
              Güzel görünen yerleri değil, sana gerçekten uyan planı çıkaran bir akış kurduk.
            </p>
          </div>

          <div className="experience-bento-grid">
            {EXPERIENCE_PILLARS.map((pillar) => (
              <article key={pillar.title} className="experience-bento-card">
                <span className="experience-bento-accent">{pillar.accent}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-proof-section">
        <div className="landing-shell proof-grid">
          <div className="proof-panel">
            <span className="landing-eyebrow">Social proof</span>
            <h2 className="landing-section-title">Kaş’ı yaşayanların kaydettiği, paylaştığı ve önerdiği akış.</h2>
            <p className="landing-section-copy">
              Rehber, tatlı bir vitrin olmak yerine karar vermeyi hızlandıran bir ikinci beyin gibi çalışır.
            </p>
          </div>

          <div className="proof-gallery">
            {TRUST_GALLERY.map((item) => (
              <article key={item.handle} className="proof-gallery-card">
                <span className="proof-gallery-handle">{item.handle}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="weekly-signal-panel">
            {WEEKLY_SIGNALS.map((signal) => (
              <article key={signal.title} className="weekly-signal-card">
                <span>{signal.title}</span>
                <strong>{signal.value}</strong>
                <p>{signal.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-routes-section" id="routes">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">Küratörlü rotalar</span>
            <h2 className="landing-section-title">Kim olduğuna göre akan planı seç, günü sıfırdan kurma.</h2>
          </div>

          <div className="curated-route-grid">
            {CURATED_ROUTES.map((route) => (
              <article key={route.name} className="curated-route-card">
                <span className="curated-route-label">{route.label}</span>
                <h3>{route.name}</h3>
                <p>{route.summary}</p>
                <div className="curated-route-tags">
                  {route.highlights.map((highlight) => (
                    <span key={`${route.name}-${highlight}`}>{highlight}</span>
                  ))}
                </div>
                <a href="#categories" className="curated-route-link">
                  Bu profile göre keşfet
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="container home-categories-section"
        id="categories"
        style={{
          width: 'min(1200px, calc(100% - 2rem))',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1rem',
        }}
      >
        <div className="category-section-shell">
          <div className="category-topline">
            <div>
              <span className="landing-eyebrow">Akıllı keşif</span>
              <h3 className="section-title">Şimdi kendi Kaş senaryonu kur.</h3>
            </div>
            <span className="category-filter-count">{`${activeCategoryIds.length} aktif filtre`}</span>
          </div>

          <div className="category-pill-list category-pill-list-all">
            {CATEGORY_ROWS.map((row, index) => (
              <div
                key={`category-row-${index + 1}`}
                className={`category-pill-row category-pill-row-${index + 1}`}
                style={{ ['--category-columns' as any]: row.length }}
              >
                {row.map((categoryId) => renderCategoryTile(categoryId))}
              </div>
            ))}
          </div>

          <div className="search-box category-search-box">
            <input
              type="text"
              placeholder="Sessiz plaj, iyi meyhane, work-friendly kafe..."
              className="search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button className="search-button">Ara</button>
          </div>

          <section className="category-results-shell">
            <div className="category-results-header">
              <div>
                <h4 className="category-results-title">
                  {activeCategoryIds.length > 0
                    ? `${activeCategoryIds.length} kategori için seçilen mekanlar`
                    : 'Yayındaki mekanlar'}
                </h4>
                <p className="category-results-copy">
                  {normalizedSearchQuery && categoryPlaces.length > 0
                    ? `"${searchQuery}" için ${filteredCategoryPlaces.length} sonuç gösteriliyor.`
                    : categoryStatus}
                </p>
              </div>
            </div>

            {activeCategoryIds.length > 0 ? (
              isCategoryLoading ? (
                <div className="category-results-empty">Mekanlar yükleniyor...</div>
              ) : filteredCategoryPlaces.length === 0 ? (
                <div className="category-results-empty">
                  {normalizedSearchQuery
                    ? 'Aramana uyan sonuç bulunamadı. Filtreleri ya da arama kelimeni değiştir.'
                    : 'Seçili kategoriler için henüz yayına alınmış mekan yok.'}
                </div>
              ) : (
                <div className="category-results-grid">
                  {filteredCategoryPlaces.map((place) => (
                    <Link key={place.id} href={`/mekan/${place.slug}`} className="category-place-card">
                      <div
                        className="category-place-media"
                        style={{
                          backgroundImage: `url(${
                            place.imageUrl || CATEGORY_MAP.get(place.categoryPrimary)?.imageUrl || ''
                          })`,
                        }}
                      ></div>
                      <div className="category-place-body">
                        <span className="category-place-eyebrow">
                          {CATEGORY_MAP.get(place.categoryPrimary)?.name || place.categoryPrimary}
                        </span>
                        <h5 className="category-place-title">{place.headline || place.name}</h5>
                        <p className="category-place-copy">{place.shortDescription}</p>
                        <div className="category-place-meta">
                          <span>{place.address || 'Adres bilgisi yakında'}</span>
                          {place.phone ? <span>{place.phone}</span> : null}
                          {place.website ? (
                            <a href={place.website} target="_blank" rel="noopener noreferrer">
                              Website
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <div className="category-results-empty">
                Üstteki pillerden bir veya birkaçını seç, Kaş planını burada netleştirelim.
              </div>
            )}
          </section>
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-content landing-shell footer-shell">
          <div className="footer-grid">
            <div className="footer-brand-block">
              <span className="landing-eyebrow">Kaş Guide</span>
              <h2 className="footer-brand-title">Kaş’ta doğru masa, doğru koy ve doğru rota daha hızlı bulunsun diye.</h2>
              <p className="footer-tagline">
                Yerel hissi kaybetmeden keşfetmek isteyenler için seçilmiş mekanlar, rotalar ve
                canlı öneriler aynı akışta.
              </p>
              <div className="footer-actions">
                <a href="#categories" className="hero-primary-action footer-primary-link">
                  Keşfe Dön
                </a>
                <a
                  href="mailto:info@kasguide.de"
                  className="hero-secondary-action footer-secondary-link"
                >
                  İletişime Geç
                </a>
              </div>
            </div>

            <div className="footer-links-block">
              <h3 className="footer-column-title">Hızlı geçiş</h3>
              <div className="footer-link-list">
                <a href="#top">Ana Sayfa</a>
                <a href="#routes">Rotalar</a>
                <a href="#categories">Kategoriler</a>
                <a href="mailto:info@kasguide.de">E-posta</a>
              </div>
            </div>

            <div className="footer-contact-block">
              <h3 className="footer-column-title">İletişim ve sosyal</h3>
              <div className="footer-social">
                <a href="mailto:info@kasguide.de" className="footer-social-link" aria-label="E-posta">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/4915258450111"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M20.52 3.48A11.77 11.77 0 0 0 12.04.01C5.55.01.29 5.27.29 11.76c0 2.08.54 4.11 1.57 5.9L0 24l6.53-1.71a11.73 11.73 0 0 0 5.51 1.4h.01c6.48 0 11.74-5.26 11.74-11.75 0-3.14-1.22-6.09-3.27-8.46zm-8.48 18.2h-.01a9.77 9.77 0 0 1-4.98-1.36l-.36-.21-3.88 1.02 1.04-3.78-.24-.39a9.75 9.75 0 0 1-1.5-5.19c0-5.39 4.39-9.78 9.79-9.78 2.61 0 5.06 1.01 6.91 2.87a9.7 9.7 0 0 1 2.87 6.91c0 5.39-4.39 9.79-9.78 9.79zm5.36-7.33c-.29-.15-1.73-.85-2-.95-.27-.1-.47-.15-.67.15-.2.29-.77.95-.95 1.15-.17.2-.35.22-.64.07-.29-.15-1.24-.46-2.36-1.47-.87-.78-1.46-1.75-1.63-2.04-.17-.29-.02-.45.13-.6.13-.13.29-.35.44-.52.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.15 5.02 4.42.7.3 1.25.48 1.68.61.71.23 1.35.2 1.86.12.57-.08 1.73-.71 1.98-1.39.24-.68.24-1.26.17-1.39-.07-.14-.26-.21-.55-.36z" />
                  </svg>
                </a>
                <a
                  href="https://facebook.com/kasguide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com/guidekas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/thekasguide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>

              <div className="footer-contact-meta">
                <a href="mailto:info@kasguide.de">info@kasguide.de</a>
                <a href="https://wa.me/4915258450111" target="_blank" rel="noopener noreferrer">
                  WhatsApp ile yaz
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">© 2026 Kaş Guide. Tüm hakları saklıdır.</p>
            <p className="footer-bottom-note">Mediterranean soul, local picks, hızlı karar.</p>
          </div>
        </div>
      </footer>
    </>
  )
}

