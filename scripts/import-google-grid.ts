import { appendFile } from 'node:fs/promises'

import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

type BoundingBox = {
  south: number
  west: number
  north: number
  east: number
}

type GridSearchTypeResult = {
  type: string
  resultCount: number
  failed: boolean
  errorMessage: string | null
}

type GooglePlace = {
  id?: string
  displayName?: {
    text?: string
  }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  googleMapsUri?: string
  primaryType?: string
  types?: string[]
  businessStatus?: string
}

type RawPlaceInsert = {
  source_name: 'google_places'
  source_id: string
  name_raw: string | null
  lat: number | null
  lng: number | null
  address_raw: string | null
  website_raw: string | null
  phone_raw: string | null
  category_raw: string | null
  raw_payload: Record<string, unknown>
}

type GridTarget = {
  gridX: number
  gridY: number
  gridKey: string
  cellId: string
  centerLat: number
  centerLng: number
  bbox: BoundingBox
}

type NextCandidate = {
  direction: 'right' | 'left' | 'up' | 'down'
  gridX: number
  gridY: number
  gridKey: string
  cellId: string
}

const GOOGLE_PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const SEED_CENTER = {
  lat: 36.199383,
  lng: 29.641333,
}
const SEED_GRID = {
  x: 1,
  y: 1,
}
const DEFAULT_CELL_SIZE_METERS = 500
const DEFAULT_LAT_STEP = 0.0044915559
const DEFAULT_LNG_STEP = 0.0055659744
const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.location',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'places.businessStatus',
]
const DEFAULT_SEARCH_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'pub',
  'bakery',
  'coffee_shop',
  'breakfast_restaurant',
  'meal_takeaway',
  'meal_delivery',
  'sandwich_shop',
  'seafood_restaurant',
  'turkish_restaurant',
  'hotel',
  'guest_house',
  'hostel',
  'bed_and_breakfast',
  'lodging',
  'resort_hotel',
  'motel',
  'inn',
  'tourist_attraction',
  'museum',
  'art_gallery',
  'marina',
  'park',
  'beach',
  'travel_agency',
  'tour_agency',
  'tourist_information_center',
  'gym',
  'spa',
  'massage',
  'massage_spa',
  'yoga_studio',
  'wellness_center',
  'pharmacy',
  'beauty_salon',
  'barber_shop',
  'laundry',
  'supermarket',
  'convenience_store',
  'gift_shop',
  'shopping_mall',
  'car_rental',
  'parking',
  'gas_station',
] as const

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY veya GOOGLE_MAPS_API_KEY gerekli.')
  }

  const dryRun = process.argv.includes('--dry-run')
  const cellSizeMeters = parseInteger(getFlagValue('cell-size-meters')) ?? DEFAULT_CELL_SIZE_METERS
  const languageCode = getFlagValue('lang') ?? 'tr'
  const maxResultCount = parseInteger(getFlagValue('limit')) ?? 20
  const types = parseList(getFlagValue('types')) ?? [...DEFAULT_SEARCH_TYPES]
  const target = resolveGridTarget({
    gridXValue: getFlagValue('grid-x'),
    gridYValue: getFlagValue('grid-y'),
    gridKeyValue: getFlagValue('grid-key'),
    cellIdValue: getFlagValue('cell-id'),
    centerLatValue: getFlagValue('center-lat'),
    centerLngValue: getFlagValue('center-lng'),
    cellSizeMeters,
  })
  const regionName = getFlagValue('region') ?? `Kas Sweep ${target.gridKey}`
  const radius = Math.ceil(Math.sqrt(2) * (cellSizeMeters / 2))
  const nextCandidates = buildNextCandidates(target.gridX, target.gridY)
  const startedAt = new Date().toISOString()
  const client = dryRun ? null : getSupabaseAdminClient()
  const sweepId = dryRun
    ? null
    : await createGridSweep(client!, {
        regionName,
        gridKey: target.gridKey,
        cellId: target.cellId,
        centerLat: target.centerLat,
        centerLng: target.centerLng,
        bbox: target.bbox,
        cellSizeMeters,
      })

  const byPlaceId = new Map<string, RawPlaceInsert>()
  const typeResults: GridSearchTypeResult[] = []
  let totalFetched = 0
  let apiCalls = 0

  for (const type of types) {
    apiCalls += 1

    try {
      const places = await fetchGooglePlacesWithRetry({
        apiKey,
        centerLat: target.centerLat,
        centerLng: target.centerLng,
        radius,
        type,
        languageCode,
        maxResultCount,
      })

      const filtered = places.filter((place) => isPlaceInsideBoundingBox(place, target.bbox))
      totalFetched += filtered.length

      for (const place of filtered) {
        const mapped = mapPlaceToRawInsert(place, type, target)

        if (!mapped) {
          continue
        }

        const existing = byPlaceId.get(mapped.source_id)
        if (!existing) {
          byPlaceId.set(mapped.source_id, mapped)
          continue
        }

        const existingGoogle = existing.raw_payload.google as Record<string, unknown>
        const existingMatchedTypes = Array.isArray(existingGoogle.matchedTypes)
          ? (existingGoogle.matchedTypes as string[])
          : []

        byPlaceId.set(mapped.source_id, {
          ...existing,
          raw_payload: {
            ...existing.raw_payload,
            google: {
              ...existingGoogle,
              matchedTypes: Array.from(new Set([...existingMatchedTypes, type])),
            },
          },
        })
      }

      typeResults.push({
        type,
        resultCount: filtered.length,
        failed: false,
        errorMessage: null,
      })
    } catch (error) {
      typeResults.push({
        type,
        resultCount: 0,
        failed: true,
        errorMessage: error instanceof Error ? error.message : 'Bilinmeyen hata',
      })
    }
  }

  const uniqueRows = [...byPlaceId.values()]
  const failedTypes = typeResults.filter((item) => item.failed).map((item) => item.type)
  const summary = {
    gridX: target.gridX,
    gridY: target.gridY,
    gridKey: target.gridKey,
    cellId: target.cellId,
    regionName,
    centerLat: target.centerLat,
    centerLng: target.centerLng,
    cellSizeMeters,
    radiusUsedMeters: radius,
    bbox: target.bbox,
    apiCalls,
    fetched: totalFetched,
    uniquePlaces: uniqueRows.length,
    failedTypes,
    typeResults,
    nextCandidates,
    dryRun,
  }

  if (!dryRun && client) {
    let inserted = 0

    for (const chunk of chunkArray(uniqueRows, 100)) {
      const { data, error } = await client
        .from('raw_places')
        .upsert(chunk, { onConflict: 'source_name,source_id' })
        .select('id')

      if (error) {
        throw error
      }

      inserted += data?.length ?? chunk.length
    }

    const status = await finalizeGridSweep(client, sweepId!, {
      bbox: target.bbox,
      totalFetched,
      uniquePlaces: uniqueRows.length,
      failedTypes,
      typeResults,
      gridKey: target.gridKey,
      cellId: target.cellId,
      regionName,
      centerLat: target.centerLat,
      centerLng: target.centerLng,
      cellSizeMeters,
      inserted,
      startedAt,
    })

    await appendRunReport({
      processedCell: target.cellId,
      gridKey: target.gridKey,
      gridX: target.gridX,
      gridY: target.gridY,
      status,
      apiCalls,
      rawRowsWritten: inserted,
      nextCandidates,
      note: 'tek grid islendi, run sonlandirildi',
    })

    console.log(JSON.stringify({ ...summary, inserted, status }, null, 2))
    return
  }

  console.log(JSON.stringify(summary, null, 2))
}

