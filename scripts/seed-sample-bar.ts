import { randomUUID } from 'node:crypto'

import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

async function main() {
  const client = getSupabaseAdminClient()
  const placeId = randomUUID()
  const slug = 'mavi-kose-bar-kas'
  const sourceId = 'sample-bar-mavi-kose'

  const { data: existingPlace } = await client
    .from('places')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  const finalPlaceId = existingPlace?.id ?? placeId

  const { error: placeError } = await client.from('places').upsert(
    {
      id: finalPlaceId,
      slug,
      name: 'Mavi Kose Bar',
      category_primary: 'bar',
      category_secondary: null,
      address: 'Andifli Mahallesi, Liman Sokak No: 12, Kas / Antalya',
      lat: 36.20012,
      lng: 29.63988,
      phone: '+90 242 123 45 67',
      website: 'https://example.com/mavi-kose-bar',
      opening_hours: 'Her gun 17:00 - 02:00',
      status: 'published',
      verification_status: 'verified',
    },
    { onConflict: 'id' },
  )

  if (placeError) {
    throw placeError
  }

  const { error: contentError } = await client.from('place_content').upsert(
    {
      place_id: finalPlaceId,
      headline: 'Kas gun batiminda kokteyl icmek icin sakin bir teras bari',
      short_text: 'Mavi Kose Bar, denize yakin masalari ve imza kokteylleriyle aksami yumusak bir tempoda acmak isteyenler icin ideal.',
      long_text:
        'Mavi Kose Bar, Kas merkezde gun batimina karsi oturup sakin bir aksam baslatmak isteyenler icin hazirlanmis kurgusal bir ornek mekan kaydidir. Teras hissi veren oturma duzeni, bakir detayli bar tezgahi ve hafif elektronik seckileriyle kalabalik olmadan iyi vakit gecirebilecegin bir atmosfer sunar.\n\nImza icecek menusu klasik kokteylleri Akdeniz dokunuslariyla yeniden yorumlar. Narenciye agirlikli ferah receteler, hafif atistirmalik tabaklar ve masada rahat uzun sohbet kurmaya uygun bir tempo odakta tutulur.\n\nKas Guide icinde bu mekan, bar kategorisinin nasil gorunecegini test etmek icin yayina alinmis ornek kayittir. Kategori kartindan detay sayfasina gecis, fotograf galerisi ve yazi alani bu kayit uzerinden kontrol edilebilir.',
      tone_type: 'guide',
    },
    { onConflict: 'place_id' },
  )

  if (contentError) {
    throw contentError
  }

  const { error: imageDeleteError } = await client.from('place_images').delete().eq('place_id', finalPlaceId)

  if (imageDeleteError) {
    throw imageDeleteError
  }

  const sampleImages = [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  ]

  const { error: imageInsertError } = await client.from('place_images').insert(
    sampleImages.map((url, index) => ({
      place_id: finalPlaceId,
      storage_path: url,
      public_url: url,
      alt_text: `Mavi Kose Bar fotograf ${index + 1}`,
      source_name: 'seed',
      is_cover: index === 0,
      sort_order: index,
    })),
  )

  if (imageInsertError) {
    throw imageInsertError
  }

  const { error: sourceError } = await client.from('place_sources').upsert(
    {
      place_id: finalPlaceId,
      raw_place_id: null,
      source_name: 'seed',
      source_id: sourceId,
      source_url: null,
      is_primary: true,
    },
    { onConflict: 'source_name,source_id' },
  )

  if (sourceError) {
    throw sourceError
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        placeId: finalPlaceId,
        slug,
        name: 'Mavi Kose Bar',
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
