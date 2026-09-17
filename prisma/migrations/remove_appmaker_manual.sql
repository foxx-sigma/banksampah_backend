-- ============================================================
-- Migration: remove_appmaker_multitenancy
-- Hapus tabel app_makers dan kolom appMakerId dari semua tabel
-- JALANKAN di Supabase SQL Editor
-- ============================================================

-- 1. Drop semua foreign key ke app_makers dan appMakerId
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_appMakerId_fkey";
ALTER TABLE "nasabah" DROP CONSTRAINT IF EXISTS "nasabah_appMakerId_fkey";
ALTER TABLE "admin_bank" DROP CONSTRAINT IF EXISTS "admin_bank_appMakerId_fkey";
ALTER TABLE "kategori_sampah" DROP CONSTRAINT IF EXISTS "kategori_sampah_appMakerId_fkey";
ALTER TABLE "setor_sampah" DROP CONSTRAINT IF EXISTS "setor_sampah_appMakerId_fkey";
ALTER TABLE "detail_setor" DROP CONSTRAINT IF EXISTS "detail_setor_appMakerId_fkey";
ALTER TABLE "hadiah" DROP CONSTRAINT IF EXISTS "hadiah_appMakerId_fkey";
ALTER TABLE "penukaran_poin" DROP CONSTRAINT IF EXISTS "penukaran_poin_appMakerId_fkey";

-- 2. Drop unique index lama (appMakerId + username)
DROP INDEX IF EXISTS "users_appMakerId_username_key";

-- 3. Hapus kolom appMakerId dari semua tabel
ALTER TABLE "users" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "nasabah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "admin_bank" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "kategori_sampah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "setor_sampah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "detail_setor" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "hadiah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "penukaran_poin" DROP COLUMN IF EXISTS "appMakerId";

-- 4. Buat unique index baru: username unik global
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- 5. Tambah kolom kodeSetor dan kodePenukaran jika belum ada
ALTER TABLE "setor_sampah" ADD COLUMN IF NOT EXISTS "kodeSetor" TEXT;
ALTER TABLE "penukaran_poin" ADD COLUMN IF NOT EXISTS "kodePenukaran" TEXT;

-- 6. Hapus tabel app_makers (harus setelah semua FK dihapus)
DROP TABLE IF EXISTS "app_makers";

-- 7. Hapus tabel _prisma_migrations lama agar dapat di-reset
DELETE FROM "_prisma_migrations";
