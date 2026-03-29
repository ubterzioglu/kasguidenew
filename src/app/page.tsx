'use client'

import { useEffect, useState } from 'react'

import { DEFAULT_HERO_SLIDES, HERO_ROTATION_MS, type HeroSlide } from '@/lib/hero-slide-data'
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

export default function HomePage() {
  const [activeScene, setActiveScene] = useState(0)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES)
  const categoryMap = new Map(CATEGORIES.map((category) => [category.id, category]))
  const scene = heroSlides[activeScene] ?? heroSlides[0]

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

    loadHeroSlides()

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

  const goToPreviousScene = () => {
    setActiveScene((current) => (current - 1 + heroSlides.length) % heroSlides.length)
  }

  const goToNextScene = () => {
    setActiveScene((current) => (current + 1) % heroSlides.length)
  }

  if (!scene) {
    return null
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

          <a
            href="https://wa.me/4915258450111"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-contact-link"
          >
            WhatsApp: +49 152 584 50 111
          </a>

          <p className="footer-copyright">@2026 Kaş Guide. Tüm Hakları Saklıdır</p>
        </div>
      </footer>
    </>
  )
}
