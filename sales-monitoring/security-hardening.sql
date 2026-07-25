-- ================================================================
-- SALESMONITOR — HARDENING KEAMANAN (Fase 1: Lindungi Kredensial)
-- ================================================================
-- Cara pakai:
--   Supabase Dashboard -> SQL Editor -> New query -> paste semua -> Run
--
-- Efek:
--   1) Password di tabel users di-HASH (bcrypt) & auto-hash saat insert/update.
--   2) Login diverifikasi lewat fungsi server verify_login() (password tidak
--      pernah dikirim ke browser).
--   3) Hak BACA (SELECT) & DELETE tabel users DICABUT dari anon key, sehingga
--      password tidak bisa lagi disedot dari browser. Signup (INSERT) &
--      update target (UPDATE) tetap berjalan.
--
-- Aman dijalankan berkali-kali (idempoten).
-- Pastikan kode frontend versi baru (auth.js dengan verify_login) sudah ter-deploy
-- — kode itu backward-compatible, jadi urutan menjalankannya fleksibel.
-- ================================================================

-- 1) Ekstensi kripto untuk bcrypt (crypt / gen_salt)
create extension if not exists pgcrypto;

-- 2) Trigger: hash password otomatis saat INSERT/UPDATE.
--    Hash bcrypt selalu diawali '$2', jadi nilai yang sudah ter-hash dilewati
--    (mencegah double-hash saat update kolom lain seperti target).
create or replace function public.hash_user_password()
returns trigger
language plpgsql
as $$
begin
  if new.password is not null and left(new.password, 2) <> '$2' then
    new.password := crypt(new.password, gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hash_user_password on public.users;
create trigger trg_hash_user_password
  before insert or update on public.users
  for each row execute function public.hash_user_password();

-- 3) Hash SEKALI semua password lama yang masih berupa teks biasa
update public.users
set password = crypt(password, gen_salt('bf'))
where password is not null and left(password, 2) <> '$2';

-- 4) Fungsi login aman (SECURITY DEFINER: bypass pembatasan akses anon).
--    Mengembalikan kolom aman SAJA (tanpa password) bila kredensial cocok.
create or replace function public.verify_login(p_username text, p_password text)
returns table (id text, name text, username text, role text, area text, target bigint, avatar text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.username, u.role, u.area, u.target, u.avatar
  from public.users u
  where u.username = p_username
    and u.password = crypt(p_password, u.password)
  limit 1;
$$;

-- 5) Kunci akses langsung ke tabel users dari anon,
--    tetapi izinkan signup (INSERT) & update target (UPDATE) tetap jalan.
revoke select, delete on public.users from anon;
grant  insert, update on public.users to anon;         -- pastikan tetap ada
grant  execute on function public.verify_login(text, text) to anon;

-- 6) Minta PostgREST memuat ulang skema agar RPC langsung tersedia
notify pgrst, 'reload schema';

-- ================================================================
-- VERIFIKASI (jalankan terpisah untuk mengecek)
-- ================================================================
-- a) Password sudah ter-hash? (harus mulai dengan $2a / $2b)
--    select username, left(password, 4) as hash_prefix from public.users order by username;
--
-- b) Login benar berhasil?
--    select * from public.verify_login('admin', 'Admin@2026');   -- harus 1 baris
--    select * from public.verify_login('admin', 'salah');         -- harus 0 baris
--
-- c) anon TIDAK bisa baca users lagi? (dari SQL Editor pakai role anon, atau
--    cek di aplikasi: GET /rest/v1/users?select=* harus 401/permission denied)

-- ================================================================
-- ROLLBACK (jika perlu mengembalikan — TIDAK disarankan)
-- ================================================================
--   drop trigger if exists trg_hash_user_password on public.users;
--   drop function if exists public.hash_user_password();
--   drop function if exists public.verify_login(text, text);
--   grant select, delete on public.users to anon;
--   -- catatan: password yang sudah ter-hash tidak bisa dikembalikan ke teks biasa.
-- ================================================================
