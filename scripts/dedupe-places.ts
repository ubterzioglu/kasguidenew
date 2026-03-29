import {
  haversineDistanceMeters,
  normalizePhone,
  normalizeWebsite,
  similarityScore,
} from './lib/ingestion-config.ts'
import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

type RawPlaceCandidate = {
  id: string
  source_name: string
  source_id: string
  name_raw: string | null
  lat: number | null
  lng: number | null
  phone_raw: string | null
  website_raw: string | null
  category_raw: string | null
  processing_status: string
}

type Place = {
  id: string
  name: string
  slug: string
  category_primary: string
  lat: number | null
  lng: number | null
  phone: string | null
  website: string | null
  status: string
  verification_status: string
}

type ScoreBreakdown = {
  placeId: string
  name: string
  score: number
  nameScore: number
  distanceMeters: number | null
  phoneMatch: boolean
  websiteMatch: boolean
}

async function main() {
  const client = getSupabaseAdminClient()
  const limit = Number.parseInt(getFlagValue('limit') ?? '100', 10)
  const dryRun = process.argv.includes('--dry-run')

  const [{ data: rawRows, error: rawError }, { data: placeRows, error: placeError }] = await Promise.all([
    client
      .from('raw_places')
      .select('id, source_name, source_id, name_raw, lat, lng, phone_raw, website_raw, category_raw, processing_status')
      .in('processing_status', ['normalized', 'review'])
      .order('imported_at', { ascending: true })
      .limit(limit),
    client
      .from('places')
      .select('id, name, slug, category_primary, lat, lng, phone, website, status, verification_status')
      .order('created_at', { ascending: true }),
  ])

  if (rawError) {
    throw rawError
  }

  if (placeError) {
    throw placeError
  }

  const rawPlaces = (rawRows ?? []) as RawPlaceCandidate[]
  const places = (placeRows ?? []) as Place[]

  let autoMatched = 0
  let queuedForReview = 0
  let noMatch = 0
  const sample: ScoreBreakdown[] = []

  for (const rawPlace of rawPlaces) {
    const candidates = places
      .filter((place) => place.name && place.id)
      .filter((place) => place.id !== rawPlace.id)
      .map((place) => scorePlaceMatch(rawPlace, place))
      .sort((left, right) => right.score - left.score)

    const best = candidates[0] ?? null

    if (best && sample.length < 5) {
      sample.push(best)
    }

    if (!best || best.score < 60) {
      noMatch += 1
      continue
    }

    if (best.score >= 90) {
      autoMatched += 1
      await upsertReviewDecision(
        client,
        rawPlace.id,
        best.placeId,
        'auto_duplicate_match',
        `Otomatik duplicate eşleşmesi önerildi. skor=${best.score}`,
        dryRun,
      )
      continue
    }

    queuedForReview += 1
    await upsertReviewDecision(
      client,
      rawPlace.id,
      best.placeId,
      'possible_duplicate',
      `Benzer kayıt bulundu. skor=${best.score}`,
      dryRun,
    )
  }

  console.log(
    JSON.stringify(
      {
        message: 'dedupe-places scoring tamamlandi',
        rawCount: rawPlaces.length,
        placeCount: places.length,
        autoMatched,
        queuedForReview,
        noMatch,
        sample,
        dryRun,
      },
      null,
      2,
    ),
  )
}

function scorePlaceMatch(rawPlace: RawPlaceCandidate, place: Place): ScoreBreakdown {
  const nameScore = similarityScore(rawPlace.name_raw ?? '', place.name)
  const normalizedRawPhone = normalizePhone(rawPlace.phone_raw)
  const normalizedPlacePhone = normalizePhone(place.phone)
  const normalizedRawWebsite = normalizeWebsite(rawPlace.website_raw)
  const normalizedPlaceWebsite = normalizeWebsite(place.website)

  const phoneMatch = Boolean(normalizedRawPhone && normalizedPlacePhone && normalizedRawPhone === normalizedPlacePhone)
  const websiteMatch = Boolean(
    normalizedRawWebsite && normalizedPlaceWebsite && normalizedRawWebsite === normalizedPlaceWebsite,
  )

  const distanceMeters =
    rawPlace.lat !== null &&
    rawPlace.lng !== null &&
    place.lat !== null &&
    place.lng !== null
      ? haversineDistanceMeters(rawPlace.lat, rawPlace.lng, place.lat, place.lng)
      : null

  let score = Math.round(nameScore * 60)

  if (distanceMeters !== null) {
    if (distanceMeters <= 30) {
      score += 20
    } else if (distanceMeters <= 100) {
      score += 12
    } else if (distanceMeters <= 250) {
      score += 5
    }
  }

  if (phoneMatch) {
    score += 20
  }

  if (websiteMatch) {
    score += 20
  }

  if (rawPlace.category_raw && place.category_primary === rawPlace.category_raw) {
    score += 5
  }

  return {
    placeId: place.id,
    name: place.name,
    score: Math.min(score, 100),
    nameScore: Number((nameScore * 100).toFixed(1)),
    distanceMeters: distanceMeters !== null ? Number(distanceMeters.toFixed(1)) : null,
    phoneMatch,
    websiteMatch,
  }
}

async function upsertReviewDecision(
  client: ReturnType<typeof getSupabaseAdminClient>,
  rawPlaceId: string,
  candidatePlaceId: string,
  reason: string,
  notes: string,
  dryRun: boolean,
) {
  if (dryRun) {
    return
  }

  const { data: existing, error: existingError } = await client
    .from('review_queue')
    .select('id')
    .eq('raw_place_id', rawPlaceId)
    .in('status', ['pending', 'in_review'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingError) {
    throw existingError
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await client
      .from('review_queue')
      .update({
        candidate_place_id: candidatePlaceId,
        reason,
        notes,
        status: 'pending',
      })
      .eq('id', existing[0].id)

    if (updateError) {
      throw updateError
    }

    return
  }

  const { error: insertError } = await client.from('review_queue').insert({
    raw_place_id: rawPlaceId,
    candidate_place_id: candidatePlaceId,
    reason,
    notes,
    status: 'pending',
  })

  if (insertError) {
    throw insertError
  }
}

function getFlagValue(name: string) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (!direct) {
    return null
  }

  return direct.slice(name.length + 3)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})