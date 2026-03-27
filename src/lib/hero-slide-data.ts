export type HeroSlide = {
  id: string
  eyebrow: string
  title: string
  description: string
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
    description:
      'Hero alanında dönüşümlü olarak duyurular, etkinlikler ve öne çıkan rotalar bu sahnelerin üstünde gösterilecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 0,
  },
  {
    id: 'hero-scene-02',
    eyebrow: 'Kaş Sahne 02',
    title: 'Turkuaz su, kıyı çizgisi ve sakin bir gün.',
    description:
      'Büyük başlıklar, kısa açıklamalar ve kampanya mesajları için sinematik bir arka plan akışına uygun bir sahne.',
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 1,
  },
  {
    id: 'hero-scene-03',
    eyebrow: 'Kaş Sahne 03',
    title: 'Patara yönünde geniş ufuk ve sahil dokusu.',
    description:
      'Her sahne farklı bir atmosfer taşıyabilir; yaz sezonu, etkinlik haftası ya da yerel öneriler gibi.',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 2,
  },
  {
    id: 'hero-scene-04',
    eyebrow: 'Kaş Sahne 04',
    title: 'Kıyıya açılan tekneler ve yazın hafifliği.',
    description:
      'Bu vitrin yapısı, tek ekranda hem görsel etki hem de hızlı yönlendirme vermek için tasarlandı.',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 3,
  },
  {
    id: 'hero-scene-05',
    eyebrow: 'Kaş Sahne 05',
    title: 'Deniz, taş kıyı ve maviye bakan rotalar.',
    description:
      'Carousel altındaki oklar ve geçiş kareleri sayesinde içerikler kolayca gezilebilecek.',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    order: 4,
  },
  {
    id: 'hero-scene-06',
    eyebrow: 'Kaş Sahne 06',
    title: 'Yumuşak gün batımıyla Kaş manzarası.',
    description:
      'Hero sahneleri kampanya, festival, plaj önerisi ya da özel içerik serisi gibi farklı ihtiyaçlara uyarlanabilir.',
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
    imageUrl: '',
    isActive: true,
    order,
  }
}

export function reindexHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((slide, index) => ({
    ...slide,
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
    eyebrow: readTextField(record.eyebrow, 'Etiket', 1, 48),
    title: readTextField(record.title, 'Başlık', 3, 120),
    description: readTextField(record.description, 'Açıklama', 10, 320),
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

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
