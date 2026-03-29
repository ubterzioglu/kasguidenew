import {
  buildAddress,
  DEFAULT_REGION,
  detectCategory,
  extractPhone,
  extractWebsite,
  type SupportedCategory,
} from './lib/ingestion-config.ts'
import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

type OsmElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
  tags?: Record<string, string | undefined>
}

type OverpassResponse = {
  elements: OsmElement[]
}

type RawPlaceInsert = {
  source_name: 'osm_overpass'
  source_id: string
  name_raw: string | null
  lat: number
  lng: number
  address_raw: string | null
  website_raw: string | null
  phone_raw: string | null
  category_raw: SupportedCategory
  raw_payload: Record<string, unknown>
}

type BoundingBox = {
  south: number
  west: number
  north: number
  east: number
}

type GridCell = BoundingBox & {
  index: number
}

type GridPreset = {
  name: string
  bbox: BoundingBox
  pauseMs: number
}

type ImportOptions = {
  lat: number
  lng: number
  radiusMeters: number
  limit: number
  dryRun: boolean
  regionName: string
  gridEnabled: boolean
  bbox: BoundingBox | null
  cellSizeMeters: number
  pauseMs: number
  presetName: string | null
  originLat: number
  originLng: number
}

type GridSweepStatus = 'running' | 'completed' | 'partial' | 'failed'
type GridSweepCellStatus = 'success' | 'failed'

type SweepProgress = {
  processedCells: number
  successfulCells: number
  failedCells: number
}

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_ENDPOINT,
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
].filter((value): value is string => Boolean(value))

const DEFAULT_GRID_ORIGIN = {
  name: 'Kas Merkez',
  lat: 36.199383,
  lng: 29.641333,
}

const GRID_PRESETS: Record<string, GridPreset> = {
  'kas-core': {
    name: 'Kas merkez',
    bbox: { south: 36.185, west: 29.628, north: 36.215, east: 29.658 },
    pauseMs: 900,
  },
  'kas-wide': {
    name: 'Kas genis alan',
    bbox: { south: 36.145, west: 29.55, north: 36.27, east: 29.74 },
    pauseMs: 1200,
  },
  kalkan: {
    name: 'Kalkan',
    bbox: { south: 36.235, west: 29.375, north: 36.29, east: 29.46 },
    pauseMs: 1100,
  },
  cukurbag: {
    name: 'Cukurbag Yarimadasi',
    bbox: { south: 36.16, west: 29.59, north: 36.225, east: 29.665 },
    pauseMs: 1000,
  },
}

const INSERT_CHUNK_SIZE = 100
const REQUEST_TIMEOUT_MS = 45000
const MAX_RETRIES_PER_ENDPOINT = 2
const METERS_PER_DEGREE_LAT = 111_320

