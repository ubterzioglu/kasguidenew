export type SupportedCategory =
  | 'meyhane'
  | 'bar'
  | 'cafe'
  | 'restaurant'
  | 'breakfast'
  | 'beach'
  | 'hotel'
  | 'activity'
  | 'diving'

export const DEFAULT_REGION = {
  name: 'Kas Center',
  lat: 36.2014,
  lng: 29.6377,
  radiusMeters: 5000,
} as const

type OsmTags = Record<string, string | undefined>

const HOTEL_TOURISM_VALUES = new Set(['hotel', 'guest_house', 'motel', 'hostel', 'apartment'])
const ACTIVITY_TOURISM_VALUES = new Set(['attraction', 'museum', 'gallery'])
const ACTIVITY_LEISURE_VALUES = new Set(['sports_centre', 'marina', 'park', 'water_park'])

export function detectCategory(tags: OsmTags): SupportedCategory | null {
  const amenity = tags.amenity?.toLowerCase()
  const tourism = tags.tourism?.toLowerCase()
  const natural = tags.natural?.toLowerCase()
  const leisure = tags.leisure?.toLowerCase()
  const sport = tags.sport?.toLowerCase()
  const shop = tags.shop?.toLowerCase()
  const name = tags.name?.toLowerCase() ?? ''
  const cuisine = tags.cuisine?.toLowerCase() ?? ''
  const breakfast = tags.breakfast?.toLowerCase()

  if (sport === 'scuba_diving' || shop === 'scuba_diving' || name.includes('dive')) {
    return 'diving'
  }

  if (HOTEL_TOURISM_VALUES.has(tourism ?? '')) {
    return 'hotel'
  }

  if (natural === 'beach' || leisure === 'beach_resort') {
    return 'beach'
  }

  if (breakfast === 'yes' || cuisine.includes('breakfast') || cuisine.includes('brunch')) {
    return 'breakfast'
  }

  if (name.includes('meyhane')) {
    return 'meyhane'
  }

  if (amenity === 'bar') {
    return 'bar'
  }

  if (amenity === 'pub') {
    return name.includes('meyhane') ? 'meyhane' : 'bar'
  }

  if (amenity === 'cafe') {
    return cuisine.includes('breakfast') || cuisine.includes('brunch') ? 'breakfast' : 'cafe'
  }

  if (amenity === 'restaurant' || amenity === 'fast_food') {
    return cuisine.includes('breakfast') || cuisine.includes('brunch') ? 'breakfast' : 'restaurant'
  }

  if (ACTIVITY_TOURISM_VALUES.has(tourism ?? '') || ACTIVITY_LEISURE_VALUES.has(leisure ?? '')) {
    return 'activity'
  }

  return null
}

export function buildAddress(tags: OsmTags): string | null {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:postcode'],
  ].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(', ')
  }

  return tags['addr:full'] ?? tags.address ?? null
}

export function extractWebsite(tags: OsmTags): string | null {
  return tags.website ?? tags['contact:website'] ?? tags.url ?? null
}

export function extractPhone(tags: OsmTags): string | null {
  return tags.phone ?? tags['contact:phone'] ?? null
}

export function slugifyPlaceName(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizePlaceName(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value
    .replace(/[_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.length > 0 ? normalized : null
}

export function normalizeWebsite(value: string | null | undefined) {
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

export function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/[^\d+]/g, '')

  if (!normalized) {
    return null
  }

  if (normalized.startsWith('00')) {
    return `+${normalized.slice(2)}`
  }

  if (normalized.startsWith('+')) {
    return normalized
  }

  if (normalized.startsWith('0')) {
    return `+90${normalized.slice(1)}`
  }

  if (normalized.length === 10) {
    return `+90${normalized}`
  }

  return normalized
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadius = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function similarityScore(left: string, right: string) {
  const a = slugifyPlaceName(left)
  const b = slugifyPlaceName(right)

  if (!a || !b) {
    return 0
  }

  if (a === b) {
    return 1
  }

  const distance = levenshteinDistance(a, b)
  const maxLength = Math.max(a.length, b.length)

  return maxLength === 0 ? 1 : Math.max(0, 1 - distance / maxLength)
}

function levenshteinDistance(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, rowIndex) =>
    Array.from({ length: a.length + 1 }, (_, columnIndex) => {
      if (rowIndex === 0) {
        return columnIndex
      }

      if (columnIndex === 0) {
        return rowIndex
      }

      return 0
    }),
  )

  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      const cost = a[column - 1] === b[row - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
    }
  }

  return matrix[b.length][a.length]
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}