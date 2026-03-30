import { NextResponse } from 'next/server'

import { isAdminApiConfigured, isAdminRequestAuthorized } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isAdminApiConfigured()) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD tanimli degil.' }, { status: 503 })
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}