async function main() {
  const options = readOptions()
  const cells = options.gridEnabled && options.bbox
    ? buildGridCells(options.bbox, options.originLat, options.originLng, options.cellSizeMeters)
    : []

  console.log(
    options.gridEnabled && options.bbox
      ? `OSM grid import basliyor: ${options.regionName} origin=${options.originLat},${options.originLng} bbox=${options.bbox.south},${options.bbox.west},${options.bbox.north},${options.bbox.east} cell=${options.cellSizeMeters}m preset=${options.presetName ?? 'manual'}`
      : `OSM import basliyor: ${options.regionName} (${options.lat}, ${options.lng}) radius=${options.radiusMeters}m`,
  )

  const client = options.dryRun ? null : getSupabaseAdminClient()
  const sweepId = client && options.gridEnabled && options.bbox
    ? await createGridSweep(client, options, cells.length)
    : null

  const aggregated: RawPlaceInsert[] = []
  const stats = {
    totalFetched: 0,
    missingName: 0,
    missingCoordinates: 0,
    skippedCategory: 0,
  }
  const progress: SweepProgress = {
    processedCells: 0,
    successfulCells: 0,
    failedCells: 0,
  }
  const failedCells: Array<{ index: number; bbox: [number, number, number, number]; error: string }> = []

  if (options.gridEnabled && options.bbox) {
    for (const cell of cells) {
      const query = buildOverpassBboxQuery(cell.south, cell.west, cell.north, cell.east)
      const startedAt = new Date().toISOString()

      try {
        const response = await fetchOverpass(query)
        const normalized = response.elements
          .map((element) => mapElementToRawPlace(element, stats))
          .filter((place): place is RawPlaceInsert => place !== null)

        aggregated.push(...normalized)
        progress.processedCells += 1
        progress.successfulCells += 1
        stats.totalFetched += response.elements.length

        if (client && sweepId) {
          await recordGridSweepCell(client, sweepId, cell, {
            status: 'success',
            fetchedCount: response.elements.length,
            preparedCount: normalized.length,
            errorMessage: null,
            startedAt,
            completedAt: new Date().toISOString(),
          })
          await syncGridSweep(client, sweepId, cells.length, progress, 'running')
        }

        console.log(
          JSON.stringify(
            {
              cell: cell.index,
              bbox: [cell.south, cell.west, cell.north, cell.east],
              fetched: response.elements.length,
              prepared: normalized.length,
            },
            null,
            2,
          ),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
        progress.processedCells += 1
        progress.failedCells += 1
        failedCells.push({
          index: cell.index,
          bbox: [cell.south, cell.west, cell.north, cell.east],
          error: message,
        })

        if (client && sweepId) {
          await recordGridSweepCell(client, sweepId, cell, {
            status: 'failed',
            fetchedCount: 0,
            preparedCount: 0,
            errorMessage: message,
            startedAt,
            completedAt: new Date().toISOString(),
          })
          await syncGridSweep(client, sweepId, cells.length, progress, 'running')
        }
      }

      if (options.pauseMs > 0 && cell.index < cells.length) {
        await sleep(options.pauseMs)
      }
    }
  } else {
    const query = buildOverpassAroundQuery(options.lat, options.lng, options.radiusMeters)
    const response = await fetchOverpass(query)
    const normalized = response.elements
      .map((element) => mapElementToRawPlace(element, stats))
      .filter((place): place is RawPlaceInsert => place !== null)

    aggregated.push(...normalized)
    stats.totalFetched += response.elements.length
  }

  const deduped = dedupeRawPlaces(aggregated)
  const limited = options.limit > 0 ? deduped.slice(0, options.limit) : deduped

  console.log(
    JSON.stringify(
      {
        fetched: stats.totalFetched,
        prepared: aggregated.length,
        deduped: deduped.length,
        limited: limited.length,
        missingName: stats.missingName,
        missingCoordinates: stats.missingCoordinates,
        skippedCategory: stats.skippedCategory,
        processedCells: progress.processedCells,
        successfulCells: progress.successfulCells,
        failedCells: failedCells.slice(0, 10),
        dryRun: options.dryRun,
        categoryBreakdown: summarizeCategories(limited),
      },
      null,
      2,
    ),
  )

  if (client && sweepId) {
    await syncGridSweep(client, sweepId, cells.length, progress, deriveSweepStatus(cells.length, progress), true)
  }

  if (limited.length === 0) {
    console.log('Import edilecek kayit bulunamadi.')
    return
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ sample: limited.slice(0, Math.min(5, limited.length)) }, null, 2))
    return
  }

  if (!client) {
    throw new Error('Supabase admin istemcisi olusturulamadi.')
  }

  let inserted = 0

  for (const chunk of chunkArray(limited, INSERT_CHUNK_SIZE)) {
    const { data, error } = await client
      .from('raw_places')
      .upsert(chunk, { onConflict: 'source_name,source_id' })
      .select('id')

    if (error) {
      throw error
    }

    inserted += data?.length ?? chunk.length
  }

  console.log(
    JSON.stringify(
      {
        message: 'raw_places import tamamlandi',
        inserted,
        totalAttempted: limited.length,
      },
      null,
      2,
    ),
  )
}

