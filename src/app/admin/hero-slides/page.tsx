'use client'

import { useMemo, useState } from 'react'

import {
  DEFAULT_HERO_SLIDES,
  MAX_HERO_SLIDES,
  createEmptyHeroSlide,
  reindexHeroSlides,
  type HeroSlide,
} from '@/lib/hero-slide-data'

type StatusTone = 'neutral' | 'success' | 'error'

type PanelStatus = {
  tone: StatusTone
  message: string
}

const INITIAL_STATUS: PanelStatus = {
  tone: 'neutral',
  message: 'Degisiklikler admin parolasi ile kaydedilir. Parola sayfa yenilenince temizlenir.',
}

export default function HeroSlidesAdminPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES)
  const [status, setStatus] = useState<PanelStatus>(INITIAL_STATUS)
  const [storage, setStorage] = useState<'seed' | 'supabase'>('seed')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const activeCount = useMemo(() => slides.filter((slide) => slide.isActive).length, [slides])

  async function loadSlides() {
    if (!adminPassword.trim()) {
      setStatus({
        tone: 'error',
        message: 'Hero panelini acmak icin ADMIN_PASSWORD degerini girmeniz gerekiyor.',
      })
      return
    }

    setIsLoading(true)
    setStatus({ tone: 'neutral', message: 'Hero sahneleri yukleniyor...' })

    try {
      const response = await fetch('/api/admin/hero-slides', {
        headers: {
          'X-Admin-Password': adminPassword.trim(),
        },
        cache: 'no-store',
      })

      const payload = (await response.json()) as
        | { slides?: HeroSlide[]; storage?: 'seed' | 'supabase'; error?: string }
        | undefined

      if (!response.ok || !payload?.slides) {
        throw new Error(payload?.error || 'Hero sahneleri yuklenemedi.')
      }

      setSlides(reindexHeroSlides(payload.slides))
      setStorage(payload.storage || 'supabase')
      setStatus({
        tone: 'success',
        message: 'Hero sahneleri yuklendi. Kaydetmeden canliya yansimaz.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Hero sahneleri yuklenemedi.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveSlides() {
    if (!adminPassword.trim()) {
      setStatus({
        tone: 'error',
        message: 'Kaydetmek icin ADMIN_PASSWORD gerekli.',
      })
      return
    }

    setIsSaving(true)
    setStatus({ tone: 'neutral', message: 'Hero sahneleri kaydediliyor...' })

    try {
      const response = await fetch('/api/admin/hero-slides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword.trim(),
        },
        body: JSON.stringify({ slides }),
      })

      const payload = (await response.json()) as
        | { slides?: HeroSlide[]; storage?: 'seed' | 'supabase'; error?: string }
        | undefined

      if (!response.ok || !payload?.slides) {
        throw new Error(payload?.error || 'Hero sahneleri kaydedilemedi.')
      }

      setSlides(reindexHeroSlides(payload.slides))
      setStorage(payload.storage || 'supabase')
      setStatus({
        tone: 'success',
        message: 'Hero sahneleri kaydedildi. Ana sayfa yeni sirayi kullanacak.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Hero sahneleri kaydedilemedi.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function updateSlide(index: number, field: keyof HeroSlide, value: string | boolean) {
    setSlides((currentSlides) =>
      currentSlides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
      ),
    )
  }

  function addSlide() {
    setSlides((currentSlides) => {
      if (currentSlides.length >= MAX_HERO_SLIDES) {
        return currentSlides
      }

      return reindexHeroSlides([...currentSlides, createEmptyHeroSlide(currentSlides.length)])
    })
  }

  function removeSlide(index: number) {
    setSlides((currentSlides) => {
      if (currentSlides.length === 1) {
        return currentSlides
      }

      return reindexHeroSlides(currentSlides.filter((_, slideIndex) => slideIndex !== index))
    })
  }

  function moveSlide(index: number, direction: -1 | 1) {
    setSlides((currentSlides) => {
      const targetIndex = index + direction

      if (targetIndex < 0 || targetIndex >= currentSlides.length) {
        return currentSlides
      }

      const nextSlides = [...currentSlides]
      ;[nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]]

      return reindexHeroSlides(nextSlides)
    })
  }

  return (
    <main className="container admin-shell">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">Hero Yonetimi</span>
          <h1 className="admin-title">Ana sayfa gecislerini panelden yonetin</h1>
          <p className="admin-description">
            Bu ekran hero sahnelerinin basligini, aciklamasini, gorselini, sirasini ve aktiflik
            durumunu yonetir. Giris icin `ADMIN_PASSWORD`, depolama icin `SUPABASE_SERVICE_ROLE_KEY`
            gereklidir.
          </p>
        </div>

        <div className="admin-summary-card">
          <div className="admin-summary-item">
            <span className="admin-summary-label">Toplam sahne</span>
            <strong>{slides.length}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Aktif sahne</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Depolama</span>
            <strong>{storage === 'supabase' ? 'Supabase' : 'Seed fallback'}</strong>
          </div>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-panel">
          <label className="admin-field">
            <span className="admin-label">Admin parolasi</span>
            <input
              className="admin-input"
              type="password"
              placeholder="ADMIN_PASSWORD"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
          </label>

          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={loadSlides}
              disabled={isLoading}
            >
              {isLoading ? 'Yukleniyor...' : 'Sahneleri yukle'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={saveSlides}
              disabled={isSaving}
            >
              {isSaving ? 'Kaydediliyor...' : 'Degisiklikleri kaydet'}
            </button>
          </div>
        </div>

        <div className={`admin-status admin-status-${status.tone}`}>
          <span>{status.message}</span>
        </div>
      </section>

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Sahne listesi</h2>
          <p className="admin-section-copy">
            Her sahne ana sayfada ayni bileseni kullanir. Sirayi degistirdiginizde carousel de ayni
            sirayla akar.
          </p>
        </div>

        <button
          type="button"
          className="admin-button admin-button-ghost"
          onClick={addSlide}
          disabled={slides.length >= MAX_HERO_SLIDES}
        >
          Yeni sahne ekle
        </button>
      </section>

      <section className="admin-slide-grid">
        {slides.map((slide, index) => (
          <article key={slide.id} className="admin-slide-card">
            <div
              className="admin-slide-preview"
              style={{ backgroundImage: `url(${slide.imageUrl || '/upup.png'})` }}
            >
              <div className="admin-slide-preview-shade"></div>
              <div className="admin-slide-preview-copy">
                <span className="admin-slide-order">Sahne {index + 1}</span>
                <strong>{slide.title || 'Baslik bekleniyor'}</strong>
              </div>
            </div>

            <div className="admin-slide-fields">
              <label className="admin-field">
                <span className="admin-label">Etiket</span>
                <input
                  className="admin-input"
                  value={slide.eyebrow}
                  onChange={(event) => updateSlide(index, 'eyebrow', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Baslik</span>
                <input
                  className="admin-input"
                  value={slide.title}
                  onChange={(event) => updateSlide(index, 'title', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Aciklama</span>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={slide.description}
                  onChange={(event) => updateSlide(index, 'description', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Gorsel URL</span>
                <input
                  className="admin-input"
                  value={slide.imageUrl}
                  onChange={(event) => updateSlide(index, 'imageUrl', event.target.value)}
                />
              </label>

              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={slide.isActive}
                  onChange={(event) => updateSlide(index, 'isActive', event.target.checked)}
                />
                <span>Bu sahne aktif olsun</span>
              </label>

              <div className="admin-card-actions">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                >
                  Yukari al
                </button>
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === slides.length - 1}
                >
                  Asagi al
                </button>
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  onClick={() => removeSlide(index)}
                  disabled={slides.length === 1}
                >
                  Sil
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}