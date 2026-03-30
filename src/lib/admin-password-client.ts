const ADMIN_PASSWORD_STORAGE_KEY = 'kasguide.admin.password'

export function getStoredAdminPassword() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) ?? ''
}

export function storeAdminPassword(password: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password)
}

export function clearStoredAdminPassword() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY)
}