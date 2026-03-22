'use client'

import { useEffect, useState } from 'react'

import { CATEGORIES } from '@/lib/supabase'

const CATEGORY_GROUPS = [
  {
    title: 'YEME & İÇME & KONAKLAMA',
    tone: 'food',
    ids: ['bar', 'meyhane', 'restoran', 'cafe', 'kahvalti', 'oteller'],
  },
  {
    title: 'GEZİ & KEŞİF',
    tone: 'explore',
    ids: ['tarih', 'doga', 'plaj', 'carsi', 'gezi'],
  },
  {
    title: 'AKTİVİTE & EĞLENCE',
    tone: 'fun',
    ids: ['dalis', 'aktivite', 'etkinlik'],
  },
  {
    title: 'İÇERİK & MEDYA',
    tone: 'editorial',
    ids: ['yazilar', 'roportaj', 'fotograf', 'oss', 'kas-local'],
  },
] as const

const HERO_SCENES = [
  {
    eyebrow: 'Kaş Sahne 01',
    title: 'Akşam ışığında Kaş kıyıları.',
    description:
      'Hero alanında dönüşümlü olarak duyurular, etkinlikler ve öne çıkan rotalar bu sahnelerin üstünde gösterilecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 02',
    title: 'Turkuaz su, kıyı çizgisi ve sakin bir gün.',
    description:
      'Büyük başlıklar, kısa açıklamalar ve kampanya mesajları için sinematik bir arka plan akışı.',
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 03',
    title: 'Patara yönünde geniş ufuk ve sahil dokusu.',
    description:
      'Her sahne farklı bir atmosfer taşıyabilir; yaz sezonu, etkinlik haftası ya da yerel öneriler gibi.',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 04',
    title: 'Kıyıya açılan tekneler ve yazın hafifliği.',
    description:
      'Netflix benzeri bu vitrin yapısı, tek ekranda hem görsel etki hem de hızlı yönlendirme verecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 05',
    title: 'Deniz, taş kıyı ve maviye bakan rotalar.',
    description:
      'Carousel altındaki oklar ve geçiş kareleri sayesinde içerikler kolayca gezilebilecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 06',
    title: 'Yumuşak gün batımıyla Kaş manzarası.',
    description:
      'Hero sahneleri kampanya, festival, plaj önerisi ya da özel içerik serisi gibi farklı ihtiyaçlara uyarlanabilir.',
    imageUrl:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 07',
    title: 'Kıyı boyunca uzanan sıcak yaz tonları.',
    description:
      'Arka plandaki sahneler sabit değil; dilediğimiz zaman görsel setini mevsime göre değiştirebiliriz.',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 08',
    title: 'Mavi, yeşil ve taş dokusunun dengesi.',
    description:
      'Bu yapı mobilde de kontrollü çalışacak; kart, başlık ve kontrol alanı birlikte akacak.',
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 09',
    title: 'Kalkan ve Kaş hattında güçlü bir yaz hissi.',
    description:
      'Öne çıkan yazılar, gezi rehberleri ve topluluk çağrıları için bu alan ana vitrin olarak kullanılacak.',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Kaş Sahne 10',
    title: 'Son sahne: sakin, temiz ve sinematik kapanış.',
    description:
      'Tüm sahneler alttaki kare göstergelerden tek tek seçilebilecek ve oklarla ileri geri gezilebilecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1600&q=80',
  },
] as const

export default function HomePage() {
  const [activeScene, setActiveScene] = useState(0)
  const categoryMap = new Map(CATEGORIES.map((category) => [category.id, category]))
  const scene = HERO_SCENES[activeScene]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % HERO_SCENES.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  const goToPreviousScene = () => {
    setActiveScene((current) => (current - 1 + HERO_SCENES.length) % HERO_SCENES.length)
  }

  const goToNextScene = () => {
    setActiveScene((current) => (current + 1) % HERO_SCENES.length)
  }

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-featured-card hero-carousel-card">
            <div
              className="hero-carousel-media"
              style={{ backgroundImage: `url(${scene.imageUrl})` }}
            ></div>
            <div className="hero-carousel-shade"></div>

            <div className="hero-featured-copy hero-carousel-copy">
              <div className="hero-featured-kicker">{scene.eyebrow}</div>
              <h2 className="hero-featured-title">{scene.title}</h2>
              <p className="hero-featured-description">{scene.description}</p>

              <div className="hero-featured-meta">
                <span className="hero-meta-chip">Duyuru</span>
                <span className="hero-meta-chip">Etkinlik</span>
                <span className="hero-meta-chip">Öne Çıkan</span>
              </div>

              <div className="hero-featured-actions">
                <a href="#categories" className="hero-primary-action">
                  Kategorileri Gör
                </a>
                <a
                  href="https://chat.whatsapp.com/GODQNmpRlAaDDtyaDnIyn4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-secondary-action"
                >
                  WhatsApp Topluluğu
                </a>
              </div>
            </div>

            <div className="hero-carousel-controls">
              <div className="hero-carousel-nav">
                <button
                  type="button"
                  className="hero-carousel-arrow"
                  onClick={goToPreviousScene}
                  aria-label="Önceki sahne"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="hero-carousel-arrow"
                  onClick={goToNextScene}
                  aria-label="Sonraki sahne"
                >
                  ›
                </button>
              </div>

              <div className="hero-carousel-dots" aria-label="Hero sahneleri">
                {HERO_SCENES.map((heroScene, index) => (
                  <button
                    key={heroScene.title}
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

          <div className="search-box hero-search-box">
            <svg
              className="search-icon"
              style={{ width: '24px', height: '24px', margin: '0 0.5rem', color: '#666' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" placeholder="Kaş'ta ara" className="search-input" />
            <button className="search-button">Filtreleri Temizle</button>
          </div>
        </div>
      </section>

      <section
        className="container home-categories-section"
        id="categories"
        style={{ padding: '2rem 1rem' }}
      >
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h3 className="section-title">Kategori seç.</h3>
        </div>

        <div className="category-groups-panel">
          {CATEGORY_GROUPS.map((group) => (
            <section key={group.title} className="category-group">
              <div className="category-group-header">
                <h4 className="category-group-title">{group.title}</h4>
                <span className="category-group-line" aria-hidden="true"></span>
              </div>

              <div className="category-pill-list">
                {group.ids.map((categoryId) => {
                  const category = categoryMap.get(categoryId)

                  if (!category) {
                    return null
                  }

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`category-card-large category-card-large-${group.tone}`}
                    >
                      <div
                        className="category-card-large-media"
                        style={{ backgroundImage: `url(${category.imageUrl})` }}
                      ></div>
                      <div className="category-card-large-body">
                        <span className="category-card-large-label">{category.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="footer-brand">Kaş Guide</span>
          </div>
          <p className="footer-tagline">Akdeniz'in incisi Kaş'ı keşfet</p>

          <div className="footer-social">
            <a href="mailto:info@kasguide.de" className="footer-social-link" aria-label="E-posta">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
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

          <p className="footer-copyright">@2026 Kaş Guide. Tüm Hakları Saklıdır</p>
        </div>
      </footer>
    </>
  )
}
