import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ibltmprnsrieobmjxlwu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

export interface Item {
  id: number
  title: string
  slug: string
  description: string | null
  long_text: string | null
  item_type: 'place' | 'pet' | 'hotel' | 'artist'
  status: 'pending' | 'approved' | 'rejected'
  attributes: Record<string, unknown>
  images: string[] | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  imageUrl: string
  description?: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'bar',
    name: 'Bar',
    icon: '\u{1F378}',
    imageUrl:
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'meyhane',
    name: 'Meyhane',
    icon: '\u{1F377}',
    imageUrl:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'restoran',
    name: 'Restoran',
    icon: '\u{1F37D}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cafe',
    name: 'Kafe',
    icon: '\u{2615}',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'kahvalti',
    name: 'Kahvaltı',
    icon: '\u{1F950}',
    imageUrl:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'tarih',
    name: 'Tarih',
    icon: '\u{1F3DB}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'doga',
    name: 'Doğa',
    icon: '\u{1F33F}',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'dalis',
    name: 'Dalış',
    icon: '\u{1F93F}',
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'aktivite',
    name: 'Aktivite',
    icon: '\u{1F3AF}',
    imageUrl:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'etkinlik',
    name: 'Etkinlik',
    icon: '\u{1F389}',
    imageUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'carsi',
    name: 'Çarşı',
    icon: '\u{1F6CD}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'yazilar',
    name: 'Yazılar',
    icon: '\u{270D}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'oss',
    name: 'O.S.S.',
    icon: '\u{1F4CC}',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'kas-local',
    name: 'Kaş Local',
    icon: '\u{1F4E1}',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'gezi',
    name: 'Gezi',
    icon: '\u{1F9ED}',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'plaj',
    name: 'Plaj',
    icon: '\u{1F3D6}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'roportaj',
    name: 'Röportaj',
    icon: '\u{1F399}\u{FE0F}',
    imageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'fotograf',
    name: 'Fotoğraf',
    icon: '\u{1F4F7}',
    imageUrl:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'acil-durum',
    name: 'Acil Durum',
    icon: '\u{1F6A8}',
    imageUrl:
      'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'oteller',
    name: 'Oteller',
    icon: '\u{1F3E8}',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'patililer',
    name: 'Patililer',
    icon: '\u{1F43E}',
    imageUrl:
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
  },
]
