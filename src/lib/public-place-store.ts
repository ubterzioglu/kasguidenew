import 'server-only'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export type PublicPlaceListItem = {
  id: string
  slug: string
  name: string
  headline: string
  shortDescription: string
  categoryPrimary: string
  address: string | null
  phone: string | null
  website: string | null
  imageUrl: string | null
}

export type PublicPlaceDetail = {
  id: string
  slug: string
  name: string
  headline: string
  shortDescription: string
  longDescription: string
  categoryPrimary: string
  address: string | null
  phone: string | null
  website: string | null
  imageUrls: string[]
}

type PlaceRow = {
  id: string
  slug: string
  name: string
  category_primary: string
  address: string | null
  phone: string | null
  website: string | null
}

type ContentRow = {
  place_id: string
  headline: string | null
  short_text: string | null
  long_text?: string | null
}

type ImageRow = {
  place_id: string
  public_url: string | null
  storage_path: string
}

export async function listPublishedPlacesByCategory(categoryId: string, limit = 12) {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin bağlantısı hazır değil.')
  }

  const { data: placeData, error: placeError } = await client
    .from('places')
    .select('id, slug, name, category_primary, address, phone, website')
    .eq('status', 'published')
    .eq('category_primary', categoryId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (placeError) {
    throw new Error('Yayındaki mekanlar okunamadı.')
  }

  const places = (placeData ?? []) as PlaceRow[]
  const placeIds = places.map((place) => place.id)

  if (placeIds.length === 0) {
    return [] as PublicPlaceListItem[]
  }

  const [contentResult, imageResult] = await Promise.all([
    client.from('place_content').select('place_id, headline, short_text').in('place_id', placeIds),
    client
      .from('place_images')
      .select('place_id, public_url, storage_path')
      .in('place_id', placeIds)
      .order('sort_order', { ascending: true }),
  ])

  if (contentResult.error) {
    throw new Error('Mekan içerikleri okunamadı.')
  }

  if (imageResult.error) {
    throw new Error('Mekan görselleri okunamadı.')
  }

  const contentMap = new Map<string, ContentRow>()
  const imageMap = new Map<string, string>()

  for (const row of (contentResult.data ?? []) as ContentRow[]) {
    contentMap.set(row.place_id, row)
  }

  for (const row of (imageResult.data ?? []) as ImageRow[]) {
    if (!imageMap.has(row.place_id)) {
      imageMap.set(row.place_id, row.public_url || row.storage_path)
    }
  }

  return places.map((place) => {
    const content = contentMap.get(place.id)

    return {
      id: place.id,
      slug: place.slug,
      name: place.name,
      headline: content?.headline || place.name,
      shortDescription: content?.short_text || `${place.name} Kaş Guide yayın listesinde yer alıyor.`,
      categoryPrimary: place.category_primary,
      address: place.address,
      phone: place.phone,
      website: place.website,
      imageUrl: imageMap.get(place.id) ?? null,
    }
  })
}

export async function getPublishedPlaceBySlug(slug: string) {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin bağlantısı hazır değil.')
  }

  const { data: placeData, error: placeError } = await client
    .from('places')
    .select('id, slug, name, category_primary, address, phone, website')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (placeError) {
    throw new Error('Mekan detayı okunamadı.')
  }

  const place = (placeData ?? null) as PlaceRow | null

  if (!place) {
    return null
  }

  const [contentResult, imageResult] = await Promise.all([
    client
      .from('place_content')
      .select('place_id, headline, short_text, long_text')
      .eq('place_id', place.id)
      .maybeSingle(),
    client
      .from('place_images')
      .select('place_id, public_url, storage_path')
      .eq('place_id', place.id)
      .order('sort_order', { ascending: true }),
  ])

  if (contentResult.error) {
    throw new Error('Mekan içeriği okunamadı.')
  }

  if (imageResult.error) {
    throw new Error('Mekan görselleri okunamadı.')
  }

  const content = (contentResult.data ?? null) as ContentRow | null
  const imageUrls = ((imageResult.data ?? []) as ImageRow[]).map(
    (row) => row.public_url || row.storage_path,
  )

  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    headline: content?.headline || place.name,
    shortDescription: content?.short_text || `${place.name} Kaş Guide yayın listesinde yer alıyor.`,
    longDescription:
      content?.long_text || content?.short_text || `${place.name} için detaylı içerik yakında eklenecek.`,
    categoryPrimary: place.category_primary,
    address: place.address,
    phone: place.phone,
    website: place.website,
    imageUrls,
  } satisfies PublicPlaceDetail
}

