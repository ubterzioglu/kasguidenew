'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  clearStoredAdminPassword,
  getStoredAdminPassword,
  storeAdminPassword,
} from '@/lib/admin-password-client'

type ReviewQueueStatus = 'pending' | 'in_review' | 'approved' | 'merged' | 'rejected'
type ReviewAction = 'start_review' | 'approve' | 'merge' | 'reject'
type GridSweepStatus = 'running' | 'completed' | 'partial' | 'failed'
type StatusTone = 'neutral' | 'success' | 'error'
type RawPlaceAction = 'save_draft' | 'publish' | 'reject'

type GridSweepCellItem = {
  id: string
  cellIndex: number
  status: 'pending' | 'success' | 'failed'
  bbox: {
    south: number
    west: number
    north: number
    east: number
  }
  fetchedCount: number
  preparedCount: number
  errorMessage: string | null
  completedAt: string | null
}

type GridSweepItem = {
  id: string
  regionName: string
  presetName: string | null
  status: GridSweepStatus
  originLat: number
  originLng: number
  cellSizeMeters: number
  totalCells: number
  processedCells: number
  successfulCells: number
  failedCells: number
  bbox: {
    south: number
    west: number
    north: number
    east: number
  }
  startedAt: string
  completedAt: string | null
  cells: GridSweepCellItem[]
}

type PlaceEditorDraft = {
  placeId: string | null
  slug: string | null
  name: string
  headline: string
  shortDescription: string
  longDescription: string
  categoryPrimary: string
  address: string
  phone: string
  website: string
  imageUrls: string[]
  status: 'draft' | 'review' | 'published' | 'archived'
  verificationStatus: 'pending' | 'reviewed' | 'verified' | 'rejected'
}

type RecentRawPlaceItem = {
  id: string
  sourceName: string
  sourceId: string
  nameRaw: string | null
  lat: number | null
  lng: number | null
  addressRaw: string | null
  phoneRaw: string | null
  websiteRaw: string | null
  categoryRaw: string | null
  processingStatus: string
  importedAt: string
  gridKey: string | null
  cellId: string | null
  googleMapsUri: string | null
  draft: PlaceEditorDraft
}

type ReviewDashboardSnapshot = {
  queue: ReviewQueueItem[]
  sweeps: GridSweepItem[]
  rawResults: RecentRawPlaceItem[]
  stats: {
    pendingReviews: number
    pendingRawPlaces: number
    draftPlaces: number
    publishedPlaces: number
    trackedSweeps: number
    runningSweeps: number
  }
  categoryOptions: Array<{ id: string; label: string }>
}

type ReviewQueueItem = {
  id: string
  reason: string
  status: ReviewQueueStatus
  notes: string | null
  score: number | null
  createdAt: string
  updatedAt: string
  rawPlace: {
    id: string
    sourceName: string
    sourceId: string
    nameRaw: string | null
    lat: number | null
    lng: number | null
    addressRaw: string | null
    phoneRaw: string | null
    websiteRaw: string | null
    categoryRaw: string | null
    processingStatus: string
    importedAt: string
  }
  candidatePlace: {
    id: string
    name: string
    slug: string
    categoryPrimary: string
    status: string
    verificationStatus: string
  } | null
}

type PanelStatus = {
  tone: StatusTone
  message: string
}

const INITIAL_STATUS: PanelStatus = {
  tone: 'neutral',
  message: 'Sweep ve mekan editörü yükleniyor...',
}

const EMPTY_SNAPSHOT: ReviewDashboardSnapshot = {
  queue: [],
  sweeps: [],
  rawResults: [],
  stats: {
    pendingReviews: 0,
    pendingRawPlaces: 0,
    draftPlaces: 0,
    publishedPlaces: 0,
    trackedSweeps: 0,
    runningSweeps: 0,
  },
  categoryOptions: [],
}

