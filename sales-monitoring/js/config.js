/* ============================================================
   KONFIGURASI SUPABASE — kredensial publik untuk frontend
   ============================================================
   PENTING:
   - SUPABASE_KEY di bawah adalah "publishable / anon key" yang MEMANG
     dirancang tampil di sisi browser. Ini BUKAN service_role key (rahasia).
   - File ini SENGAJA ikut di-commit & di-deploy. Tanpa file ini, aplikasi
     tidak dapat menyimpan data ke Supabase dan hanya tersimpan di
     localStorage browser masing-masing perangkat.
   - JANGAN PERNAH menaruh service_role key di file ini.

   Dimuat sebagai <script> biasa (bukan module), jadi cukup men-set
   variabel global APP_CONFIG. data.js akan membacanya di DB.initRemote().
   ============================================================ */

window.APP_CONFIG = {
  SUPABASE_URL: 'https://vrmywumkcetsvwtqhepr.supabase.co',
  SUPABASE_KEY: 'sb_publishable_t83ZRWaV3ONPW8zFX3orJg_zm4ZhUWL',
};