function readOptions(): ImportOptions {
  const presetName = getFlagValue('preset')
  const preset = presetName ? GRID_PRESETS[presetName] : null

  if (presetName && !preset) {
    throw new Error(`Gecersiz preset: ${presetName}. Kullanilabilir presetler: ${Object.keys(GRID_PRESETS).join(', ')}`)
  }

  const lat = parseNumber(getFlagValue('lat')) ?? DEFAULT_REGION.lat
  const lng = parseNumber(getFlagValue('lng')) ?? DEFAULT_REGION.lng
  const radiusMeters = parseInteger(getFlagValue('radius')) ?? DEFAULT_REGION.radiusMeters
  const limit = parseInteger(getFlagValue('limit')) ?? 0
  const dryRun = process.argv.includes('--dry-run')
  const gridEnabled = process.argv.includes('--grid') || Boolean(getFlagValue('bbox')) || Boolean(preset)
  const bbox = parseBbox(getFlagValue('bbox')) ?? preset?.bbox ?? null
  const originLat = parseNumber(getFlagValue('origin-lat')) ?? DEFAULT_GRID_ORIGIN.lat
  const originLng = parseNumber(getFlagValue('origin-lng')) ?? DEFAULT_GRID_ORIGIN.lng
  const cellSizeMeters = parseInteger(getFlagValue('cell-size-meters')) ?? 500
  const pauseMs = parseInteger(getFlagValue('pause-ms')) ?? preset?.pauseMs ?? 900
  const regionName = getFlagValue('region') ?? preset?.name ?? DEFAULT_REGION.name

  return {
    lat,
    lng,
    radiusMeters,
    limit,
    dryRun,
    regionName,
    gridEnabled,
    bbox,
    cellSizeMeters,
    pauseMs,
    presetName,
    originLat,
    originLng,
  }
}

// CLI mode dispatcher - handles new sweep modes
async function dispatchSweepMode() {
  const args = process.argv.slice(2)
  
  // Check for single-cell sweep mode
  if (args.includes('--single-cell')) {
    const direction = getFlagValue('direction') as 'north' | 'south' | 'east' | 'west' | null
    const cellSizeMeters = parseInteger(getFlagValue('cell-size')) ?? 500
    const dryRun = args.includes('--dry-run')
    const options = readOptions()
    
    if (!direction) {
      throw new Error('--direction gerekli: north, south, east, west')
    }
    
    if (dryRun) {
      console.log(JSON.stringify({
        mode: 'single-cell-sweep',
        direction,
        cellSizeMeters,
        originLat: options.originLat,
        originLng: options.originLng,
        dryRun: true,
        message: 'Dry-run mode - veri yazilmayacak'
      }, null, 2))
      return
    }
    
    const client = getSupabaseAdminClient()
    if (!client) {
      throw new Error('Supabase admin istemcisi olusturulamadi.')
    }
    
    const result = await runSingleCellSweep(
      options.originLat,
      options.originLng,
      direction,
      cellSizeMeters,
      options,
      client
    )
    console.log(JSON.stringify(result, null, 2))
    return
  }
  
  // Check for cell-id sweep mode
  if (args.includes('--cell-id')) {
    const cellIdIndex = args.indexOf('--cell-id')
    const latIndex = parseInteger(args[cellIdIndex + 1])
    const lngIndex = parseInteger(args[cellIdIndex + 2])
    const dryRun = args.includes('--dry-run')
    const options = readOptions()
    
    if (latIndex === null || lngIndex === null) {
      throw new Error('--cell-id latIndex lngIndex gerekli. Ornek: --cell-id 0 1')
    }
    
    // Calculate cell bounds for dry-run display
    const latStep = options.cellSizeMeters / METERS_PER_DEGREE_LAT
    const lngStep = options.cellSizeMeters / (METERS_PER_DEGREE_LAT * Math.cos((options.originLat * Math.PI) / 180))
    const south = options.originLat + latIndex * latStep
    const north = south + latStep
    const west = options.originLng + lngIndex * lngStep
    const east = west + lngStep
    
    if (dryRun) {
      console.log(JSON.stringify({
        mode: 'cell-id-sweep',
        cellIndex: `${latIndex}_${lngIndex}`,
        cellSizeMeters: options.cellSizeMeters,
        originLat: options.originLat,
        originLng: options.originLng,
        cellBounds: {
          south: roundCoord(south),
          west: roundCoord(west),
          north: roundCoord(north),
          east: roundCoord(east)
        },
        dryRun: true,
        message: 'Dry-run mode - veri yazilmayacak'
      }, null, 2))
      return
    }
    
    const client = getSupabaseAdminClient()
    if (!client) {
      throw new Error('Supabase admin istemcisi olusturulamadi.')
    }
    
    const result = await runCellIdSweep(
      latIndex,
      lngIndex,
      options,
      client
    )
    console.log(JSON.stringify(result, null, 2))
    return
  }
  
  // Default: run main function (bbox multi-cell sweep)
  await main()
}

