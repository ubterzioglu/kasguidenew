const GOOGLE_PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const DEFAULT_CENTER = {
  lat: 36.199383,
  lng: 29.641333,
}
const DEFAULT_RADIUS_METERS = 250
const DEFAULT_TYPES = ['restaurant']
const DEFAULT_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.primaryType',
  'places.businessStatus',
]

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY veya GOOGLE_MAPS_API_KEY gerekli.')
  }

  const lat = parseNumber(getFlagValue('lat')) ?? DEFAULT_CENTER.lat
  const lng = parseNumber(getFlagValue('lng')) ?? DEFAULT_CENTER.lng
  const radius = parseNumber(getFlagValue('radius')) ?? DEFAULT_RADIUS_METERS
  const maxResultCount = parseInteger(getFlagValue('limit')) ?? 5
  const languageCode = getFlagValue('lang') ?? 'tr'
  const includedTypes = parseList(getFlagValue('types')) ?? DEFAULT_TYPES
  const fieldMask = parseList(getFlagValue('fields')) ?? DEFAULT_FIELD_MASK

  const response = await fetch(GOOGLE_PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask.join(','),
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount,
      languageCode,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius,
        },
      },
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    console.error(JSON.stringify({
      ok: false,
      status: response.status,
      statusText: response.statusText,
      payload,
    }, null, 2))
    process.exitCode = 1
    return
  }

  const places = Array.isArray(payload?.places) ? payload.places : []

  console.log(JSON.stringify({
    ok: true,
    center: { lat, lng },
    radius,
    includedTypes,
    resultCount: places.length,
    sample: places.slice(0, 5).map((place: any) => ({
      id: place.id ?? null,
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      primaryType: place.primaryType ?? null,
      businessStatus: place.businessStatus ?? null,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
    })),
  }, null, 2))
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})