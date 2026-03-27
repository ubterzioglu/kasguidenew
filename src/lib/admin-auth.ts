import 'server-only'

import { timingSafeEqual } from 'node:crypto'

export function isAdminApiConfigured() {
  return Boolean(process.env.ADMIN_API_KEY)
}

export function isAdminRequestAuthorized(request: Request) {
  const expectedApiKey = process.env.ADMIN_API_KEY
  const providedApiKey = request.headers.get('X-API-Key')

  if (!expectedApiKey || !providedApiKey) {
    return false
  }

  const expectedBuffer = Buffer.from(expectedApiKey)
  const providedBuffer = Buffer.from(providedApiKey)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}