function buildOverpassAroundQuery(lat: number, lng: number, radiusMeters: number) {
  return buildSharedQuery(`around:${radiusMeters},${lat},${lng}`)
}

function buildOverpassBboxQuery(south: number, west: number, north: number, east: number) {
  return buildSharedQuery(`${south},${west},${north},${east}`)
}

function buildSharedQuery(selector: string) {
  return `
[out:json][timeout:40];
(
  nwr(${selector})[amenity~"^(restaurant|cafe|bar|pub|fast_food)$"];
  nwr(${selector})[tourism~"^(hotel|guest_house|motel|hostel|apartment|attraction|museum|gallery)$"];
  nwr(${selector})[natural="beach"];
  nwr(${selector})[leisure~"^(beach_resort|sports_centre|marina|park|water_park)$"];
  nwr(${selector})[sport="scuba_diving"];
  nwr(${selector})[shop="scuba_diving"];
  nwr(${selector})[breakfast="yes"];
);
out center tags;
`.trim()
}

function buildGridCells(bbox: BoundingBox, originLat: number, originLng: number, cellSizeMeters: number) {
  const latStep = cellSizeMeters / METERS_PER_DEGREE_LAT
  const lngStep = cellSizeMeters / (METERS_PER_DEGREE_LAT * Math.cos((originLat * Math.PI) / 180))
  const startLatIndex = Math.floor((bbox.south - originLat) / latStep)
  const endLatIndex = Math.ceil((bbox.north - originLat) / latStep)
  const startLngIndex = Math.floor((bbox.west - originLng) / lngStep)
  const endLngIndex = Math.ceil((bbox.east - originLng) / lngStep)
  const cells: GridCell[] = []
  let index = 1

  for (let latIndex = startLatIndex; latIndex < endLatIndex; latIndex += 1) {
    const south = originLat + latIndex * latStep
    const north = south + latStep

    for (let lngIndex = startLngIndex; lngIndex < endLngIndex; lngIndex += 1) {
      const west = originLng + lngIndex * lngStep
      const east = west + lngStep

      if (north <= bbox.south || south >= bbox.north || east <= bbox.west || west >= bbox.east) {
        continue
      }

      cells.push({
        index,
        south: roundCoord(south),
        west: roundCoord(west),
        north: roundCoord(north),
        east: roundCoord(east),
      })
      index += 1
    }
  }

  return cells
}

async function fetchOverpass(query: string) {
  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_ENDPOINT; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: query,
          signal: controller.signal,
        })

        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES_PER_ENDPOINT) {
            await sleep(900 * attempt)
            continue
          }

          throw new Error(`Overpass istegi basarisiz oldu: ${response.status} ${response.statusText} (${endpoint})`)
        }

        return (await response.json()) as OverpassResponse
      } catch (error) {
        lastError = error

        if (attempt < MAX_RETRIES_PER_ENDPOINT) {
          await sleep(900 * attempt)
          continue
        }

        console.warn(`Overpass endpoint basarisiz: ${endpoint}`)
      } finally {
        clearTimeout(timeout)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Tum Overpass endpointleri basarisiz oldu.')
}

