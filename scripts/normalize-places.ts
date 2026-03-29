import { randomUUID } from 'node:crypto'

import {
  normalizePhone,
  normalizePlaceName,
  normalizeWebsite,
  slugifyPlaceName,
} from './lib/ingestion-config.ts'
import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

type PendingRawPlace = {
  id: string
  source_name: string
  source_id: string
  name_raw: string | null
  lat: number | null
  lng: number | null
  address_raw: string | null
  website_raw: string | null
  phone_raw: string | null
  category_raw: string | null
  processing_status: string
}

type ExistingPlaceSource = {
  id: string
  place_id: string
  source_name: string
  source_id: string
}

type PlaceRecord = {
  id: string
  slug: string
}

async function main() {
  const client = getSupabaseAdminClient()
  const limit = Number.parseInt(getFlagValue('limit') ?? '50', 10)
  const dryRun = process.argv.includes('--dry-run')

  const { data, error } = await client
    .from('raw_places')
    .select(
      'id, source_name, source_id, name_raw, lat, lng, address_raw, website_raw, phone_raw, category_raw, processing_status',
    )
    .eq('processing_status', 'pending')
    .order('imported_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as PendingRawPlace[]
  const summary = {
    total: rows.length,
    createdPlaces: 0,
    updatedPlaces: 0,
    reviewQueued: 0,
    rejectedForMissingName: 0,
    dryRun,
  }

  for (const row of rows) {
    const normalizedName = normalizePlaceName(row.name_raw)
    const normalizedPhone = normalizePhone(row.phone_raw)
    const normalizedWebsite = normalizeWebsite(row.website_raw)
    const normalizedCategory = row.category_raw?.trim() || null
    const reasons: string[] = []

    if (!normalizedName) {
      reasons.push('missing_name')
    }

    if (!normalizedCategory) {
      reasons.push('missing_category')
    }

    if (row.lat === null || row.lng === null) {
      reasons.push('missing_coordinates')
    }

    if (!normalizedName) {
      await upsertReviewQueue(client, {
        rawPlaceId: row.id,
        reason: 'missing_name',
        notes: 'İsim olmadan normalize edilemedi.',
      }, dryRun)
      await updateRawPlaceStatus(client, row.id, 'review', dryRun)
      summary.reviewQueued += 1
      summary.rejectedForMissingName += 1
      continue
    }

    const baseSlug = slugifyPlaceName(normalizedName) || `place-${row.id.slice(0, 8)}`
    const existingSource = await findExistingSource(client, row.source_name, row.source_id)

    const placeId = existingSource?.place_id ?? randomUUID()
    const slug = await ensureUniqueSlug(client, baseSlug, placeId)

    const placePayload = {
      id: placeId,
      slug,
      name: normalizedName,
      category_primary: normalizedCategory ?? 'activity',
      category_secondary: null,
      address: row.address_raw,
      lat: row.lat,
      lng: row.lng,
      phone: normalizedPhone,
      website: normalizedWebsite,
      opening_hours: null,
      status: 'draft',
      verification_status: 'pending',
    }

    if (!dryRun) {
      const { error: placeError } = await client.from('places').upsert(placePayload, { onConflict: 'id' })
      if (placeError) {
        throw placeError
      }

      const { error: sourceError } = await client.from('place_sources').upsert(
        {
          place_id: placeId,
          raw_place_id: row.id,
          source_name: row.source_name,
          source_id: row.source_id,
          is_primary: true,
        },
        { onConflict: 'source_name,source_id' },
      )

      if (sourceError) {
        throw sourceError
      }
    }

    if (existingSource) {
      summary.updatedPlaces += 1
    } else {
      summary.createdPlaces += 1
    }

    if (reasons.length > 0) {
      await upsertReviewQueue(
        client,
        {
          rawPlaceId: row.id,
          candidatePlaceId: placeId,
          reason: reasons.join(','),
          notes: buildReasonNotes(reasons),
        },
        dryRun,
      )
      await updateRawPlaceStatus(client, row.id, 'review', dryRun)
      summary.reviewQueued += 1
    } else {
      await updateRawPlaceStatus(client, row.id, 'normalized', dryRun)
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

async function findExistingSource(
  client: ReturnType<typeof getSupabaseAdminClient>,
  sourceName: string,
  sourceId: string,
) {
  const { data, error } = await client
    .from('place_sources')
    .select('id, place_id, source_name, source_id')
    .eq('source_name', sourceName)
    .eq('source_id', sourceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as ExistingPlaceSource | null
}

async function ensureUniqueSlug(
  client: ReturnType<typeof getSupabaseAdminClient>,
  baseSlug: string,
  currentPlaceId: string,
) {
  let slug = baseSlug
  let suffix = 1

  while (true) {
    const { data, error } = await client
      .from('places')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      throw error
    }

    const existing = data as PlaceRecord | null
    if (!existing || existing.id === currentPlaceId) {
      return slug
    }

    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }
}

async function upsertReviewQueue(
  client: ReturnType<typeof getSupabaseAdminClient>,
  input: {
    rawPlaceId: string
    candidatePlaceId?: string
    reason: string
    notes: string
  },
  dryRun: boolean,
) {
  if (dryRun) {
    return
  }

  const { data: existing, error: existingError } = await client
    .from('review_queue')
    .select('id')
    .eq('raw_place_id', input.rawPlaceId)
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
        reason: input.reason,
        notes: input.notes,
        candidate_place_id: input.candidatePlaceId ?? null,
        status: 'pending',
      })
      .eq('id', existing[0].id)

    if (updateError) {
      throw updateError
    }

    return
  }

  const { error: insertError } = await client.from('review_queue').insert({
    raw_place_id: input.rawPlaceId,
    candidate_place_id: input.candidatePlaceId ?? null,
    reason: input.reason,
    notes: input.notes,
    status: 'pending',
  })

  if (insertError) {
    throw insertError
  }
}

async function updateRawPlaceStatus(
  client: ReturnType<typeof getSupabaseAdminClient>,
  rawPlaceId: string,
  status: 'normalized' | 'review',
  dryRun: boolean,
) {
  if (dryRun) {
    return
  }

  const { error } = await client
    .from('raw_places')
    .update({ processing_status: status })
    .eq('id', rawPlaceId)

  if (error) {
    throw error
  }
}

function buildReasonNotes(reasons: string[]) {
  const map: Record<string, string> = {
    missing_name: 'İsim eksik.',
    missing_category: 'Kategori eksik.',
    missing_coordinates: 'Koordinat eksik.',
  }

  return reasons.map((reason) => map[reason] ?? reason).join(' ')
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