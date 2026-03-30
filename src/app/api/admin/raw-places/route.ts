import { NextResponse } from 'next/server'

import { isAdminApiConfigured, isAdminRequestAuthorized } from '@/lib/admin-auth'
import {
  applyRawPlaceAction,
  getReviewDashboardSnapshot,
  isPlaceReviewStoreConfigured,
  type PlaceEditorDraft,
  type RawPlaceSaveAction,
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

  const rawPlaceId = readStringField(body, 'rawPlaceId')
  const action = readRawPlaceAction(body, 'action')
  const draft = readDraft(body, 'draft')

  if (!rawPlaceId || !action) {
    return NextResponse.json({ error: 'rawPlaceId ve action zorunlu.' }, { status: 400 })
  }

  try {
    const snapshot = await applyRawPlaceAction({ rawPlaceId, action, draft })
    return NextResponse.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mekan kaydi guncellenemedi.'
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

function readRawPlaceAction(body: object, field: string): RawPlaceSaveAction | null {
  const value = Reflect.get(body, field)

  if (value === 'save_draft' || value === 'publish' || value === 'reject') {
    return value
  }

  return null
}

function readDraft(body: object, field: string): PlaceEditorDraft | undefined {
  const value = Reflect.get(body, field)

  if (!value || typeof value !== 'object') {
    return undefined
  }

  return value as PlaceEditorDraft
}
