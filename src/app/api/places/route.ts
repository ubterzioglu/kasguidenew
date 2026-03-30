import { NextResponse } from 'next/server'

import { listPublishedPlacesByCategory } from '@/lib/public-place-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')?.trim() ?? ''
  const limit = Math.max(1, Math.min(Number.parseInt(searchParams.get('limit') ?? '12', 10) || 12, 24))

  if (!category) {
    return NextResponse.json({ error: 'category zorunlu.' }, { status: 400 })
  }

  try {
    const places = await listPublishedPlacesByCategory(category, limit)

    return NextResponse.json(
      {
        category,
        places,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mekanlar okunamadi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