function mapElementToRawPlace(
  element: OsmElement,
  stats: { missingName: number; missingCoordinates: number; skippedCategory: number },
): RawPlaceInsert | null {
  const tags = element.tags ?? {}
  const lat = element.lat ?? element.center?.lat ?? null
  const lng = element.lon ?? element.center?.lon ?? null

  if (lat === null || lng === null) {
    stats.missingCoordinates += 1
    return null
  }

  const category = detectCategory(tags)

  if (!category) {
    stats.skippedCategory += 1
    return null
  }

  const name = cleanText(tags.name)
  if (!name) {
    stats.missingName += 1
  }

  return {
    source_name: 'osm_overpass',
    source_id: `${element.type}/${element.id}`,
    name_raw: name,
    lat,
    lng,
    address_raw: cleanText(buildAddress(tags)),
    website_raw: normalizeWebsite(extractWebsite(tags)),
    phone_raw: cleanText(extractPhone(tags)),
    category_raw: category,
    raw_payload: {
      osm: {
        type: element.type,
        id: element.id,
        tags,
      },
    },
  }
}

function dedupeRawPlaces(rows: RawPlaceInsert[]) {
  const map = new Map<string, RawPlaceInsert>()

  for (const row of rows) {
    map.set(`${row.source_name}:${row.source_id}`, row)
  }

  return [...map.values()]
}

/**
 * Single-cell sweep mode
 * Sweeps exactly one grid cell based on center point, direction, and size
 *
 * @param centerLat - Center latitude of the cell
 * @param centerLng - Center longitude of the cell
 * @param direction - Cardinal direction to expand ('north', 'south', 'east', 'west')
 * @param cellSizeMeters - Size of the cell in meters
 * @param options - Import options
 * @param client - Supabase client
 * @returns Sweep results
 */
async function runSingleCellSweep(
  centerLat: number,
  centerLng: number,
  direction: 'north' | 'south' | 'east' | 'west',
  cellSizeMeters: number,
  options: ImportOptions,
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
): Promise<{
  sweepId: string;
  cellIndex: string;
  totalFetched: number;
  status: GridSweepStatus;
}> {
  // Calculate half cell size in degrees
  const halfCellLat = (cellSizeMeters / 2) / METERS_PER_DEGREE_LAT
  const halfCellLng = (cellSizeMeters / 2) / (METERS_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180))

  
  // Calculate bbox based on direction
  let south: number, west: number, north: number, east: number
  
  switch (direction) {
    case 'north':
      south = centerLat - halfCellLat
      north = centerLat + halfCellLat
      west = centerLng - halfCellLng
      east = centerLng + halfCellLng
      break
    case 'south':
      south = centerLat - halfCellLat
      north = centerLat + halfCellLat
      west = centerLng - halfCellLng
      east = centerLng + halfCellLng
      break
    case 'east':
      south = centerLat - halfCellLat
      north = centerLat + halfCellLat
      west = centerLng - halfCellLng
      east = centerLng + halfCellLng
      break
    case 'west':
      south = centerLat - halfCellLat
      north = centerLat + halfCellLat
      west = centerLng - halfCellLng
      east = centerLng + halfCellLng
      break
    default:
      throw new Error(`Invalid direction: ${direction}. Must be 'north', 'south', 'east', or 'west'`)
  }
  
  // Create cell index (unique identifier)
  const cellIndex = `${centerLat.toFixed(6)}_${centerLng.toFixed(6)}_${direction}_${cellSizeMeters}m`
  
  // Create sweep record
  const sweepId = await createGridSweep(client, options, 1)
  
  // Create cell object
  const cell: GridCell = {
    index: 0,
    south,
    west,
    north,
    east,
  }
  
  const startedAt = new Date().toISOString()
  
  // Build and execute Overpass query
  const query = buildOverpassAroundQuery(centerLat, centerLng, cellSizeMeters)
  const response = await fetchOverpass(query)
  
  // Process results
  const stats = {
    totalFetched: 0,
    missingName: 0,
    missingCoordinates: 0,
    skippedCategory: 0,
  }
  
  const rawPlaces: RawPlaceInsert[] = []
  
  for (const element of response.elements) {
    const rawPlace = mapElementToRawPlace(element, stats)
    if (rawPlace) {
      rawPlaces.push(rawPlace)
    }
  }
  
  // Dedupe and insert
  const deduped = dedupeRawPlaces(rawPlaces)
  
  if (deduped.length > 0) {
    const { error } = await client
      .from('raw_places')
      .upsert(deduped, { onConflict: 'source_name,source_id' })
    
    if (error) {
      throw error
    }
  }
  
  const completedAt = new Date().toISOString()
  
  // Update cell status
  await recordGridSweepCell(client, sweepId, cell, {
    status: 'success',
    fetchedCount: deduped.length,
    preparedCount: response.elements.length,
    errorMessage: null,
    startedAt,
    completedAt,
  })
  
  // Update sweep status
  await syncGridSweep(client, sweepId, 1, {
    processedCells: 1,
    successfulCells: 1,
    failedCells: 0,
  }, 'completed', true)
  
  return {
    sweepId,
    cellIndex,
    totalFetched: deduped.length,
    status: 'completed',
  }
}


