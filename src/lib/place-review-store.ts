import 'server-only'

import { randomUUID } from 'node:crypto'

import { getPlaceCategoryLabel, PLACE_CATEGORY_OPTIONS, suggestCategoryFromRaw } from '@/lib/place-taxonomy'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export type ReviewQueueStatus = 'pending' | 'in_review' | 'approved' | 'merged' | 'rejected'
export type ReviewAction = 'start_review' | 'approve' | 'merge' | 'reject'
export type GridSweepStatus = 'running' | 'completed' | 'partial' | 'failed'
export type GridSweepCellStatus = 'pending' | 'success' | 'failed'
export type RawPlaceSaveAction = 'save_draft' | 'publish' | 'reject'

export type ReviewQueueItem = {
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

export type GridSweepCellItem = {
  id: string
  cellIndex: number
  status: GridSweepCellStatus
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

export type GridSweepItem = {
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

export type PlaceEditorDraft = {
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

export type RecentRawPlaceItem = {
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

export type ReviewDashboardSnapshot = {
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

type ReviewQueueRow = {
  id: string
  reason: string
  status: ReviewQueueStatus
  notes: string | null
  score: number | null
  created_at: string
  updated_at: string
  raw_place:
    | {
        id: string
        source_name: string
        source_id: string
        name_raw: string | null
        lat: number | null
        lng: number | null
        address_raw: string | null
        phone_raw: string | null
        website_raw: string | null
        category_raw: string | null
        processing_status: string
        imported_at: string
      }
    | Array<{
        id: string
        source_name: string
        source_id: string
        name_raw: string | null
        lat: number | null
        lng: number | null
        address_raw: string | null
        phone_raw: string | null
        website_raw: string | null
        category_raw: string | null
        processing_status: string
        imported_at: string
      }>
    | null
  candidate_place:
    | {
        id: string
        name: string
        slug: string
        category_primary: string
        status: string
        verification_status: string
      }
    | Array<{
        id: string
        name: string
        slug: string
        category_primary: string
        status: string
        verification_status: string
      }>
    | null
}

type GridSweepRow = {
  id: string
  region_name: string
  preset_name: string | null
  status: GridSweepStatus
  origin_lat: number
  origin_lng: number
  cell_size_meters: number
  total_cells: number
  processed_cells: number
  successful_cells: number
  failed_cells: number
  bbox_south: number
  bbox_west: number
  bbox_north: number
  bbox_east: number
  started_at: string
  completed_at: string | null
}

type RecentRawPlaceRow = {
  id: string
  source_name: string
  source_id: string
  name_raw: string | null
  lat: number | null
  lng: number | null
  address_raw: string | null
  phone_raw: string | null
  website_raw: string | null
  category_raw: string | null
  processing_status: string
  imported_at: string
  raw_payload: {
    google?: {
      gridKey?: string
      cellId?: string
      place?: {
        googleMapsUri?: string
      }
    }
  } | null
}

type GridSweepCellRow = {
  id: string
  sweep_id: string
  cell_index: number
  status: GridSweepCellStatus
  south: number
  west: number
  north: number
  east: number
  fetched_count: number
  prepared_count: number
  error_message: string | null
  completed_at: string | null
}

type PlaceSourceRow = {
  raw_place_id: string | null
  place_id: string
}

type PlaceRow = {
  id: string
  slug: string
  name: string
  category_primary: string
  address: string | null
  phone: string | null
  website: string | null
  status: 'draft' | 'review' | 'published' | 'archived'
  verification_status: 'pending' | 'reviewed' | 'verified' | 'rejected'
}

type PlaceContentRow = {
  place_id: string
  headline: string | null
  short_text: string | null
  long_text: string | null
}

type PlaceImageRow = {
  place_id: string
  public_url: string | null
  storage_path: string
  sort_order: number
}

export function isPlaceReviewStoreConfigured() {
  return Boolean(getSupabaseAdminClient())
}

export async function getReviewDashboardSnapshot(limit = 24): Promise<ReviewDashboardSnapshot> {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin baglantisi hazir degil.')
  }

  const [
    queueResult,
    sweepsResult,
    rawResultsResult,
    pendingReviews,
    pendingRawPlaces,
    draftPlaces,
    publishedPlaces,
    trackedSweeps,
    runningSweeps,
  ] = await Promise.all([
    client
      .from('review_queue')
      .select(
        `
          id,
          reason,
          status,
          notes,
          score,
          created_at,
          updated_at,
          raw_place:raw_places (
            id,
            source_name,
            source_id,
            name_raw,
            lat,
            lng,
            address_raw,
            phone_raw,
            website_raw,
            category_raw,
            processing_status,
            imported_at
          ),
          candidate_place:places (
            id,
            name,
            slug,
            category_primary,
            status,
            verification_status
          )
        `,
      )
      .order('created_at', { ascending: true })
      .limit(limit),
    client
      .from('grid_sweeps')
      .select(
        `
          id,
          region_name,
          preset_name,
          status,
          origin_lat,
          origin_lng,
          cell_size_meters,
          total_cells,
          processed_cells,
          successful_cells,
          failed_cells,
          bbox_south,
          bbox_west,
          bbox_north,
          bbox_east,
          started_at,
          completed_at
        `,
      )
      .order('started_at', { ascending: false })
      .limit(6),
    client
      .from('raw_places')
      .select(
        `
          id,
          source_name,
          source_id,
          name_raw,
          lat,
          lng,
          address_raw,
          phone_raw,
          website_raw,
          category_raw,
          processing_status,
          imported_at,
          raw_payload
        `,
      )
      .order('imported_at', { ascending: false })
      .limit(Math.max(limit, 48)),
    countRows(client, 'review_queue', (query) => query.in('status', ['pending', 'in_review'])),
    countRows(client, 'raw_places', (query) => query.eq('processing_status', 'pending')),
    countRows(client, 'places', (query) => query.in('status', ['draft', 'review'])),
    countRows(client, 'places', (query) => query.eq('status', 'published')),
    countRows(client, 'grid_sweeps', (query) => query),
    countRows(client, 'grid_sweeps', (query) => query.eq('status', 'running')),
  ])

  if (queueResult.error) {
    throw new Error('Review kuyrugu okunamadi.')
  }

  if (sweepsResult.error) {
    throw new Error('Grid sweep kayıtları okunamadı.')
  }

  if (rawResultsResult.error) {
    throw new Error('Ham sweep sonuclari okunamadi.')
  }

  const rawRows = (rawResultsResult.data ?? []) as RecentRawPlaceRow[]
  const sweeps = await loadSweepCells(client, (sweepsResult.data ?? []) as GridSweepRow[])
  const draftMap = await loadDraftMapForRawPlaces(client, rawRows)

  return {
    queue: ((queueResult.data ?? []) as unknown as ReviewQueueRow[])
      .map(mapReviewQueueRow)
      .filter((item): item is ReviewQueueItem => item !== null),
    sweeps,
    rawResults: rawRows.map((row) => mapRecentRawPlaceRow(row, draftMap.get(row.id) ?? null)),
    stats: {
      pendingReviews,
      pendingRawPlaces,
      draftPlaces,
      publishedPlaces,
      trackedSweeps,
      runningSweeps,
    },
    categoryOptions: PLACE_CATEGORY_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
  }
}

export async function applyReviewAction(input: {
  reviewId: string
  action: ReviewAction
  notes?: string | null
  candidatePlaceId?: string | null
}) {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin baglantisi hazir degil.')
  }

  const { data: reviewRow, error: reviewError } = await client
    .from('review_queue')
    .select('id, raw_place_id, candidate_place_id')
    .eq('id', input.reviewId)
    .single()

  if (reviewError || !reviewRow) {
    throw new Error('Review kaydi bulunamadi.')
  }

  const notes = normalizeText(input.notes)

  switch (input.action) {
    case 'start_review': {
      await updateReviewQueue(client, input.reviewId, { status: 'in_review', notes })
      break
    }
    case 'approve': {
      await updateReviewQueue(client, input.reviewId, { status: 'approved', notes })
      await updateRawPlaceStatus(client, reviewRow.raw_place_id, 'review')
      break
    }
    case 'reject': {
      await updateReviewQueue(client, input.reviewId, { status: 'rejected', notes })
      await updateRawPlaceStatus(client, reviewRow.raw_place_id, 'rejected')
      break
    }
    case 'merge': {
      const candidatePlaceId = input.candidatePlaceId ?? reviewRow.candidate_place_id

      if (!candidatePlaceId) {
        throw new Error('Merge için candidate_place_id gerekli.')
      }

      await updateReviewQueue(client, input.reviewId, {
        status: 'merged',
        notes,
        candidate_place_id: candidatePlaceId,
      })
      await updateRawPlaceStatus(client, reviewRow.raw_place_id, 'normalized')
      break
    }
    default:
      throw new Error('Desteklenmeyen review aksiyonu.')
  }

  return getReviewDashboardSnapshot()
}

export async function applyRawPlaceAction(input: {
  rawPlaceId: string
  action: RawPlaceSaveAction
  draft?: PlaceEditorDraft
}) {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin baglantisi hazir degil.')
  }

  if (input.action === 'reject') {
    await rejectRawPlace(client, input.rawPlaceId)
    return getReviewDashboardSnapshot()
  }

  if (!input.draft) {
    throw new Error('Mekan taslagi gonderilmedi.')
  }

  await persistPlaceFromRaw(client, {
    rawPlaceId: input.rawPlaceId,
    draft: input.draft,
    publish: input.action === 'publish',
  })

  return getReviewDashboardSnapshot()
}

async function persistPlaceFromRaw(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  input: {
    rawPlaceId: string
    draft: PlaceEditorDraft
    publish: boolean
  },
) {
  const { data: rawPlace, error: rawPlaceError } = await client
    .from('raw_places')
    .select('id, source_name, source_id, name_raw, lat, lng, address_raw, phone_raw, website_raw, category_raw')
    .eq('id', input.rawPlaceId)
    .single()

  if (rawPlaceError || !rawPlace) {
    throw new Error('Ham mekan kaydi bulunamadi.')
  }

  const normalizedName = normalizeText(input.draft.name)
  const normalizedHeadline = normalizeText(input.draft.headline)
  const normalizedShortDescription = normalizeText(input.draft.shortDescription)
  const normalizedLongDescription = normalizeText(input.draft.longDescription)
  const normalizedCategory = normalizeText(input.draft.categoryPrimary)
  const normalizedAddress = normalizeText(input.draft.address)
  const normalizedPhone = normalizePhone(input.draft.phone)
  const normalizedWebsite = normalizeWebsite(input.draft.website)
  const normalizedImages = uniqueImageUrls(input.draft.imageUrls)

  if (!normalizedName) {
    throw new Error('Mekan adi zorunlu.')
  }

  if (!normalizedCategory) {
    throw new Error('Kategori seçilmesi zorunlu.')
  }

  if (!PLACE_CATEGORY_OPTIONS.some((option) => option.id === normalizedCategory)) {
    throw new Error('Geçersiz kategori seçimi.')
  }

  if (normalizedImages.length < 1 || normalizedImages.length > 5) {
    throw new Error('Her mekan için en az 1, en fazla 5 foto gerekli.')
  }

  const existingPlaceSource = await findPlaceSourceForRawPlace(client, input.rawPlaceId)
  const placeId = input.draft.placeId ?? existingPlaceSource?.place_id ?? randomUUID()
  const slugBase = slugifyText(input.draft.slug || normalizedName) || `place-${placeId.slice(0, 8)}`
  const slug = await ensureUniqueSlug(client, slugBase, placeId)
  const placeStatus = input.publish ? 'published' : 'draft'
  const verificationStatus = input.publish ? 'verified' : 'reviewed'

  const { error: placeError } = await client.from('places').upsert(
    {
      id: placeId,
      slug,
      name: normalizedName,
      category_primary: normalizedCategory,
      category_secondary: null,
      address: normalizedAddress,
      lat: rawPlace.lat ?? null,
      lng: rawPlace.lng ?? null,
      phone: normalizedPhone,
      website: normalizedWebsite,
      opening_hours: null,
      status: placeStatus,
      verification_status: verificationStatus,
    },
    { onConflict: 'id' },
  )

  if (placeError) {
    throw new Error('Mekan kaydi kaydedilemedi.')
  }

  const { error: contentError } = await client.from('place_content').upsert(
    {
      place_id: placeId,
      headline: normalizedHeadline || normalizedName,
      short_text: normalizedShortDescription,
      long_text: normalizedLongDescription,
      tone_type: 'guide',
      last_generated_at: null,
    },
    { onConflict: 'place_id' },
  )

  if (contentError) {
    throw new Error('Mekan icerigi kaydedilemedi.')
  }

  const { error: imageDeleteError } = await client.from('place_images').delete().eq('place_id', placeId)
  if (imageDeleteError) {
    throw new Error('Eski mekan gorselleri temizlenemedi.')
  }

  const { error: imageInsertError } = await client.from('place_images').insert(
    normalizedImages.map((url, index) => ({
      place_id: placeId,
      storage_path: url,
      public_url: url,
      alt_text: `${normalizedName} fotoğraf ${index + 1}`,
      source_name: 'admin_manual',
      is_cover: index === 0,
      sort_order: index,
    })),
  )

  if (imageInsertError) {
    throw new Error('Mekan gorselleri kaydedilemedi.')
  }

  const { error: sourceError } = await client.from('place_sources').upsert(
    {
      place_id: placeId,
      raw_place_id: rawPlace.id,
      source_name: rawPlace.source_name,
      source_id: rawPlace.source_id,
      source_url: null,
      is_primary: true,
    },
    { onConflict: 'source_name,source_id' },
  )

  if (sourceError) {
    throw new Error('Kaynak iliskisi kaydedilemedi.')
  }

  const { error: rawStatusError } = await client
    .from('raw_places')
    .update({ processing_status: input.publish ? 'normalized' : 'review' })
    .eq('id', rawPlace.id)

  if (rawStatusError) {
    throw new Error('Ham mekan durumu guncellenemedi.')
  }

  const { error: reviewUpdateError } = await client
    .from('review_queue')
    .update({
      candidate_place_id: placeId,
      status: input.publish ? 'approved' : 'in_review',
      notes: input.publish ? 'Admin panelinden onaylanıp yayına alındı.' : 'Admin panelinde düzenleniyor.',
    })
    .eq('raw_place_id', rawPlace.id)
    .in('status', ['pending', 'in_review', 'approved'])

  if (reviewUpdateError) {
    throw new Error('Review kuyrugu guncellenemedi.')
  }
}

async function rejectRawPlace(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawPlaceId: string,
) {
  await updateRawPlaceStatus(client, rawPlaceId, 'rejected')

  const { error } = await client
    .from('review_queue')
    .update({ status: 'rejected', notes: 'Admin panelinden reddedildi.' })
    .eq('raw_place_id', rawPlaceId)
    .in('status', ['pending', 'in_review', 'approved'])

  if (error) {
    throw new Error('Review kaydi reddedilemedi.')
  }
}

async function loadDraftMapForRawPlaces(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawRows: RecentRawPlaceRow[],
) {
  const map = new Map<string, PlaceEditorDraft>()
  const rawIds = rawRows.map((row) => row.id)

  if (rawIds.length === 0) {
    return map
  }

  const { data: sources, error: sourcesError } = await client
    .from('place_sources')
    .select('raw_place_id, place_id')
    .in('raw_place_id', rawIds)

  if (sourcesError) {
    throw new Error('Mekan kaynaklari okunamadi.')
  }

  const sourceRows = (sources ?? []) as PlaceSourceRow[]
  const placeIds = Array.from(new Set(sourceRows.map((row) => row.place_id)))

  const placeRows = new Map<string, PlaceRow>()
  const contentRows = new Map<string, PlaceContentRow>()
  const imageRows = new Map<string, string[]>()

  if (placeIds.length > 0) {
    const [placesResult, contentResult, imagesResult] = await Promise.all([
      client
        .from('places')
        .select('id, slug, name, category_primary, address, phone, website, status, verification_status')
        .in('id', placeIds),
      client.from('place_content').select('place_id, headline, short_text, long_text').in('place_id', placeIds),
      client
        .from('place_images')
        .select('place_id, public_url, storage_path, sort_order')
        .in('place_id', placeIds)
        .order('sort_order', { ascending: true }),
    ])

    if (placesResult.error) {
      throw new Error('Mekan kayıtları okunamadı.')
    }

    if (contentResult.error) {
      throw new Error('Mekan icerikleri okunamadi.')
    }

    if (imagesResult.error) {
      throw new Error('Mekan gorselleri okunamadi.')
    }

    for (const row of (placesResult.data ?? []) as PlaceRow[]) {
      placeRows.set(row.id, row)
    }

    for (const row of (contentResult.data ?? []) as PlaceContentRow[]) {
      contentRows.set(row.place_id, row)
    }

    for (const row of (imagesResult.data ?? []) as PlaceImageRow[]) {
      const current = imageRows.get(row.place_id) ?? []
      current.push(row.public_url || row.storage_path)
      imageRows.set(row.place_id, current)
    }
  }

  for (const rawRow of rawRows) {
    const relatedSource = sourceRows.find((item) => item.raw_place_id === rawRow.id) ?? null
    const place = relatedSource ? placeRows.get(relatedSource.place_id) ?? null : null
    const content = place ? contentRows.get(place.id) ?? null : null
    const images = place ? imageRows.get(place.id) ?? [] : []

    map.set(rawRow.id, buildDraftFromRaw(rawRow, place, content, images))
  }

  return map
}

function buildDraftFromRaw(
  rawRow: RecentRawPlaceRow,
  place: PlaceRow | null,
  content: PlaceContentRow | null,
  imageUrls: string[],
): PlaceEditorDraft {
  const fallbackName = normalizeText(rawRow.name_raw) || 'Yeni mekan'
  const categoryPrimary = place?.category_primary ?? suggestCategoryFromRaw(rawRow.category_raw)
  const categoryLabel = getPlaceCategoryLabel(categoryPrimary)

  return {
    placeId: place?.id ?? null,
    slug: place?.slug ?? slugifyText(fallbackName),
    name: place?.name ?? fallbackName,
    headline: normalizeText(content?.headline) ?? fallbackName,
    shortDescription:
      normalizeText(content?.short_text) ?? `${fallbackName}, Kaş'ta ${categoryLabel.toLowerCase()} olarak listelenen bir mekan.`,
    longDescription: normalizeText(content?.long_text) ?? '',
    categoryPrimary,
    address: normalizeText(place?.address) ?? normalizeText(rawRow.address_raw) ?? '',
    phone: normalizeText(place?.phone) ?? normalizeText(rawRow.phone_raw) ?? '',
    website: normalizeText(place?.website) ?? normalizeText(rawRow.website_raw) ?? '',
    imageUrls: imageUrls.length > 0 ? imageUrls.slice(0, 5) : [''],
    status: place?.status ?? 'draft',
    verificationStatus: place?.verification_status ?? 'pending',
  }
}

async function findPlaceSourceForRawPlace(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawPlaceId: string,
) {
  const { data, error } = await client
    .from('place_sources')
    .select('raw_place_id, place_id')
    .eq('raw_place_id', rawPlaceId)
    .maybeSingle()

  if (error) {
    throw new Error('Mekan kaynağı okunamadı.')
  }

  return data as PlaceSourceRow | null
}

async function loadSweepCells(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  sweeps: GridSweepRow[],
) {
  return Promise.all(
    sweeps.map(async (sweep) => {
      const { data, error } = await client
        .from('grid_sweep_cells')
        .select(
          `
            id,
            sweep_id,
            cell_index,
            status,
            south,
            west,
            north,
            east,
            fetched_count,
            prepared_count,
            error_message,
            completed_at
          `,
        )
        .eq('sweep_id', sweep.id)
        .order('cell_index', { ascending: false })
        .limit(8)

      if (error) {
        throw new Error('Grid hucreleri okunamadi.')
      }

      return mapGridSweepRow(sweep, ((data ?? []) as GridSweepCellRow[]).reverse())
    }),
  )
}

async function countRows(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  table: 'review_queue' | 'raw_places' | 'places' | 'grid_sweeps',
  mutate: (query: any) => any,
) {
  const response = await mutate(client.from(table).select('*', { count: 'exact', head: true }))

  if (response.error) {
    throw new Error(`Sayac okunamadi: ${table}`)
  }

  return response.count ?? 0
}

async function updateReviewQueue(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  reviewId: string,
  values: Record<string, string | null>,
) {
  const { error } = await client.from('review_queue').update(values).eq('id', reviewId)

  if (error) {
    throw new Error('Review kaydi guncellenemedi.')
  }
}

async function updateRawPlaceStatus(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawPlaceId: string,
  status: 'review' | 'rejected' | 'normalized',
) {
  const { error } = await client.from('raw_places').update({ processing_status: status }).eq('id', rawPlaceId)

  if (error) {
    throw new Error('Ham kayıt durumu güncellenemedi.')
  }
}

async function ensureUniqueSlug(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  baseSlug: string,
  currentPlaceId: string,
) {
  let slug = baseSlug
  let suffix = 1

  while (true) {
    const { data, error } = await client.from('places').select('id, slug').eq('slug', slug).maybeSingle()

    if (error) {
      throw new Error('Slug benzersizligi kontrol edilemedi.')
    }

    const existing = data as { id: string; slug: string } | null
    if (!existing || existing.id === currentPlaceId) {
      return slug
    }

    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }
}

function mapReviewQueueRow(row: ReviewQueueRow): ReviewQueueItem | null {
  const rawPlace = Array.isArray(row.raw_place) ? (row.raw_place[0] ?? null) : row.raw_place
  const candidatePlace = Array.isArray(row.candidate_place) ? (row.candidate_place[0] ?? null) : row.candidate_place

  if (!rawPlace) {
    return null
  }

  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rawPlace: {
      id: rawPlace.id,
      sourceName: rawPlace.source_name,
      sourceId: rawPlace.source_id,
      nameRaw: rawPlace.name_raw,
      lat: rawPlace.lat,
      lng: rawPlace.lng,
      addressRaw: rawPlace.address_raw,
      phoneRaw: rawPlace.phone_raw,
      websiteRaw: rawPlace.website_raw,
      categoryRaw: rawPlace.category_raw,
      processingStatus: rawPlace.processing_status,
      importedAt: rawPlace.imported_at,
    },
    candidatePlace: candidatePlace
      ? {
          id: candidatePlace.id,
          name: candidatePlace.name,
          slug: candidatePlace.slug,
          categoryPrimary: candidatePlace.category_primary,
          status: candidatePlace.status,
          verificationStatus: candidatePlace.verification_status,
        }
      : null,
  }
}

function mapRecentRawPlaceRow(row: RecentRawPlaceRow, draft: PlaceEditorDraft | null): RecentRawPlaceItem {
  const googleMeta = row.raw_payload?.google

  return {
    id: row.id,
    sourceName: row.source_name,
    sourceId: row.source_id,
    nameRaw: row.name_raw,
    lat: row.lat,
    lng: row.lng,
    addressRaw: row.address_raw,
    phoneRaw: row.phone_raw,
    websiteRaw: row.website_raw,
    categoryRaw: row.category_raw,
    processingStatus: row.processing_status,
    importedAt: row.imported_at,
    gridKey: typeof googleMeta?.gridKey === 'string' ? googleMeta.gridKey : null,
    cellId: typeof googleMeta?.cellId === 'string' ? googleMeta.cellId : null,
    googleMapsUri:
      typeof googleMeta?.place?.googleMapsUri === 'string' ? googleMeta.place.googleMapsUri : null,
    draft: draft ?? buildDraftFromRaw(row, null, null, []),
  }
}

function mapGridSweepRow(row: GridSweepRow, cells: GridSweepCellRow[]): GridSweepItem {
  return {
    id: row.id,
    regionName: row.region_name,
    presetName: row.preset_name,
    status: row.status,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    cellSizeMeters: row.cell_size_meters,
    totalCells: row.total_cells,
    processedCells: row.processed_cells,
    successfulCells: row.successful_cells,
    failedCells: row.failed_cells,
    bbox: {
      south: row.bbox_south,
      west: row.bbox_west,
      north: row.bbox_north,
      east: row.bbox_east,
    },
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cells: cells.map((cell) => ({
      id: cell.id,
      cellIndex: cell.cell_index,
      status: cell.status,
      bbox: {
        south: cell.south,
        west: cell.west,
        north: cell.north,
        east: cell.east,
      },
      fetchedCount: cell.fetched_count,
      preparedCount: cell.prepared_count,
      errorMessage: cell.error_message,
      completedAt: cell.completed_at,
    })),
  }
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizePhone(value: string | null | undefined) {
  return normalizeText(value)
}

function normalizeWebsite(value: string | null | undefined) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }

  return `https://${normalized}`
}

function uniqueImageUrls(imageUrls: string[]) {
  return Array.from(new Set(imageUrls.map((item) => item.trim()).filter(Boolean)))
}

function slugifyText(value: string | null | undefined) {
  const normalized = (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized
}
