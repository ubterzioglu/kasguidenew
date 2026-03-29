import { NextResponse } from 'next/server'

import { isAdminApiConfigured, isAdminRequestAuthorized } from '@/lib/admin-auth'
import { normalizeHeroSlidesInput } from '@/lib/hero-slide-data'
import { isHeroSlideStoreConfigured, listAdminHeroSlides, saveHeroSlides } from '@/lib/hero-slide-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = getAdminAccessError(request)

  if (authError) {
    return authError
  }

  const snapshot = await listAdminHeroSlides()

  return NextResponse.json(
    {
      slides: snapshot.slides,
      storage: snapshot.source,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

export async function PUT(request: Request) {
  const authError = getAdminAccessError(request)

  if (authError) {
    return authError
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object' || !('slides' in body)) {
    return NextResponse.json({ error: 'Gecersiz istek govdesi.' }, { status: 400 })
  }

  try {
    const slides = normalizeHeroSlidesInput((body as { slides: unknown }).slides)
    const snapshot = await saveHeroSlides(slides)

    return NextResponse.json({
      slides: snapshot.slides,
      storage: snapshot.source,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hero sahneleri kaydedilemedi.'
    const status = isHeroSlideStoreConfigured() ? 400 : 503

    return NextResponse.json({ error: message }, { status })
  }
}

function getAdminAccessError(request: Request) {
  if (!isAdminApiConfigured()) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD tanimli degil.' }, { status: 503 })
  }

  if (!isHeroSlideStoreConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY ile hero veri deposu hazir degil.' },
      { status: 503 },
    )
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
  }

  return null
}