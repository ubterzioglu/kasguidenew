export type HeroSlide = {
  id: string
  eyebrow: string
  title: string
  description: string
  tags: string[]
  imageUrl: string
  isActive: boolean
  order: number
}

export const MAX_HERO_SLIDES = 12
export const HERO_ROTATION_MS = 5000

const HERO_SLIDE_SEEDS: HeroSlide[] = [
  {
    id: 'hero-scene-01',
    eyebrow: 'Kaş Sahne 01',
    title: 'Akşam ışığında Kaş kıyıları.',
    description: 'Gün batımı, mekan önerileri ve sezonun en güzel rotaları tek vitrinde.',
    tags: ['Gün Batımı', 'Öne Çıkan', 'Kaş Merkez'],
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 0,
  },
  {
    id: 'hero-scene-02',
    eyebrow: 'Kaş Sahne 02',
    title: 'Turkuaz su, sakin koylar ve hafif bir yaz günü.',
    description: 'Plajlar, deniz keyfi ve günlük kaçamaklar için ferah bir sahne akışı.',
    tags: ['Plaj', 'Deniz', 'Yaz'],
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 1,
  },
  {
    id: 'hero-scene-03',
    eyebrow: 'Kaş Sahne 03',
    title: 'Ufka açılan sahil rotaları ve geniş manzara.',
    description: 'Keşif, doğa ve yol üstü durakları tek hero akışı içinde anlatmak için uygun.',
    tags: ['Keşif', 'Doğa', 'Rota'],
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 2,
  },
  {
    id: 'hero-scene-04',
    eyebrow: 'Kaş Sahne 04',
    title: 'Tekneler, kıyılar ve yazın hafifliği.',
    description: 'Etkinlikler, kısa duyurular ve haftalık öneri seçimleri için esnek bir sahne.',
    tags: ['Etkinlik', 'Duyuru', 'Yaz'],
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 3,
  },
  {
    id: 'hero-scene-05',
    eyebrow: 'Kaş Sahne 05',
    title: 'Maviye bakan taş kıyılar ve yavaş akan bir rota.',
    description: 'Mekan seçimleri, öne çıkan rehberler ve hafta sonu önerileri için hazır.',
    tags: ['Rehber', 'Mekan', 'Hafta Sonu'],
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 4,
  },
  {
    id: 'hero-scene-06',
    eyebrow: 'Kaş Sahne 06',
    title: 'Yumuşak gün batımıyla sakin bir Kaş manzarası.',
    description: 'Festival, kampanya ya da özel içerik serilerini öne çıkarmak için kullanılabilir.',
    tags: ['Festival', 'Kampanya', 'Özel İçerik'],
    imageUrl:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 5,
  },
]

export const DEFAULT_HERO_SLIDES = reindexHeroSlides(HERO_SLIDE_SEEDS)

export function createHeroSlideId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `hero-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyHeroSlide(order: number): HeroSlide {
  return {
    id: createHeroSlideId(),
    eyebrow: `Kaş Sahne ${String(order + 1).padStart(2, '0')}`,
    title: '',
    description: '',
    tags: ['Öne Çıkan'],
    imageUrl: '',
    isActive: true,
    order,
  }
}

export function reindexHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((slide, index) => ({
    ...slide,
    eyebrow: repairMojibakeText(slide.eyebrow),
    title: repairMojibakeText(slide.title),
    description: repairMojibakeText(slide.description),
    tags: normalizeTagList(slide.tags),
    order: index,
  }))
}

export function normalizeHeroSlidesInput(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) {
    throw new Error('Hero verisi dizi formatında olmalı.')
  }

  if (input.length === 0) {
    throw new Error('En az bir hero sahnesi gerekli.')
  }

  if (input.length > MAX_HERO_SLIDES) {
    throw new Error(`En fazla ${MAX_HERO_SLIDES} hero sahnesi kaydedebilirsiniz.`)
  }

  const ids = new Set<string>()
  const slides = input.map((item, index) => normalizeHeroSlideItem(item, index))

  for (const slide of slides) {
    if (ids.has(slide.id)) {
      throw new Error('Hero sahne kimlikleri benzersiz olmalı.')
    }

    ids.add(slide.id)
  }

  if (!slides.some((slide) => slide.isActive)) {
    throw new Error('En az bir aktif hero sahnesi olmalı.')
  }

  return reindexHeroSlides(slides)
}

function normalizeHeroSlideItem(input: unknown, index: number): HeroSlide {
  if (!input || typeof input !== 'object') {
    throw new Error(`Sahne ${index + 1} geçersiz formatta.`)
  }

  const record = input as Record<string, unknown>
  const rawId = toTrimmedString(record.id)

  return {
    id: rawId || createHeroSlideId(),
    eyebrow: readTextField(record.eyebrow, 'Üst etiket', 1, 48),
    title: readTextField(record.title, 'Başlık', 3, 120),
    description: readTextField(record.description, 'Alt başlık', 10, 220),
    tags: readTagsField(record.tags),
    imageUrl: readUrlField(record.imageUrl),
    isActive: Boolean(record.isActive),
    order: index,
  }
}

function readTextField(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number,
): string {
  const text = toTrimmedString(value)

  if (text.length < minLength) {
    throw new Error(`${fieldName} en az ${minLength} karakter olmalı.`)
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName} en fazla ${maxLength} karakter olabilir.`)
  }

  return text
}

function readTagsField(value: unknown): string[] {
  const tags = normalizeTagList(value)

  if (tags.length === 0) {
    throw new Error('En az bir tag girilmeli.')
  }

  if (tags.length > 6) {
    throw new Error('Bir slide için en fazla 6 tag kullanabilirsiniz.')
  }

  return tags
}

function readUrlField(value: unknown): string {
  const text = toTrimmedString(value)

  if (!text) {
    throw new Error('Görsel bağlantısı zorunlu.')
  }

  let url: URL

  try {
    url = new URL(text)
  } catch {
    throw new Error('Görsel bağlantısı geçerli bir URL olmalı.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Görsel bağlantısı http veya https ile başlamalı.')
  }

  return url.toString()
}

function normalizeTagList(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  return items
    .map((item) => toTrimmedString(item))
    .filter(Boolean)
    .slice(0, 6)
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? repairMojibakeText(value).trim() : ''
}

function repairMojibakeText(value: string): string {
  if (!/[ÃÅÄâ]/.test(value)) {
    return value
  }

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff)
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return value
  }
}
