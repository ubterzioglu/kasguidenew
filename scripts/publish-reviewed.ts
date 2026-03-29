import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

type ReviewRow = {
  id: string
  status: 'approved' | 'merged'
  raw_place_id: string
  candidate_place_id: string | null
}

type PlaceSource = {
  place_id: string
}

async function main() {
  const client = getSupabaseAdminClient()
  const limit = Number.parseInt(getFlagValue('limit') ?? '50', 10)
  const dryRun = process.argv.includes('--dry-run')

  const { data, error } = await client
    .from('review_queue')
    .select('id, status, raw_place_id, candidate_place_id')
    .in('status', ['approved', 'merged'])
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  const reviews = (data ?? []) as ReviewRow[]
  let published = 0
  let skipped = 0

  for (const review of reviews) {
    const placeId = review.candidate_place_id ?? (await findPlaceIdByRawPlace(client, review.raw_place_id))

    if (!placeId) {
      skipped += 1
      continue
    }

    if (!dryRun) {
      const { error: placeError } = await client
        .from('places')
        .update({ status: 'published', verification_status: 'reviewed' })
        .eq('id', placeId)

      if (placeError) {
        throw placeError
      }
    }

    published += 1
  }

  console.log(JSON.stringify({ reviewedCount: reviews.length, published, skipped, dryRun }, null, 2))
}

async function findPlaceIdByRawPlace(
  client: ReturnType<typeof getSupabaseAdminClient>,
  rawPlaceId: string,
) {
  const { data, error } = await client
    .from('place_sources')
    .select('place_id')
    .eq('raw_place_id', rawPlaceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as PlaceSource | null)?.place_id ?? null
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