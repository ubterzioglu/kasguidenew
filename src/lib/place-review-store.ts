import 'server-only'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export type ReviewQueueStatus = 'pending' | 'in_review' | 'approved' | 'merged' | 'rejected'
export type ReviewAction = 'start_review' | 'approve' | 'merge' | 'reject'
export type GridSweepStatus = 'running' | 'completed' | 'partial' | 'failed'
export type GridSweepCellStatus = 'pending' | 'success' | 'failed'

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

export type ReviewDashboardSnapshot = {
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

export function isPlaceReviewStoreConfigured() {
  return Boolean(getSupabaseAdminClient())
}

export async function getReviewDashboardSnapshot(limit = 24): Promise<ReviewDashboardSnapshot> {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error('Supabase admin baglantisi hazir degil.')
  }

  const [queueResult, sweepsResult, pendingReviews, pendingRawPlaces, draftPlaces, publishedPlaces, trackedSweeps, runningSweeps] = await Promise.all([
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
    throw new Error('Grid sweep kayitlari okunamadi.')
  }

  const sweeps = await loadSweepCells(client, (sweepsResult.data ?? []) as GridSweepRow[])

  return {
    queue: ((queueResult.data ?? []) as unknown as ReviewQueueRow[])
      .map(mapReviewQueueRow)
      .filter((item): item is ReviewQueueItem => item !== null),
    sweeps,
    stats: {
      pendingReviews,
      pendingRawPlaces,
      draftPlaces,
      publishedPlaces,
      trackedSweeps,
      runningSweeps,
    },
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

  const notes = normalizeNotes(input.notes)

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
        throw new Error('Merge icin candidate_place_id gerekli.')
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
  const { error } = await client
    .from('raw_places')
    .update({ processing_status: status })
    .eq('id', rawPlaceId)

  if (error) {
    throw new Error('Ham kayit durumu guncellenemedi.')
  }
}

function mapReviewQueueRow(row: ReviewQueueRow): ReviewQueueItem | null {
  const rawPlace = Array.isArray(row.raw_place) ? (row.raw_place[0] ?? null) : row.raw_place
  const candidatePlace = Array.isArray(row.candidate_place)
    ? (row.candidate_place[0] ?? null)
    : row.candidate_place

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

function normalizeNotes(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}