async function fetchGooglePlacesWithRetry(input: {
  apiKey: string
  centerLat: number
  centerLng: number
  radius: number
  type: string
  languageCode: string
  maxResultCount: number
}) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchGooglePlaces(input)
    } catch (error) {
      lastError = error

      if (attempt === 3) {
        throw error
      }

      await delay(300 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Google Places istegi basarisiz oldu.')
}

async function fetchGooglePlaces(input: {
  apiKey: string
  centerLat: number
  centerLng: number
  radius: number
  type: string
  languageCode: string
  maxResultCount: number
}) {
  const response = await fetch(GOOGLE_PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': input.apiKey,
      'X-Goog-FieldMask': GOOGLE_FIELD_MASK.join(','),
    },
    body: JSON.stringify({
      includedTypes: [input.type],
      maxResultCount: input.maxResultCount,
      languageCode: input.languageCode,
      locationRestriction: {
        circle: {
          center: {
            latitude: input.centerLat,
            longitude: input.centerLng,
          },
          radius: input.radius,
        },
      },
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMessage = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`
    throw new Error(`${input.type}: ${errorMessage}`)
  }

  return Array.isArray(payload?.places) ? (payload.places as GooglePlace[]) : []
}

function resolveGridTarget(input: {
  gridXValue: string | null
  gridYValue: string | null
  gridKeyValue: string | null
  cellIdValue: string | null
  centerLatValue: string | null
  centerLngValue: string | null
  cellSizeMeters: number
}): GridTarget {
  const parsedGridKey = parseGridKey(input.gridKeyValue)
  const parsedCellId = parseCellId(input.cellIdValue)
  const gridX =
    parseInteger(input.gridXValue) ?? parsedGridKey?.gridX ?? parsedCellId?.gridX ?? SEED_GRID.x
  const gridY =
    parseInteger(input.gridYValue) ?? parsedGridKey?.gridY ?? parsedCellId?.gridY ?? SEED_GRID.y
  const gridKey = toGridKey(gridX, gridY)
  const cellId = toCellId(gridX, gridY)
  const centerLatOverride = parseNumber(input.centerLatValue)
  const centerLngOverride = parseNumber(input.centerLngValue)
  const centerLat = centerLatOverride ?? roundCoord(SEED_CENTER.lat + ((gridY - SEED_GRID.y) * scaledLatStep(input.cellSizeMeters)))
  const centerLng = centerLngOverride ?? roundCoord(SEED_CENTER.lng + ((gridX - SEED_GRID.x) * scaledLngStep(input.cellSizeMeters)))

  return {
    gridX,
    gridY,
    gridKey,
    cellId,
    centerLat,
    centerLng,
    bbox: readBoundingBox(centerLat, centerLng, input.cellSizeMeters),
  }
}

function mapPlaceToRawInsert(place: GooglePlace, matchedType: string, target: GridTarget): RawPlaceInsert | null {
  const sourceId = place.id ?? null

  if (!sourceId) {
    return null
  }

  return {
    source_name: 'google_places',
    source_id: sourceId,
    name_raw: place.displayName?.text?.trim() || null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    address_raw: place.formattedAddress?.trim() || null,
    website_raw: place.websiteUri?.trim() || null,
    phone_raw: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || null,
    category_raw: place.primaryType ?? matchedType,
    raw_payload: {
      google: {
        place,
        matchedTypes: [matchedType],
        cellId: target.cellId,
        gridX: target.gridX,
        gridY: target.gridY,
        gridKey: target.gridKey,
        bbox: target.bbox,
      },
    },
  }
}

function buildNextCandidates(gridX: number, gridY: number): NextCandidate[] {
  const baseCandidates: Array<Pick<NextCandidate, 'direction' | 'gridX' | 'gridY'>> = [
    { direction: 'right', gridX: gridX + 1, gridY },
    { direction: 'left', gridX: gridX - 1, gridY },
    { direction: 'up', gridX, gridY: gridY + 1 },
    { direction: 'down', gridX, gridY: gridY - 1 },
  ]

  return baseCandidates.map((candidate) => ({
    ...candidate,
    gridKey: toGridKey(candidate.gridX, candidate.gridY),
    cellId: toCellId(candidate.gridX, candidate.gridY),
  }))
}

function isPlaceInsideBoundingBox(place: GooglePlace, bbox: BoundingBox) {
  const lat = place.location?.latitude
  const lng = place.location?.longitude

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false
  }

  return lat >= bbox.south && lat < bbox.north && lng >= bbox.west && lng < bbox.east
}

function readBoundingBox(centerLat: number, centerLng: number, cellSizeMeters: number): BoundingBox {
  const halfLatStep = scaledLatStep(cellSizeMeters) / 2
  const halfLngStep = scaledLngStep(cellSizeMeters) / 2

  return {
    south: roundCoord(centerLat - halfLatStep),
    west: roundCoord(centerLng - halfLngStep),
    north: roundCoord(centerLat + halfLatStep),
    east: roundCoord(centerLng + halfLngStep),
  }
}

async function createGridSweep(
  client: ReturnType<typeof getSupabaseAdminClient>,
  input: {
    regionName: string
    gridKey: string
    cellId: string
    centerLat: number
    centerLng: number
    bbox: BoundingBox
    cellSizeMeters: number
  },
) {
  const { data, error } = await client
    .from('grid_sweeps')
    .insert({
      region_name: `${input.regionName} (${input.gridKey})`,
      preset_name: 'google_single_grid_v2',
      origin_lat: input.centerLat,
      origin_lng: input.centerLng,
      bbox_south: input.bbox.south,
      bbox_west: input.bbox.west,
      bbox_north: input.bbox.north,
      bbox_east: input.bbox.east,
      cell_size_meters: input.cellSizeMeters,
      total_cells: 1,
      processed_cells: 0,
      successful_cells: 0,
      failed_cells: 0,
      status: 'running',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw error ?? new Error('Grid sweep kaydi olusturulamadi.')
  }

  return data.id as string
}

async function finalizeGridSweep(
  client: ReturnType<typeof getSupabaseAdminClient>,
  sweepId: string,
  input: {
    bbox: BoundingBox
    totalFetched: number
    uniquePlaces: number
    failedTypes: string[]
    typeResults: GridSearchTypeResult[]
    gridKey: string
    cellId: string
    regionName: string
    centerLat: number
    centerLng: number
    cellSizeMeters: number
    inserted: number
    startedAt: string
  },
) {
  const completedAt = new Date().toISOString()
  const isFailed = input.typeResults.every((item) => item.failed)
  const status = isFailed ? 'failed' : input.failedTypes.length > 0 ? 'partial' : 'completed'

  const { error: cellError } = await client.from('grid_sweep_cells').insert({
    sweep_id: sweepId,
    cell_index: 1,
    south: input.bbox.south,
    west: input.bbox.west,
    north: input.bbox.north,
    east: input.bbox.east,
    status: isFailed ? 'failed' : 'success',
    fetched_count: input.totalFetched,
    prepared_count: input.uniquePlaces,
    error_message: input.failedTypes.length > 0 ? `Grid ${input.gridKey} basarisiz type'lar: ${input.failedTypes.join(', ')}` : null,
    started_at: input.startedAt,
    completed_at: completedAt,
  })

  if (cellError) {
    throw cellError
  }

  const { error: sweepError } = await client
    .from('grid_sweeps')
    .update({
      processed_cells: 1,
      successful_cells: isFailed ? 0 : 1,
      failed_cells: isFailed ? 1 : 0,
      status,
      completed_at: completedAt,
    })
    .eq('id', sweepId)

  if (sweepError) {
    throw sweepError
  }

  console.log(
    JSON.stringify(
      {
        gridLogged: true,
        sweepId,
        gridKey: input.gridKey,
        cellId: input.cellId,
        status,
        writtenRows: input.inserted,
      },
      null,
      2,
    ),
  )

  return status
}

async function appendRunReport(input: {
  processedCell: string
  gridKey: string
  gridX: number
  gridY: number
  status: string
  apiCalls: number
  rawRowsWritten: number
  nextCandidates: NextCandidate[]
  note: string
}) {
  const timestamp = formatTimestamp(new Date())
  const block = [
    `\n## Session ${timestamp}`,
    `- processed_cell: ${input.processedCell}`,
    `- grid_key: ${input.gridKey}`,
    `- grid_x: ${input.gridX}`,
    `- grid_y: ${input.gridY}`,
    `- status: ${input.status}`,
    `- api_calls: ${input.apiCalls}`,
    `- raw_rows_written: ${input.rawRowsWritten}`,
    `- next_candidates:`,
    ...input.nextCandidates.map((candidate) => `  - ${candidate.gridKey}`),
    `- note: ${input.note}`,
    '',
  ].join('\n')

  await appendFile('docs/kas-run-report.md', block, 'utf8')
}

function getFlagValue(name: string) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (!direct) {
    return null
  }

  try {
    return decodeURIComponent(direct.slice(name.length + 3))
  } catch {
    return direct.slice(name.length + 3)
  }
}

