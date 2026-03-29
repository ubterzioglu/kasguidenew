'use client'

import { useState } from 'react'

type ReviewQueueStatus = 'pending' | 'in_review' | 'approved' | 'merged' | 'rejected'
type ReviewAction = 'start_review' | 'approve' | 'merge' | 'reject'
type GridSweepStatus = 'running' | 'completed' | 'partial' | 'failed'
type StatusTone = 'neutral' | 'success' | 'error'

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

type ReviewDashboardSnapshot = {
  queue: ReviewQueueItem[]
  sweeps: GridSweepItem[]
  stats: {
    pendingReviews: number
    pendingRawPlaces: number
    draftPlaces: number
    publishedPlaces: number
    trackedSweeps: number
    runningSweeps: number
  }
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
  message: 'Review ve sweep paneli hazir. Admin parolasi ile operasyon verisini yukleyebilirsiniz.',
}

const EMPTY_SNAPSHOT: ReviewDashboardSnapshot = {
  queue: [],
  sweeps: [],
  stats: {
    pendingReviews: 0,
    pendingRawPlaces: 0,
    draftPlaces: 0,
    publishedPlaces: 0,
    trackedSweeps: 0,
    runningSweeps: 0,
  },
}

export default function ReviewAdminPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [snapshot, setSnapshot] = useState<ReviewDashboardSnapshot>(EMPTY_SNAPSHOT)
  const [status, setStatus] = useState<PanelStatus>(INITIAL_STATUS)
  const [isLoading, setIsLoading] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  async function loadDashboard() {
    if (!adminPassword.trim()) {
      setStatus({ tone: 'error', message: 'Review panelini acmak icin ADMIN_PASSWORD gerekli.' })
      return
    }

    setIsLoading(true)
    setStatus({ tone: 'neutral', message: 'Review kuyrugu ve grid tarama kayitlari yukleniyor...' })

    try {
      const response = await fetch('/api/admin/review?limit=40', {
        headers: {
          'X-Admin-Password': adminPassword.trim(),
        },
        cache: 'no-store',
      })

      const payload = (await response.json()) as ReviewDashboardSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Admin verisi yuklenemedi.')
      }

      setSnapshot(payload)
      setStatus({
        tone: 'success',
        message:
          payload.queue.length > 0 || payload.sweeps.length > 0
            ? `${payload.queue.length} review kaydi ve ${payload.sweeps.length} grid sweep yuklendi.`
            : 'Henuz review ya da grid sweep kaydi yok.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Admin verisi yuklenemedi.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function runAction(reviewId: string, action: ReviewAction, candidatePlaceId?: string | null) {
    if (!adminPassword.trim()) {
      setStatus({ tone: 'error', message: 'Aksiyon icin ADMIN_PASSWORD gerekli.' })
      return
    }

    setActiveActionId(reviewId)
    setStatus({ tone: 'neutral', message: 'Review aksiyonu uygulaniyor...' })

    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword.trim(),
        },
        body: JSON.stringify({ reviewId, action, candidatePlaceId }),
      })

      const payload = (await response.json()) as ReviewDashboardSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Review aksiyonu basarisiz oldu.')
      }

      setSnapshot(payload)
      setStatus({ tone: 'success', message: 'Review kaydi guncellendi.' })
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Review aksiyonu basarisiz oldu.',
      })
    } finally {
      setActiveActionId(null)
    }
  }

  return (
    <main className="container admin-shell">
      <section className="admin-hero">
        <div className="admin-hero-copy admin-hero-copy-review">
          <span className="admin-eyebrow">Review ve Sweep</span>
          <h1 className="admin-title">Grid sweep takibi ve eklenecek mekanlar tek ekranda</h1>
          <p className="admin-description">
            Taradigimiz 500 metre kare gridleri, hata alan hucreleri ve review bekleyen mekanlari bu panelden
            takip edecegiz. Amac operasyonu hizlandirmak ve hangi alanin toplandigini net gormek.
          </p>
          <div className="admin-hero-notes">
            <span>Grid origin: Kas Merkez 36.199383, 29.641333</span>
            <span>Hucre boyutu: 500m x 500m</span>
          </div>
        </div>

        <div className="admin-summary-card admin-summary-card-review">
          <div className="admin-summary-item">
            <span className="admin-summary-label">Pending review</span>
            <strong>{snapshot.stats.pendingReviews}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Ham kayit</span>
            <strong>{snapshot.stats.pendingRawPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Taslak mekan</span>
            <strong>{snapshot.stats.draftPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Yayinda</span>
            <strong>{snapshot.stats.publishedPlaces}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Toplam sweep</span>
            <strong>{snapshot.stats.trackedSweeps}</strong>
          </div>
          <div className="admin-summary-item">
            <span className="admin-summary-label">Calisan sweep</span>
            <strong>{snapshot.stats.runningSweeps}</strong>
          </div>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-panel admin-panel-review">
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
              className="admin-button admin-button-primary"
              onClick={loadDashboard}
              disabled={isLoading}
            >
              {isLoading ? 'Yukleniyor...' : 'Paneli yenile'}
            </button>
          </div>
        </div>

        <div className={`admin-status admin-status-${status.tone}`}>
          <span>{status.message}</span>
        </div>
      </section>

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Grid sweep gecmisi</h2>
          <p className="admin-section-copy">
            Taradigimiz kareleri, hangi hucrelerin basarili oldugunu ve nerede hata aldigimizi buradan izleyebiliriz.
          </p>
        </div>
      </section>

      {snapshot.sweeps.length === 0 ? (
        <section className="admin-empty-state">
          <strong>Henuz kaydedilmis bir grid sweep yok.</strong>
          <p>Gercek bir `import:osm` calismasi tamamlandiginda sweep kartlari burada gorunecek.</p>
        </section>
      ) : (
        <section className="sweep-board">
          {snapshot.sweeps.map((sweep) => {
            const progress = sweep.totalCells > 0 ? Math.round((sweep.processedCells / sweep.totalCells) * 100) : 0

            return (
              <article key={sweep.id} className="sweep-card">
                <div className="sweep-card-header">
                  <div>
                    <span className={`review-pill review-pill-${sweep.status}`}>{sweep.status}</span>
                    <h3 className="sweep-card-title">{decodeLabel(sweep.regionName)}</h3>
                    <p className="sweep-card-copy">
                      {sweep.presetName ? `${decodeLabel(sweep.presetName)} preset` : 'Manuel bbox'} • {sweep.cellSizeMeters}m kare
                    </p>
                  </div>
                  <div className="sweep-card-meta">
                    <span>{formatDate(sweep.startedAt)}</span>
                    <strong>%{progress}</strong>
                  </div>
                </div>

                <div className="sweep-progress-track">
                  <span className="sweep-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="sweep-stats-grid">
                  <div>
                    <span>Origin</span>
                    <strong>
                      {sweep.originLat.toFixed(6)}, {sweep.originLng.toFixed(6)}
                    </strong>
                  </div>
                  <div>
                    <span>BBox</span>
                    <strong>
                      {sweep.bbox.south.toFixed(3)}, {sweep.bbox.west.toFixed(3)} → {sweep.bbox.north.toFixed(3)},{' '}
                      {sweep.bbox.east.toFixed(3)}
                    </strong>
                  </div>
                  <div>
                    <span>Hucre</span>
                    <strong>
                      {sweep.processedCells}/{sweep.totalCells}
                    </strong>
                  </div>
                  <div>
                    <span>Basarili / Hata</span>
                    <strong>
                      {sweep.successfulCells} / {sweep.failedCells}
                    </strong>
                  </div>
                </div>

                <div className="sweep-cell-list">
                  {sweep.cells.length === 0 ? (
                    <p className="sweep-empty-copy">Bu sweep icin henuz hucre kaydi yok.</p>
                  ) : (
                    sweep.cells.map((cell) => (
                      <div key={cell.id} className={`sweep-cell sweep-cell-${cell.status}`}>
                        <div className="sweep-cell-head">
                          <strong>Grid #{cell.cellIndex}</strong>
                          <span>{cell.status}</span>
                        </div>
                        <p>
                          {cell.fetchedCount} fetch • {cell.preparedCount} uygun kayit
                        </p>
                        <p>
                          {cell.bbox.south.toFixed(3)}, {cell.bbox.west.toFixed(3)} → {cell.bbox.north.toFixed(3)},{' '}
                          {cell.bbox.east.toFixed(3)}
                        </p>
                        {cell.errorMessage ? <p className="sweep-cell-error">{cell.errorMessage}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section className="admin-list-header">
        <div>
          <h2 className="admin-section-title">Eklenecek mekanlar</h2>
          <p className="admin-section-copy">
            Review bekleyen kayitlari satir satir gorup hizli karar verebilmek icin liste gorunumu kullaniyoruz.
          </p>
        </div>
      </section>

      {snapshot.queue.length === 0 ? (
        <section className="admin-empty-state">
          <strong>Henuz review kaydi yok.</strong>
          <p>Normalize ve duplicate akisi yeni kayit urettiginde liste burada dolacak.</p>
        </section>
      ) : (
        <section className="review-list-shell">
          <div className="review-list-head">
            <span>Ham kayit</span>
            <span>Eslesme ve detay</span>
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
                      <h3 className="review-row-title">{item.rawPlace.nameRaw || 'Isimsiz kayit'}</h3>
                      <span className="review-row-subtitle">{item.rawPlace.categoryRaw || 'Belirsiz kategori'}</span>
                    </div>
                    <div className="review-row-meta">
                      <span>{item.rawPlace.addressRaw || 'Adres yok'}</span>
                      <span>{item.rawPlace.phoneRaw || 'Telefon yok'}</span>
                      <span>{item.rawPlace.websiteRaw || 'Website yok'}</span>
                      <span>
                        {item.rawPlace.sourceName} / {item.rawPlace.sourceId}
                      </span>
                    </div>
                  </div>

                  <div className="review-row-match">
                    {item.candidatePlace ? (
                      <>
                        <strong>{item.candidatePlace.name}</strong>
                        <span>{item.candidatePlace.slug}</span>
                        <span>
                          {item.candidatePlace.categoryPrimary} • {item.candidatePlace.status}
                        </span>
                      </>
                    ) : (
                      <span>Otomatik aday bulunmadi. Yeni mekan gibi duruyor.</span>
                    )}
                  </div>

                  <div className="review-row-status">
                    <span className={`review-pill review-pill-${item.status}`}>{item.status}</span>
                    <span className="review-row-reason">{item.score !== null ? `Skor ${item.score}` : item.reason}</span>
                    <span className="review-row-date">{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="review-row-actions admin-card-actions">
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={() => runAction(item.id, 'start_review')}
                      disabled={isBusy}
                    >
                      Incele
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button-primary"
                      onClick={() => runAction(item.id, 'approve')}
                      disabled={isBusy}
                    >
                      Onayla
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button-ghost"
                      onClick={() => runAction(item.id, 'merge', item.candidatePlace?.id ?? null)}
                      disabled={isBusy || !item.candidatePlace}
                    >
                      Birlestir
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button-danger"
                      onClick={() => runAction(item.id, 'reject')}
                      disabled={isBusy}
                    >
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}