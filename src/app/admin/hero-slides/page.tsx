'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  clearStoredAdminPassword,
  getStoredAdminPassword,
  storeAdminPassword,
} from '@/lib/admin-password-client'
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
  message: 'Hero paneli hazırlanıyor...',
}

export default function HeroSlidesAdminPage() {
  const router = useRouter()
  const [adminPassword, setAdminPassword] = useState('')
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES)
  const [status, setStatus] = useState<PanelStatus>(INITIAL_STATUS)
  const [storage, setStorage] = useState<'seed' | 'supabase'>('seed')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const activeCount = useMemo(() => slides.filter((slide) => slide.isActive).length, [slides])

  useEffect(() => {
    const storedPassword = getStoredAdminPassword()

    if (!storedPassword) {
      router.replace('/admin')
      return
    }

    setAdminPassword(storedPassword)
    void loadSlides(storedPassword, true)
  }, [router])

  async function loadSlides(passwordOverride?: string, redirectOnAuthError = false) {
    const password = (passwordOverride ?? adminPassword).trim()

    if (!password) {
      router.replace('/admin')
      return
    }

    setIsLoading(true)
    setStatus({ tone: 'neutral', message: 'Hero sahneleri yükleniyor...' })

    try {
      const response = await fetch('/api/admin/hero-slides', {
        headers: {
          'X-Admin-Password': password,
        },
        cache: 'no-store',
      })

      const payload = (await response.json()) as
        | { slides?: HeroSlide[]; storage?: 'seed' | 'supabase'; error?: string }
        | undefined

      if (!response.ok || !payload?.slides) {
        throw new Error(payload?.error || 'Hero sahneleri yüklenemedi.')
      }

      storeAdminPassword(password)
      setAdminPassword(password)
      setSlides(reindexHeroSlides(payload.slides))
      setStorage(payload.storage || 'supabase')
      setStatus({
        tone: 'success',
        message: 'Hero sahneleri yüklendi. Kaydetmeden canlıya yansımaz.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hero sahneleri yüklenemedi.'

      if (redirectOnAuthError && message.toLowerCase().includes('yetkisiz')) {
        clearStoredAdminPassword()
        router.replace('/admin')
        return
      }

      setStatus({
        tone: 'error',
        message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveSlides() {
    const password = adminPassword.trim()

    if (!password) {
      router.replace('/admin')
      return
    }

    setIsSaving(true)
    setStatus({ tone: 'neutral', message: 'Hero sahneleri kaydediliyor...' })

    try {
      const response = await fetch('/api/admin/hero-slides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ slides }),
      })

      const payload = (await response.json()) as
        | { slides?: HeroSlide[]; storage?: 'seed' | 'supabase'; error?: string }
        | undefined

      if (!response.ok || !payload?.slides) {
        throw new Error(payload?.error || 'Hero sahneleri kaydedilemedi.')
      }

      storeAdminPassword(password)
      setSlides(reindexHeroSlides(payload.slides))
      setStorage(payload.storage || 'supabase')
      setStatus({
        tone: 'success',
        message: 'Hero sahneleri kaydedildi. Ana sayfa yeni sırayı kullanacak.',
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

  function updateSlide(index: number, field: keyof HeroSlide, value: string | boolean | string[]) {
    setSlides((currentSlides) =>
      currentSlides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
      ),
    )
  }

  function updateSlideTags(index: number, value: string) {
    const tags = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6)

    updateSlide(index, 'tags', tags)
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

  function logout() {
    clearStoredAdminPassword()
    setAdminPassword('')
    router.replace('/admin')
  }

  return (
    <main className="container admin-shell">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">Hero Yönetimi</span>
          <h1 className="admin-title">Slide show kontrol paneli</h1>
          <p className="admin-description">
            Hero alanındaki slide'ları buradan yönetebilirsiniz. Her slide için foto, üst etiket,
            başlık, alt başlık ve tag listesi düzenlenebilir.
          </p>
        </div>

        <div className="admin-summary-card">
          <div className="admin-summary-item">
            <span className="admin-summary-label">Toplam slide</span>
            <strong>{slides.length}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Aktif slide</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Depolama</span>
            <strong>{storage === 'supabase' ? 'Supabase' : 'Seed yedeği'}</strong>
          </div>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-panel admin-panel-links">
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => loadSlides()}
              disabled={isLoading}
            >
              {isLoading ? 'Yükleniyor...' : 'Slaytları yenile'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={saveSlides}
              disabled={isSaving}
            >
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}
            </button>
            <Link href="/admin" className="admin-button admin-button-secondary admin-button-link">
              Admin ana sayfa
            </Link>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={logout}
            >
              Çıkış yap
            </button>
          </div>
        </div>

        <div className={`admin-status admin-status-${status.tone}`}>
          <span>{status.message}</span>
        </div>
      </section>

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Slide listesi</h2>
          <p className="admin-section-copy">
            Buradan hero slide'larını ekleyebilir, çıkarabilir, sırasını değiştirebilir ve içeriğini anında güncelleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="admin-button admin-button-ghost"
          onClick={addSlide}
          disabled={slides.length >= MAX_HERO_SLIDES}
        >
          Yeni slide ekle
        </button>
      </section>

      <section className="admin-slide-grid">
        {slides.map((slide, index) => (
          <article key={slide.id} className="admin-slide-card">
            <div
              className="admin-slide-preview"
              style={{
                backgroundImage: `url(${slide.imageUrl || '/upup.png'})`,
                backgroundSize: slide.imageUrl ? 'cover' : 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: slide.imageUrl ? undefined : 'rgba(6, 10, 19, 0.78)',
              }}
            >
              <div className="admin-slide-preview-shade"></div>
              <div className="admin-slide-preview-copy">
                <span className="admin-slide-order">Slide {index + 1}</span>
                <strong>{slide.title || 'Başlık bekleniyor'}</strong>
                <span className="admin-slide-preview-subtitle">{slide.description || 'Alt başlık bekleniyor'}</span>
                <div className="admin-slide-preview-tags">
                  {slide.tags.slice(0, 3).map((tag) => (
                    <span key={`${slide.id}-${tag}`} className="admin-slide-preview-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-slide-fields">
              <label className="admin-field">
                <span className="admin-label">Foto URL</span>
                <input
                  className="admin-input"
                  value={slide.imageUrl}
                  onChange={(event) => updateSlide(index, 'imageUrl', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Üst etiket</span>
                <input
                  className="admin-input"
                  value={slide.eyebrow}
                  onChange={(event) => updateSlide(index, 'eyebrow', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Başlık</span>
                <input
                  className="admin-input"
                  value={slide.title}
                  onChange={(event) => updateSlide(index, 'title', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Alt başlık</span>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={slide.description}
                  onChange={(event) => updateSlide(index, 'description', event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">Tagler</span>
                <input
                  className="admin-input"
                  value={slide.tags.join(', ')}
                  onChange={(event) => updateSlideTags(index, event.target.value)}
                  placeholder="Öne Çıkan, Etkinlik, Kaş Merkez"
                />
              </label>

              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={slide.isActive}
                  onChange={(event) => updateSlide(index, 'isActive', event.target.checked)}
                />
                <span>Bu slide aktif olsun</span>
              </label>

              <div className="admin-card-actions">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                >
                  Yukarı al
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
