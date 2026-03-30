import 'server-only'

import { DEFAULT_HERO_SLIDES, reindexHeroSlides, type HeroSlide } from '@/lib/hero-slide-data'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

type HeroSlideRow = {
  id: string
  eyebrow: string
  title: string
  description: string
  tags: string[] | null
  image_url: string
  is_active: boolean
  sort_order: number | null
}

export type HeroSlideSnapshot = {
  slides: HeroSlide[]
  source: 'seed' | 'supabase'
}

const HERO_SLIDES_TABLE = 'hero_slides'

export function isHeroSlideStoreConfigured() {
  return Boolean(getSupabaseAdminClient())
}

export async function listPublicHeroSlides(): Promise<HeroSlideSnapshot> {
  const snapshot = await readHeroSlides(true)

  return {
    ...snapshot,
    slides: snapshot.slides.filter((slide) => slide.isActive),
  }
}

export async function listAdminHeroSlides(): Promise<HeroSlideSnapshot> {
  return readHeroSlides(false)
}

export async function saveHeroSlides(slides: HeroSlide[]): Promise<HeroSlideSnapshot> {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Hero veri deposu hazir degil.')
  }

  const normalizedSlides = reindexHeroSlides(slides)
  const payload = normalizedSlides.map((slide) => ({
    id: slide.id,
    eyebrow: slide.eyebrow,
    title: slide.title,
    description: slide.description,
    tags: slide.tags,
    image_url: slide.imageUrl,
    is_active: slide.isActive,
    sort_order: slide.order,
  }))

  const { error: upsertError } = await client
    .from(HERO_SLIDES_TABLE)
    .upsert(payload, { onConflict: 'id' })

  if (upsertError) {
    throw new Error('Hero sahneleri kaydedilemedi.')
  }

  const { data: existingRows, error: existingRowsError } = await client
    .from(HERO_SLIDES_TABLE)
    .select('id')

  if (existingRowsError) {
    throw new Error('Hero sahneleri dogrulanamadi.')
  }

  const incomingIds = new Set(normalizedSlides.map((slide) => slide.id))
  const idsToDelete = existingRows?.map((row) => row.id).filter((id) => !incomingIds.has(id)) ?? []

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await client.from(HERO_SLIDES_TABLE).delete().in('id', idsToDelete)

    if (deleteError) {
      throw new Error('Silinen hero sahneleri temizlenemedi.')
    }
  }

  return {
    slides: normalizedSlides,
    source: 'supabase',
  }
}

async function readHeroSlides(onlyActive: boolean): Promise<HeroSlideSnapshot> {
  const client = getSupabaseAdminClient()

  if (!client) {
    return {
      slides: fallbackSlides(onlyActive),
      source: 'seed',
    }
  }

  let query = client
    .from(HERO_SLIDES_TABLE)
    .select('id, eyebrow, title, description, tags, image_url, is_active, sort_order')
    .order('sort_order', { ascending: true })

  if (onlyActive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    return {
      slides: fallbackSlides(onlyActive),
      source: 'seed',
    }
  }

  return {
    slides: reindexHeroSlides(data.map(mapHeroSlideRow)),
    source: 'supabase',
  }
}

function fallbackSlides(onlyActive: boolean): HeroSlide[] {
  return onlyActive
    ? DEFAULT_HERO_SLIDES.filter((slide) => slide.isActive)
    : DEFAULT_HERO_SLIDES
}

function mapHeroSlideRow(row: HeroSlideRow): HeroSlide {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    imageUrl: row.image_url,
    isActive: row.is_active,
    order: row.sort_order ?? 0,
  }
}