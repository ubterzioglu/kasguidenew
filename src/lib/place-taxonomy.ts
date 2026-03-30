export type PlaceCategoryOption = {
  id: string
  label: string
  googleTypes: string[]
}

export const PLACE_CATEGORY_OPTIONS: PlaceCategoryOption[] = [
  { id: 'bar', label: 'Bar', googleTypes: ['bar', 'pub'] },
  { id: 'meyhane', label: 'Meyhane', googleTypes: ['turkish_restaurant'] },
  { id: 'restoran', label: 'Restoran', googleTypes: ['restaurant', 'seafood_restaurant'] },
  { id: 'cafe', label: 'Kafe', googleTypes: ['cafe', 'coffee_shop', 'bakery'] },
  { id: 'kahvalti', label: 'Kahvaltı', googleTypes: ['breakfast_restaurant'] },
  { id: 'plaj', label: 'Plaj', googleTypes: ['beach'] },
  {
    id: 'oteller',
    label: 'Konaklama',
    googleTypes: [
      'hotel',
      'guest_house',
      'hostel',
      'bed_and_breakfast',
      'lodging',
      'resort_hotel',
      'motel',
      'inn',
    ],
  },
  { id: 'dalis', label: 'Dalış', googleTypes: ['marina'] },
  {
    id: 'aktivite',
    label: 'Aktivite',
    googleTypes: [
      'gym',
      'yoga_studio',
      'wellness_center',
      'massage',
      'massage_spa',
      'spa',
      'park',
      'tour_agency',
      'travel_agency',
      'tourist_attraction',
    ],
  },
  { id: 'gezi', label: 'Gezi', googleTypes: ['museum', 'art_gallery', 'tourist_information_center'] },
  {
    id: 'carsi',
    label: 'Çarşı',
    googleTypes: ['gift_shop', 'shopping_mall', 'supermarket', 'convenience_store'],
  },
]

export function getPlaceCategoryLabel(categoryId: string | null | undefined) {
  if (!categoryId) {
    return 'Kategori seçin'
  }

  return PLACE_CATEGORY_OPTIONS.find((item) => item.id === categoryId)?.label ?? categoryId
}

export function suggestCategoryFromRaw(rawCategory: string | null | undefined) {
  const normalized = rawCategory?.trim().toLowerCase()

  if (!normalized) {
    return 'aktivite'
  }

  const direct = PLACE_CATEGORY_OPTIONS.find((item) => item.id === normalized)
  if (direct) {
    return direct.id
  }

  const matched = PLACE_CATEGORY_OPTIONS.find((item) => item.googleTypes.includes(normalized))
  if (matched) {
    return matched.id
  }

  return 'aktivite'
}
