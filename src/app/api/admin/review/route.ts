import { NextResponse } from 'next/server'

import { isAdminApiConfigured, isAdminRequestAuthorized } from '@/lib/admin-auth'
import {
  applyReviewAction,
  getReviewDashboardSnapshot,
  isPlaceReviewStoreConfigured,
  type ReviewAction,
} from '@/lib/place-review-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = getAdminAccessError(request)

  if (authError) {
    return authError
  }

  const limit = readLimit(new URL(request.url).searchParams.get('limit'))
  const snapshot = await getReviewDashboardSnapshot(limit)

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request) {
  const authError = getAdminAccessError(request)

  if (authError) {
    return authError
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Gecersiz istek govdesi.' }, { status: 400 })
  }

  const reviewId = readStringField(body, 'reviewId')
  const action = readActionField(body, 'action')
  const notes = readOptionalStringField(body, 'notes')
  const candidatePlaceId = readOptionalStringField(body, 'candidatePlaceId')

  if (!reviewId || !action) {
    return NextResponse.json({ error: 'reviewId ve action zorunlu.' }, { status: 400 })
  }

  try {
    const snapshot = await applyReviewAction({
      reviewId,
      action,
      notes,
      candidatePlaceId,
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review aksiyonu tamamlanamadi.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

function getAdminAccessError(request: Request) {
  if (!isAdminApiConfigured()) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD tanimli degil.' }, { status: 503 })
  }

  if (!isPlaceReviewStoreConfigured()) {
    return NextResponse.json({ error: 'Supabase review deposu hazir degil.' }, { status: 503 })
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
  }

  return null
}

function readLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '24', 10)

  if (!Number.isFinite(parsed)) {
    return 24
  }

  return Math.max(1, Math.min(parsed, 100))
}

function readStringField(body: object, field: string) {
  const value = Reflect.get(body, field)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readOptionalStringField(body: object, field: string) {
  const value = Reflect.get(body, field)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readActionField(body: object, field: string): ReviewAction | null {
  const value = Reflect.get(body, field)

  if (value === 'start_review' || value === 'approve' || value === 'merge' || value === 'reject') {
    return value
  }

  return null
}