-- ================================================================
-- SALESMONITOR — Supabase SQL Setup (Production / Clean)
-- ================================================================
-- Cara pakai:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
-- ================================================================


-- ================================================================
-- BAGIAN 0: HAPUS DATA LAMA (jika sebelumnya pernah insert demo)
-- ================================================================
-- Jalankan bagian ini jika tabel sudah ada tapi berisi data uji coba.
-- Hapus dalam urutan yang benar (child → parent) karena ada foreign key.

DELETE FROM public.transactions WHERE id LIKE 'tx_seed_%';
DELETE FROM public.pipeline     WHERE id LIKE 'pe%';
DELETE FROM public.stock        WHERE id LIKE 'stk%';
DELETE FROM public.doctors      WHERE id LIKE 'd%';
DELETE FROM public.products     WHERE id LIKE 'p%';
DELETE FROM public.users        WHERE id LIKE 'u_%';


-- ================================================================
-- BAGIAN 1: BUAT TABEL
-- ================================================================

-- ── Tabel: users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  username      TEXT        UNIQUE NOT NULL,
  password      TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'sales',   -- 'manager' | 'sales'
  area          TEXT,
  target        BIGINT      NOT NULL DEFAULT 0,
  avatar        TEXT
);

-- ── Tabel: doctors ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id              TEXT    PRIMARY KEY,
  name            TEXT    NOT NULL,
  clinic          TEXT,
  area            TEXT,
  "salesId"       TEXT    REFERENCES public.users(id) ON DELETE SET NULL,
  stamps          INTEGER NOT NULL DEFAULT 0,
  "totalPurchase" BIGINT  NOT NULL DEFAULT 0
);

-- ── Tabel: products ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id           TEXT    PRIMARY KEY,
  sku          TEXT    UNIQUE,
  name         TEXT    NOT NULL,
  category     TEXT,
  "basePrice"  BIGINT  NOT NULL DEFAULT 0
);

-- ── Tabel: transactions ───────────────────────────────────────
-- items disimpan sebagai JSONB array:
-- [{ productId, productName, qty, price, discount }, ...]
CREATE TABLE IF NOT EXISTS public.transactions (
  id            TEXT        PRIMARY KEY,
  "salesId"     TEXT        REFERENCES public.users(id) ON DELETE SET NULL,
  "doctorId"    TEXT        REFERENCES public.doctors(id) ON DELETE SET NULL,
  date          TEXT        NOT NULL,          -- format: YYYY-MM-DD
  "createdAt"   TEXT        NOT NULL,          -- format: ISO 8601
  items         JSONB       NOT NULL DEFAULT '[]',
  "totalAmount" BIGINT      NOT NULL DEFAULT 0,
  "stampGiven"  INTEGER     NOT NULL DEFAULT 0,
  notes         TEXT
);

-- ── Tabel: pipeline ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline (
  id               TEXT    PRIMARY KEY,
  "doctorName"     TEXT,
  "clinicName"     TEXT,
  "itemName"       TEXT,
  "estimatedValue" BIGINT  NOT NULL DEFAULT 0,
  status           TEXT,   -- 'Perkenalan'|'Demo unit'|'Submit Quotation'|'Negosiasi'|'Deal'|'Lost'
  notes            TEXT,
  "salesId"        TEXT    REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt"      TEXT    NOT NULL DEFAULT ''
);

-- ── Tabel: stock ──────────────────────────────────────────────
-- sumber disimpan sebagai JSONB array: ['KBT','SBI','KDS','manual']
CREATE TABLE IF NOT EXISTS public.stock (
  id          TEXT        PRIMARY KEY,
  kode        TEXT        NOT NULL,
  nama        TEXT        NOT NULL,
  gudang      TEXT,
  stok        INTEGER     NOT NULL DEFAULT 0,
  "stokMin"   INTEGER     NOT NULL DEFAULT 0,
  harga       BIGINT      NOT NULL DEFAULT 0,
  "hargaJual" BIGINT      NOT NULL DEFAULT 0,
  diskon      NUMERIC(5,2) NOT NULL DEFAULT 0,
  satuan      TEXT        NOT NULL DEFAULT 'Unit',
  kategori    TEXT,
  pemasok     TEXT,
  sumber      JSONB       NOT NULL DEFAULT '["manual"]',
  keterangan  TEXT,
  "updatedAt" TEXT
);

-- Index untuk pencarian yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_stock_kode             ON public.stock (kode);
CREATE INDEX IF NOT EXISTS idx_stock_gudang           ON public.stock (gudang);
CREATE INDEX IF NOT EXISTS idx_transactions_salesid   ON public.transactions ("salesId");
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON public.transactions (date);
CREATE INDEX IF NOT EXISTS idx_doctors_salesid        ON public.doctors ("salesId");
CREATE INDEX IF NOT EXISTS idx_pipeline_salesid       ON public.pipeline ("salesId");


-- ================================================================
-- BAGIAN 2: NONAKTIFKAN ROW LEVEL SECURITY (RLS)
-- ================================================================
-- Untuk internal app tanpa auth Supabase.

ALTER TABLE public.users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock        DISABLE ROW LEVEL SECURITY;


-- ================================================================
-- BAGIAN 3: GRANT akses ke anon key
-- ================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock        TO anon;


-- ================================================================
-- BAGIAN 4: DATA USERS
-- ================================================================

-- Hapus akun lama dulu (jika ada)
DELETE FROM public.users WHERE id IN ('u_mgr1','u_s1','u_s2','u_s3','u_s4','u_s5','u_s6','u_s7');

INSERT INTO public.users (id, name, username, password, role, area, target, avatar) VALUES
  ('u_mgr1', 'Johan',         'admin',   'Admin@2026',  'manager', 'All',     0,        'Jo'),
  ('u_s1',   'Ifan Setiawan', 'ifan',    'Sales@2026',  'sales',   'Jakarta', 50000000, 'I'),
  ('u_s2',   'Cici',          'cici',    'Sales@2026',  'sales',   'Jakarta', 45000000, 'C'),
  ('u_s3',   'Iqbal',         'iqbal',   'Sales@2026',  'sales',   'Jakarta', 40000000, 'Q'),
  ('u_s4',   'Pirman',        'pirman',  'Sales@2026',  'sales',   'Jakarta', 42000000, 'P'),
  ('u_s5',   'Nita',          'nita',    'Sales@2026',  'sales',   'Jakarta', 38000000, 'N'),
  ('u_s6',   'Try',           'try',     'Sales@2026',  'sales',   'Medan',   0,        'T'),
  ('u_s7',   'Agus',          'agus',    'Sales@2026',  'sales',   'Jakarta', 0,        'A')
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- SELESAI
-- ================================================================
-- Tabel yang dibuat (siap pakai):
--   ✓ users        → 8 akun (1 manager + 7 sales)
--   ✓ doctors      → kosong
--   ✓ products     → kosong
--   ✓ transactions → kosong
--   ✓ pipeline     → kosong
--   ✓ stock        → kosong
--
-- Login Manager:
--   username : admin
--   password : Admin@2026
--
-- Login Sales (semua sama):
--   username : ifan / cici / iqbal / pirman / nita / try / agus
--   password : Sales@2026
--
-- Setelah login, gunakan Panel Manager untuk:
--   - Tambah/edit produk
--   - Tambah dokter
--   - Set target sales
-- ================================================================
