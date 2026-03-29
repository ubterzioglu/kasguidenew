import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseAdminCredentials())
}

export function getSupabaseAdminClient() {
  const credentials = getSupabaseAdminCredentials()

  if (!credentials) {
    return null
  }

  return createClient(credentials.supabaseUrl, credentials.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getSupabaseAdminCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  }
}