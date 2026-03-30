import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPlaceCategoryLabel } from '@/lib/place-taxonomy'
import { getPublishedPlaceBySlug } from '@/lib/public-place-store'

type PlaceDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const { slug } = await params
  const place = await getPublishedPlaceBySlug(slug)

  if (!place) {
    notFound()
  }

  const heroImage = place.imageUrls[0] || 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1600&q=80'
  const gallery = place.imageUrls.slice(1, 5)

  return (
    <main className="container place-detail-shell">
      <section className="place-detail-hero">
        <div className="place-detail-hero-media" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="place-detail-hero-shade" />
        <div className="place-detail-hero-copy">
          <span className="place-detail-kicker">{getPlaceCategoryLabel(place.categoryPrimary)}</span>
          <h1 className="place-detail-title">{place.headline}</h1>
          <p className="place-detail-intro">{place.shortDescription}</p>

          <div className="place-detail-actions">
            <Link href="/#categories" className="place-detail-primary">
              Kategorilere dön
            </Link>
            {place.website ? (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="place-detail-secondary">
                Websiteyi aç
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="place-detail-grid">
        <article className="place-detail-story">
          <div className="place-detail-section-head">
            <span className="place-detail-section-kicker">Mekan hikayesi</span>
            <h2>{place.name}</h2>
          </div>
          <p>{place.longDescription}</p>
        </article>

        <aside className="place-detail-info">
          <div className="place-info-card">
            <span className="place-info-label">Kategori</span>
            <strong>{getPlaceCategoryLabel(place.categoryPrimary)}</strong>
          </div>
          <div className="place-info-card">
            <span className="place-info-label">Adres</span>
            <strong>{place.address || 'Adres bilgisi yakında eklenecek.'}</strong>
          </div>
          <div className="place-info-card">
            <span className="place-info-label">Telefon</span>
            <strong>{place.phone || 'Telefon bilgisi yok.'}</strong>
          </div>
          <div className="place-info-card">
            <span className="place-info-label">Bağlantılar</span>
            {place.website ? (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="place-info-link">
                Resmi website
              </a>
            ) : (
              <strong>Website yok.</strong>
            )}
          </div>
        </aside>
      </section>

      {gallery.length > 0 ? (
        <section className="place-detail-gallery">
          <div className="place-detail-section-head">
            <span className="place-detail-section-kicker">Galeri</span>
            <h2>Mekândan kareler</h2>
          </div>
          <div className="place-detail-gallery-grid">
            {gallery.map((imageUrl, index) => (
              <div
                key={`${place.id}-gallery-${index}`}
                className="place-detail-gallery-item"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