function summarizeCategories(rows: RawPlaceInsert[]) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.category_raw] = (accumulator[row.category_raw] ?? 0) + 1
    return accumulator
  }, {})
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function cleanText(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeWebsite(value: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return `https://${trimmed}`
}

async function createGridSweep(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  options: ImportOptions,
  totalCells: number,
) {
  const { data, error } = await client
    .from('grid_sweeps')
    .insert({
      region_name: options.regionName,
      preset_name: options.presetName,
      origin_lat: options.originLat,
      origin_lng: options.originLng,
      bbox_south: options.bbox?.south,
      bbox_west: options.bbox?.west,
      bbox_north: options.bbox?.north,
      bbox_east: options.bbox?.east,
      cell_size_meters: options.cellSizeMeters,
      total_cells: totalCells,
      status: 'running',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw error ?? new Error('Grid sweep kaydi olusturulamadi.')
  }

  return data.id as string
}

async function recordGridSweepCell(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  sweepId: string,
  cell: GridCell,
  result: {
    status: GridSweepCellStatus
    fetchedCount: number
    preparedCount: number
    errorMessage: string | null
    startedAt: string
    completedAt: string
  },
) {
  const { error } = await client.from('grid_sweep_cells').upsert({
    sweep_id: sweepId,
    cell_index: cell.index,
    south: cell.south,
    west: cell.west,
    north: cell.north,
    east: cell.east,
    status: result.status,
    fetched_count: result.fetchedCount,
    prepared_count: result.preparedCount,
    error_message: result.errorMessage,
    started_at: result.startedAt,
    completed_at: result.completedAt,
  }, {
    onConflict: 'sweep_id,cell_index',
  })

  if (error) {
    throw error
  }
}

async function syncGridSweep(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  sweepId: string,
  totalCells: number,
  progress: SweepProgress,
  status: GridSweepStatus,
  finalize = false,
) {
  const { error } = await client
    .from('grid_sweeps')
    .update({
      total_cells: totalCells,
      processed_cells: progress.processedCells,
      successful_cells: progress.successfulCells,
      failed_cells: progress.failedCells,
      status,
      completed_at: finalize ? new Date().toISOString() : null,
    })
    .eq('id', sweepId)

  if (error) {
    throw error
  }
}

function deriveSweepStatus(totalCells: number, progress: SweepProgress): GridSweepStatus {
  if (progress.failedCells > 0 && progress.successfulCells === 0) {
    return 'failed'
  }

  if (progress.failedCells > 0) {
    return progress.processedCells >= totalCells ? 'partial' : 'running'
  }

  return progress.processedCells >= totalCells ? 'completed' : 'running'
}

function parseBbox(value: string | null) {
  if (!value) {
    return null
  }

  const parts = value.split(',').map((part) => Number.parseFloat(part.trim()))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error('bbox formati su sekilde olmali: south,west,north,east')
  }

  const [south, west, north, east] = parts

  if (south >= north || west >= east) {
    throw new Error('bbox degerleri gecersiz. south<north ve west<east olmali.')
  }

  return { south, west, north, east }
}

function getFlagValue(name: string) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (!direct) {
    return null
  }

  const value = direct.slice(name.length + 3)

  try {
    return decodeURIComponent(value)
  } catch {
    return value
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

function roundCoord(value: number) {
  return Number(value.toFixed(6))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

 
/**
 * Cell-ID based sweep mode
 * Sweeps a specific grid cell by its lat/lng indices
 * 
 * @param latIndex - Latitude index of the cell (relative to origin)
 * @param lngIndex - Longitude index of the cell (relative to origin)
 * @param options - Import options
 * @param client - Supabase client
 * @returns Sweep results
 */
async function runCellIdSweep(
  latIndex: number,
  lngIndex: number,
  options: ImportOptions,
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
): Promise<{
  sweepId: string
  cellIndex: string
  totalFetched: number
  status: GridSweepStatus
}> {
  // Validate inputs
  if (!Number.isInteger(latIndex) || !Number.isInteger(lngIndex)) {
    throw new Error('latIndex and lngIndex must be integers')
  }
 
  // Get grid preset
  const preset = getGridPreset(options)
  if (!preset) {
    throw new Error(`Grid preset '${options.presetName}' not found`)
  }
 
  // Calculate cell bounds
  const latStep = options.cellSizeMeters / METERS_PER_DEGREE_LAT
  const lngStep = options.cellSizeMeters / (METERS_PER_DEGREE_LAT * Math.cos((options.originLat * Math.PI) / 180))
  
  const south = options.originLat + latIndex * latStep
  const north = south + latStep
  const west = options.originLng + lngIndex * lngStep
  const east = west + lngStep
  
  // Create cell index string
  const cellIndex = `${latIndex}_${lngIndex}`
  
  // Create sweep record
  const sweepId = await createGridSweep(client, options, 1)
  
  // Create cell record (initial - before fetch)
  const cell: GridCell = {
    index: 0,
    south: roundCoord(south),
    west: roundCoord(west),
    north: roundCoord(north),
    east: roundCoord(east),
  }
  
  const startedAt = new Date().toISOString()
  
  // Build and execute Overpass query
  const query = buildOverpassBboxQuery(south, west, north, east)
  const response = await fetchOverpass(query)
  
  // Process results
  const stats = {
    totalFetched: 0,
    missingName: 0,
    missingCoordinates: 0,
    skippedCategory: 0,
  }
  
  const rawPlaces: RawPlaceInsert[] = []
  
  for (const element of response.elements) {
    const rawPlace = mapElementToRawPlace(element, stats)
    if (rawPlace) {
      rawPlaces.push(rawPlace)
    }
  }
  
  // Dedupe and insert
  const deduped = dedupeRawPlaces(rawPlaces)
  
  if (deduped.length > 0) {
    const { error } = await client
      .from('raw_places')
      .upsert(deduped, { onConflict: 'source_name,source_id' })
    
    if (error) {
      throw error
    }
  }
  
  const completedAt = new Date().toISOString()
  
  // Update cell status
  await recordGridSweepCell(client, sweepId, cell, {
    status: 'success',
    fetchedCount: deduped.length,
    preparedCount: response.elements.length,
    errorMessage: null,
    startedAt,
    completedAt,
  })
  
  // Update sweep status
  await syncGridSweep(client, sweepId, 1, {
    processedCells: 1,
    successfulCells: 1,
    failedCells: 0,
  }, 'completed', true)
  
  return {
    sweepId,
    cellIndex,
    totalFetched: deduped.length,
    status: 'completed',
  }
}
 
/**
 * Get grid preset from options or return default
 */
function getGridPreset(options: ImportOptions): GridPreset | null {
  if (options.presetName && GRID_PRESETS[options.presetName]) {
    return GRID_PRESETS[options.presetName]
  }
  return null
}
 
dispatchSweepMode().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})