function parseInteger(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNumber(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseList(value: string | null) {
  if (!value) {
    return null
  }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

function parseGridKey(value: string | null) {
  if (!value) {
    return null
  }

  const match = /^X(-?\d+)Y(-?\d+)$/i.exec(value.trim())
  if (!match) {
    return null
  }

  return {
    gridX: Number.parseInt(match[1]!, 10),
    gridY: Number.parseInt(match[2]!, 10),
  }
}

function parseCellId(value: string | null) {
  if (!value) {
    return null
  }

  const match = /^kas-google-grid-x(-?\d+)-y(-?\d+)$/i.exec(value.trim())
  if (!match) {
    return null
  }

  return {
    gridX: Number.parseInt(match[1]!, 10),
    gridY: Number.parseInt(match[2]!, 10),
  }
}

function toGridKey(gridX: number, gridY: number) {
  return `X${gridX}Y${gridY}`
}

function toCellId(gridX: number, gridY: number) {
  return `kas-google-grid-x${gridX}-y${gridY}`
}

function scaledLatStep(cellSizeMeters: number) {
  return (cellSizeMeters / DEFAULT_CELL_SIZE_METERS) * DEFAULT_LAT_STEP
}

function scaledLngStep(cellSizeMeters: number) {
  return (cellSizeMeters / DEFAULT_CELL_SIZE_METERS) * DEFAULT_LNG_STEP
}

function roundCoord(value: number) {
  return Number(value.toFixed(6))
}

function formatTimestamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
