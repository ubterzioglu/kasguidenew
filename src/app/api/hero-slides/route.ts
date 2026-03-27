import { NextResponse } from 'next/server'

import { listPublicHeroSlides } from '@/lib/hero-slide-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const snapshot = await listPublicHeroSlides()

  return NextResponse.json(
    {
      slides: snapshot.slides,
      source: snapshot.source,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