export default function ReviewAdminPage() {
  const router = useRouter()
  const [adminPassword, setAdminPassword] = useState('')
  const [snapshot, setSnapshot] = useState<ReviewDashboardSnapshot>(EMPTY_SNAPSHOT)
  const [drafts, setDrafts] = useState<Record<string, PlaceEditorDraft>>({})
  const [status, setStatus] = useState<PanelStatus>(INITIAL_STATUS)
  const [isLoading, setIsLoading] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [activeRawPlaceId, setActiveRawPlaceId] = useState<string | null>(null)

  useEffect(() => {
    const storedPassword = getStoredAdminPassword()

    if (!storedPassword) {
      router.replace('/admin')
      return
    }

    setAdminPassword(storedPassword)
    void loadDashboard(storedPassword, true)
  }, [router])

  function hydrateDrafts(rawResults: RecentRawPlaceItem[]) {
    const nextDrafts: Record<string, PlaceEditorDraft> = {}

    for (const item of rawResults) {
      nextDrafts[item.id] = {
        ...item.draft,
        imageUrls: item.draft.imageUrls.length > 0 ? [...item.draft.imageUrls] : [''],
      }
    }

    setDrafts(nextDrafts)

    if (!activeRawPlaceId && rawResults[0]) {
      setActiveRawPlaceId(rawResults[0].id)
    }
  }

  async function loadDashboard(passwordOverride?: string, redirectOnAuthError = false) {
    const password = (passwordOverride ?? adminPassword).trim()

    if (!password) {
      router.replace('/admin')
      return
    }

    setIsLoading(true)
    setStatus({ tone: 'neutral', message: 'Grid sweep kayıtları ve mekan editörü yükleniyor...' })

    try {
      const response = await fetch('/api/admin/review?limit=32', {
        headers: {
          'X-Admin-Password': password,
        },
        cache: 'no-store',
      })

      const payload = (await response.json()) as ReviewDashboardSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Admin verisi yüklenemedi.')
      }

      storeAdminPassword(password)
      setAdminPassword(password)
      setSnapshot(payload)
      hydrateDrafts(payload.rawResults)
      setStatus({
        tone: 'success',
        message: `${payload.rawResults.length} sweep mekanı ve ${payload.sweeps.length} sweep oturumu yüklendi.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Admin verisi yüklenemedi.'

      if (redirectOnAuthError && message.toLowerCase().includes('yetkisiz')) {
        clearStoredAdminPassword()
        router.replace('/admin')
        return
      }

      setStatus({ tone: 'error', message })
    } finally {
      setIsLoading(false)
    }
  }

  async function runReviewAction(reviewId: string, action: ReviewAction, candidatePlaceId?: string | null) {
    const password = adminPassword.trim()

    if (!password) {
      router.replace('/admin')
      return
    }

    setActiveActionId(reviewId)
    setStatus({ tone: 'neutral', message: 'Review aksiyonu uygulanıyor...' })

    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ reviewId, action, candidatePlaceId }),
      })

      const payload = (await response.json()) as ReviewDashboardSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Review aksiyonu başarısız oldu.')
      }

      storeAdminPassword(password)
      setSnapshot(payload)
      hydrateDrafts(payload.rawResults)
      setStatus({ tone: 'success', message: 'Review kaydı güncellendi.' })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Review aksiyonu başarısız oldu.',
      })
    } finally {
      setActiveActionId(null)
    }
  }
  async function runRawPlaceAction(rawPlaceId: string, action: RawPlaceAction) {
    const password = adminPassword.trim()

    if (!password) {
      router.replace('/admin')
      return
    }

    const draft = drafts[rawPlaceId]

    if (!draft && action !== 'reject') {
      setStatus({ tone: 'error', message: 'Mekan editörü hazır değil.' })
      return
    }

    setActiveActionId(rawPlaceId)
    setStatus({
      tone: 'neutral',
      message: action === 'publish' ? 'Mekan yayına alınıyor...' : 'Mekan kaydı güncelleniyor...',
    })

    try {
      const response = await fetch('/api/admin/raw-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ rawPlaceId, action, draft }),
      })

      const payload = (await response.json()) as ReviewDashboardSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Mekan kaydı güncellenemedi.')
      }

      storeAdminPassword(password)
      setSnapshot(payload)
      hydrateDrafts(payload.rawResults)
      setStatus({
        tone: 'success',
        message:
          action === 'publish'
            ? 'Mekan onaylandı ve yayına alındı.'
            : action === 'reject'
              ? 'Ham mekan kaydı reddedildi.'
              : 'Mekan taslağı kaydedildi.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Mekan kaydı güncellenemedi.',
      })
    } finally {
      setActiveActionId(null)
    }
  }

  function updateDraftField(rawPlaceId: string, field: keyof PlaceEditorDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [rawPlaceId]: {
        ...current[rawPlaceId],
        [field]: field === 'imageUrls' ? current[rawPlaceId].imageUrls : value,
      },
    }))
  }

  function updateImageField(rawPlaceId: string, index: number, value: string) {
    setDrafts((current) => {
      const nextImages = [...(current[rawPlaceId]?.imageUrls ?? [''])]
      nextImages[index] = value

      return {
        ...current,
        [rawPlaceId]: {
          ...current[rawPlaceId],
          imageUrls: nextImages,
        },
      }
    })
  }

  function addImageField(rawPlaceId: string) {
    setDrafts((current) => {
      const images = [...(current[rawPlaceId]?.imageUrls ?? [''])]

      if (images.length >= 5) {
        return current
      }

      images.push('')

      return {
        ...current,
        [rawPlaceId]: {
          ...current[rawPlaceId],
          imageUrls: images,
        },
      }
    })
  }

  function removeImageField(rawPlaceId: string, index: number) {
    setDrafts((current) => {
      const images = [...(current[rawPlaceId]?.imageUrls ?? [''])]

      if (images.length <= 1) {
        images[0] = ''
      } else {
        images.splice(index, 1)
      }

      return {
        ...current,
        [rawPlaceId]: {
          ...current[rawPlaceId],
          imageUrls: images,
        },
      }
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
        <div className="admin-hero-copy admin-hero-copy-review">
          <span className="admin-eyebrow">Sweep Operasyonu</span>
          <h1 className="admin-title">Sweep edilen mekanları düzenle, fotoğrafları ekle ve yayına al</h1>
          <p className="admin-description">
            Google'dan gelen ham sweep kayıtlarını burada satır satır düzenleyip kategori, başlık, açıklama ve foto
            bilgileriyle gerçek mekan kaydına dönüştürüyoruz.
          </p>
          <div className="admin-hero-notes">
            <span>Min 1, max 5 foto</span>
            <span>Onaylanan mekanlar anasayfada kategoriye göre gösterilir</span>
          </div>
        </div>

        <div className="admin-summary-card admin-summary-card-review">
          <div className="admin-summary-item">
            <span className="admin-summary-label">Ham kayıt</span>
            <strong>{snapshot.stats.pendingRawPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Taslak mekan</span>
            <strong>{snapshot.stats.draftPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Yayında</span>
            <strong>{snapshot.stats.publishedPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Toplam sweep</span>
            <strong>{snapshot.stats.trackedSweeps}</strong>
          </div>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-panel admin-panel-links admin-panel-review">
          <div className="admin-toolbar-actions">
            <button type="button" className="admin-button admin-button-primary" onClick={() => loadDashboard()} disabled={isLoading}>
              {isLoading ? 'Yükleniyor...' : 'Paneli yenile'}
            </button>
            <Link href="/admin" className="admin-button admin-button-secondary admin-button-link">
              Admin ana sayfa
            </Link>
            <button type="button" className="admin-button admin-button-secondary" onClick={logout}>
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
          <h2 className="admin-section-title">Grid sweep geçmişi</h2>
          <p className="admin-section-copy">Hangi kare tarandı, kaç mekan çekildi ve sweep durumunun ne olduğu burada görünür.</p>
        </div>
      </section>
      {snapshot.sweeps.length === 0 ? (
        <section className="admin-empty-state">
          <strong>Henüz kaydedilmiş bir grid sweep yok.</strong>
          <p>Gerçek bir `import:google:grid` çalıştığında sweep kartları burada görünecek.</p>
        </section>
      ) : (
        <section className="sweep-board">
          {snapshot.sweeps.map((sweep) => {
            const progress = sweep.totalCells > 0 ? Math.round((sweep.processedCells / sweep.totalCells) * 100) : 0

            return (
              <article key={sweep.id} className="sweep-card">
                <div className="sweep-card-header">
                  <div className="sweep-card-copy-block">
                    <span className={`review-pill review-pill-${sweep.status}`}>{formatSweepStatus(sweep.status)}</span>
                    <h3 className="sweep-card-title">{decodeLabel(sweep.regionName)}</h3>
                    <p className="sweep-card-copy">{formatSweepMode(sweep.presetName, sweep.cellSizeMeters)}</p>
                  </div>
                  <div className="sweep-card-meta">
                    <span>Başlangıç: {formatDate(sweep.startedAt)}</span>
                    <strong>İlerleme %{progress}</strong>
                  </div>
                </div>

                <div className="sweep-progress-track" aria-hidden="true">
                  <span className="sweep-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="sweep-stats-grid">
                  <div>
                    <span>Merkez nokta</span>
                    <strong>{sweep.originLat.toFixed(6)}, {sweep.originLng.toFixed(6)}</strong>
                  </div>
                  <div>
                    <span>Taranan alan</span>
                    <strong>{formatBbox(sweep.bbox)}</strong>
                  </div>
                  <div>
                    <span>İşlenen hücre</span>
                    <strong>{sweep.processedCells}/{sweep.totalCells}</strong>
                  </div>
                  <div>
                    <span>Başarılı / Hata</span>
                    <strong>{sweep.successfulCells} / {sweep.failedCells}</strong>
                  </div>
                </div>

                <div className="sweep-cell-list">
                  {sweep.cells.map((cell) => (
                    <div key={cell.id} className={`sweep-cell sweep-cell-${cell.status}`}>
                      <div className="sweep-cell-head">
                        <strong>Hücre #{cell.cellIndex}</strong>
                        <span>{formatCellStatus(cell.status)}</span>
                      </div>
                      <p>{cell.fetchedCount} aday bulundu, {cell.preparedCount} kayıt hazırlandı.</p>
                      <p>{formatBbox(cell.bbox)}</p>
                      {cell.errorMessage ? <p className="sweep-cell-error">{cell.errorMessage}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Sweep edilen mekanlar</h2>
          <p className="admin-section-copy">
            Her satırda ham Google verisini görüp kategori, mekan başlığı, açıklama ve foto alanlarını düzenleyebilirsin.
          </p>
        </div>
      </section>

      {snapshot.rawResults.length === 0 ? (
        <section className="admin-empty-state">
          <strong>Henüz listelenecek mekan yok.</strong>
          <p>Yeni bir grid sweep tamamlandığında mekan editörü burada dolacak.</p>
        </section>
      ) : (
        <section className="place-review-shell">
          {snapshot.rawResults.map((item) => {
            const isOpen = activeRawPlaceId === item.id
            const isBusy = activeActionId === item.id
            const draft = drafts[item.id] ?? item.draft
            const nonEmptyImageCount = draft.imageUrls.map((entry) => entry.trim()).filter(Boolean).length

            return (
              <article key={item.id} className={`place-review-card${isOpen ? ' is-open' : ''}`}>
                <button type="button" className="place-review-summary" onClick={() => setActiveRawPlaceId(isOpen ? null : item.id)}>
                  <div className="place-review-summary-main">
                    <div className="place-review-summary-headline">
                      <span className="place-review-grid-pill">{item.gridKey || 'Grid yok'}</span>
                      <span className={`review-pill review-pill-${mapProcessingStatusTone(item.processingStatus)}`}>{formatProcessingStatus(item.processingStatus)}</span>
                    </div>
                    <h3>{draft.name || item.nameRaw || 'İsimsiz mekan'}</h3>
                    <p>{draft.headline || 'Başlık yok'}</p>
                    <div className="place-review-meta-chips">
                      <span>{draft.categoryPrimary || item.categoryRaw || 'Kategori yok'}</span>
                      <span>{draft.address || item.addressRaw || 'Adres yok'}</span>
                      <span>{nonEmptyImageCount}/5 foto</span>
                    </div>
                  </div>
                  <div className="place-review-summary-side">
                    <span>{formatDate(item.importedAt)}</span>
                    <strong>{isOpen ? 'Editör açık' : 'Editörü aç'}</strong>
                  </div>
                </button>

                {isOpen ? (
                  <div className="place-review-editor">
                    <div className="place-review-raw-grid">
                      <div className="place-review-raw-card">
                        <span className="place-review-card-label">Google kaynagi</span>
                        <strong>{item.nameRaw || 'İsimsiz mekan'}</strong>
                        <p>{item.categoryRaw || 'Kategori yok'}</p>
                        <p>{item.addressRaw || 'Adres yok'}</p>
                        <p>{item.phoneRaw || 'Telefon yok'}</p>
                        <p>{item.websiteRaw || 'Website yok'}</p>
                        {item.googleMapsUri ? <a href={item.googleMapsUri} target="_blank" rel="noopener noreferrer" className="admin-inline-link">Google Maps kaydını aç</a> : null}
                      </div>

                      <div className="place-review-raw-card">
                        <span className="place-review-card-label">Yayın durumu</span>
                        <strong>{formatPlaceStatus(draft.status)}</strong>
                        <p>Doğrulama: {formatVerificationStatus(draft.verificationStatus)}</p>
                        <p>Kaynak: {item.sourceName} / {item.sourceId}</p>
                        <p>Koordinat: {item.lat !== null && item.lng !== null ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}` : 'Yok'}</p>
                      </div>
                    </div>

                    <div className="place-editor-grid">
                      <label className="admin-field">
                        <span>Mekan adı</span>
                        <input value={draft.name} onChange={(event) => updateDraftField(item.id, 'name', event.target.value)} />
                      </label>

                      <label className="admin-field">
                        <span>Mekan başlığı</span>
                        <input value={draft.headline} onChange={(event) => updateDraftField(item.id, 'headline', event.target.value)} />
                      </label>

                      <label className="admin-field admin-field-wide">
                        <span>Kısa açıklama</span>
                        <textarea rows={3} value={draft.shortDescription} onChange={(event) => updateDraftField(item.id, 'shortDescription', event.target.value)} />
                      </label>

                      <label className="admin-field admin-field-wide">
                        <span>Detaylı açıklama</span>
                        <textarea rows={5} value={draft.longDescription} onChange={(event) => updateDraftField(item.id, 'longDescription', event.target.value)} />
                      </label>

                      <label className="admin-field">
                        <span>Kategori</span>
                        <select value={draft.categoryPrimary} onChange={(event) => updateDraftField(item.id, 'categoryPrimary', event.target.value)}>
                          {snapshot.categoryOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="admin-field">
                        <span>Website</span>
                        <input value={draft.website} onChange={(event) => updateDraftField(item.id, 'website', event.target.value)} placeholder="https://..." />
                      </label>
                      <label className="admin-field admin-field-wide">
                        <span>Adres</span>
                        <input value={draft.address} onChange={(event) => updateDraftField(item.id, 'address', event.target.value)} />
                      </label>

                      <label className="admin-field">
                        <span>Telefon</span>
                        <input value={draft.phone} onChange={(event) => updateDraftField(item.id, 'phone', event.target.value)} />
                      </label>
                    </div>

                    <div className="place-photo-panel">
                      <div className="place-photo-header">
                        <div>
                          <h4>Fotoğraflar</h4>
                          <p>Her mekan için en az 1, en fazla 5 foto URL gir. İlk foto kapak olarak kullanılır.</p>
                        </div>
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => addImageField(item.id)} disabled={draft.imageUrls.length >= 5}>
                          Foto ekle
                        </button>
                      </div>

                      <div className="place-photo-list">
                        {draft.imageUrls.map((imageUrl, index) => (
                          <div key={`${item.id}-image-${index}`} className="place-photo-row">
                            <label className="admin-field admin-field-wide">
                              <span>Foto URL #{index + 1}</span>
                              <input value={imageUrl} onChange={(event) => updateImageField(item.id, index, event.target.value)} placeholder="https://..." />
                            </label>
                            <button type="button" className="admin-button admin-button-ghost" onClick={() => removeImageField(item.id, index)}>
                              Kaldır
                            </button>
                            {imageUrl.trim() ? <img src={imageUrl} alt="Önizleme" className="place-photo-preview" /> : <div className="place-photo-placeholder">Önizleme yok</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="place-editor-actions">
                      <button type="button" className="admin-button admin-button-secondary" onClick={() => runRawPlaceAction(item.id, 'save_draft')} disabled={isBusy}>
                        {isBusy ? 'Kaydediliyor...' : 'Taslağı kaydet'}
                      </button>
                      <button type="button" className="admin-button admin-button-primary" onClick={() => runRawPlaceAction(item.id, 'publish')} disabled={isBusy}>
                        {isBusy ? 'Yayına hazırlanıyor...' : 'Onayla ve yayına al'}
                      </button>
                      <button type="button" className="admin-button admin-button-danger" onClick={() => runRawPlaceAction(item.id, 'reject')} disabled={isBusy}>
                        Reddet
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
      )}

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Review kuyruğu</h2>
          <p className="admin-section-copy">Duplicate veya eksik veri nedeniyle işaretlenen kayıtlar için hızlı review listesi.</p>
        </div>
      </section>

      {snapshot.queue.length === 0 ? (
        <section className="admin-empty-state">
          <strong>Henüz review kaydı yok.</strong>
          <p>Normalize ve duplicate akışı yeni kayıt ürettiğinde liste burada dolacak.</p>
        </section>
      ) : (
        <section className="review-list-shell">
          <div className="review-list-head">
            <span>Ham kayıt</span>
            <span>Eşleşme ve detay</span>
            <span>Durum</span>
            <span>Aksiyonlar</span>
          </div>
          <div className="review-list">
            {snapshot.queue.map((item) => {
              const isBusy = activeActionId === item.id

              return (
                <article key={item.id} className="review-row">
                  <div className="review-row-primary">
                    <div className="review-row-title-wrap">
                      <h3 className="review-row-title">{item.rawPlace.nameRaw || 'İsimsiz kayıt'}</h3>
                      <span className="review-row-subtitle">{item.rawPlace.categoryRaw || 'Belirsiz kategori'}</span>
                    </div>
                    <div className="review-row-meta">
                      <span>{item.rawPlace.addressRaw || 'Adres yok'}</span>
                      <span>{item.rawPlace.phoneRaw || 'Telefon yok'}</span>
                      <span>{item.rawPlace.websiteRaw || 'Website yok'}</span>
                    </div>
                  </div>

                  <div className="review-row-match">
                    {item.candidatePlace ? (
                      <>
                        <strong>{item.candidatePlace.name}</strong>
                        <span>{item.candidatePlace.slug}</span>
                        <span>{item.candidatePlace.categoryPrimary} | {formatPlaceStatus(item.candidatePlace.status)}</span>
                      </>
                    ) : (
                      <span>Otomatik aday bulunmadı. Yeni mekan gibi duruyor.</span>
                    )}
                  </div>

                  <div className="review-row-status">
                    <span className={`review-pill review-pill-${item.status}`}>{formatReviewStatus(item.status)}</span>
                    <span className="review-row-reason">{item.score !== null ? `Skor ${item.score}` : item.reason}</span>
                    <span className="review-row-date">{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="review-row-actions admin-card-actions">
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => runReviewAction(item.id, 'start_review')} disabled={isBusy}>
                      Incele
                    </button>
                    <button type="button" className="admin-button admin-button-primary" onClick={() => runReviewAction(item.id, 'approve')} disabled={isBusy}>
                      Onayla
                    </button>
                    <button type="button" className="admin-button admin-button-ghost" onClick={() => runReviewAction(item.id, 'merge', item.candidatePlace?.id ?? null)} disabled={isBusy || !item.candidatePlace}>
                      Birlestir
                    </button>
                    <button type="button" className="admin-button admin-button-danger" onClick={() => runReviewAction(item.id, 'reject')} disabled={isBusy}>
                      Reddet
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

function decodeLabel(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function formatSweepStatus(status: GridSweepStatus) {
  switch (status) {
    case 'completed':
      return 'Tamamlandi'
    case 'running':
      return 'Calisiyor'
    case 'partial':
      return 'Kismen tamam'
    case 'failed':
      return 'Hata'
    default:
      return status
  }
}

function formatCellStatus(status: GridSweepCellItem['status']) {
  switch (status) {
    case 'success':
      return 'Basarili'
    case 'failed':
      return 'Hata'
    case 'pending':
      return 'Bekliyor'
    default:
      return status
  }
}

function formatReviewStatus(status: ReviewQueueStatus) {
  switch (status) {
    case 'pending':
      return 'Bekliyor'
    case 'in_review':
      return 'Inceleniyor'
    case 'approved':
      return 'Onaylandi'
    case 'merged':
      return 'Birlestirildi'
    case 'rejected':
      return 'Reddedildi'
    default:
      return status
  }
}

function mapProcessingStatusTone(status: string) {
  if (status === 'review' || status === 'normalized') {
    return 'completed'
  }

  if (status === 'rejected' || status === 'error') {
    return 'failed'
  }

  return 'pending'
}

function formatProcessingStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Ham kayıt'
    case 'review':
      return 'Editor bekliyor'
    case 'normalized':
      return 'Hazirlandi'
    case 'rejected':
      return 'Reddedildi'
    case 'error':
      return 'Hata'
    default:
      return status
  }
}

function formatPlaceStatus(status: string) {
  switch (status) {
    case 'draft':
      return 'Taslak'
    case 'review':
      return 'Review'
    case 'published':
      return 'Yayında'
    case 'archived':
      return 'Arsiv'
    default:
      return status
  }
}

function formatVerificationStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Bekliyor'
    case 'reviewed':
      return 'Gozden gecirildi'
    case 'verified':
      return 'Dogrulandi'
    case 'rejected':
      return 'Reddedildi'
    default:
      return status
  }
}

function formatSweepMode(presetName: string | null, cellSizeMeters: number) {
  const mode = presetName ? presetName.replaceAll('_', ' ') : 'manuel sweep'
  return `${mode} • ${cellSizeMeters}m kare grid`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Tarih yok'
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatBbox(bbox: { south: number; west: number; north: number; east: number }) {
  return `${bbox.south.toFixed(3)}, ${bbox.west.toFixed(3)} • ${bbox.north.toFixed(3)}, ${bbox.east.toFixed(3)}`
}
