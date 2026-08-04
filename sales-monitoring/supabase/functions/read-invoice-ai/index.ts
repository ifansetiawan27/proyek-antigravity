const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://salesmonitoring.vercel.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

const json = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (origin && !allowedOrigins.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Layanan AI belum dikonfigurasi.' }, 503, origin)
  if (!(request.headers.get('content-type') || '').includes('application/pdf')) {
    return json({ error: 'File harus berformat PDF.' }, 415, origin)
  }

  const bytes = new Uint8Array(await request.arrayBuffer())
  if (!bytes.length) return json({ error: 'File PDF kosong.' }, 400, origin)
  if (bytes.length > 10 * 1024 * 1024) return json({ error: 'Ukuran PDF maksimal 10 MB.' }, 413, origin)

  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  const prompt = `Baca faktur penjualan PDF ini secara akurat, termasuk jika berupa hasil scan.
Ambil HANYA:
1. Semua nama barang/produk/alkes/obat yang benar-benar tercantum sebagai item penjualan.
2. Total akhir yang harus dibayar (prioritaskan Grand Total/Total Tagihan/Amount Due, setelah diskon dan pajak).
Jangan ambil nama klinik, rumah sakit, dokter, sales, nomor faktur, tanggal, alamat, subtotal, pajak, diskon, harga satuan, atau jumlah per baris.
Jangan menebak. Jika tidak ditemukan gunakan array kosong atau 0.`

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'application/pdf', data: btoa(binary) } },
            ],
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                items: { type: 'ARRAY', items: { type: 'STRING' } },
                total: { type: 'NUMBER' },
              },
              required: ['items', 'total'],
            },
          },
        }),
      },
    )

    const geminiPayload = await geminiResponse.json()
    if (!geminiResponse.ok) {
      console.error('Gemini API error', geminiResponse.status, geminiPayload?.error?.message)
      return json({ error: 'AI gagal membaca faktur.' }, 502, origin)
    }

    const text = geminiPayload?.candidates?.[0]?.content?.parts?.[0]?.text
    const result = JSON.parse(text || '{}')
    const items = Array.isArray(result.items)
      ? result.items.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 20)
      : []
    const total = Number(result.total) || 0
    return json({ items: [...new Set(items)], total }, 200, origin)
  } catch (error) {
    console.error('Invoice AI error', error)
    return json({ error: 'AI gagal membaca faktur.' }, 500, origin)
  }
})
