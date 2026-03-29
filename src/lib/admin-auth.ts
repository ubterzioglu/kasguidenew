import 'server-only'

import { timingSafeEqual } from 'node:crypto'

const ADMIN_PASSWORD_HEADER = 'X-Admin-Password'
const LEGACY_ADMIN_HEADER = 'X-API-Key'

export function isAdminApiConfigured() {
  return Boolean(getExpectedAdminSecret())
}

export function isAdminRequestAuthorized(request: Request) {
  const expectedSecret = getExpectedAdminSecret()
  const providedSecret = request.headers.get(ADMIN_PASSWORD_HEADER) ?? request.headers.get(LEGACY_ADMIN_HEADER)

  if (!expectedSecret || !providedSecret) {
    return false
  }

  const expectedBuffer = Buffer.from(expectedSecret)
  const providedBuffer = Buffer.from(providedSecret)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

function getExpectedAdminSecret() {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY || null
}