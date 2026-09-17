-- Migration: remove_appmaker_multitenancy
-- Removes AppMaker multi-tenancy: drop app_makers table and appMakerId columns

-- Drop all foreign keys referencing app_makers
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_appMakerId_fkey";
ALTER TABLE "nasabah" DROP CONSTRAINT IF EXISTS "nasabah_appMakerId_fkey";
ALTER TABLE "admin_bank" DROP CONSTRAINT IF EXISTS "admin_bank_appMakerId_fkey";
ALTER TABLE "kategori_sampah" DROP CONSTRAINT IF EXISTS "kategori_sampah_appMakerId_fkey";
ALTER TABLE "setor_sampah" DROP CONSTRAINT IF EXISTS "setor_sampah_appMakerId_fkey";
ALTER TABLE "detail_setor" DROP CONSTRAINT IF EXISTS "detail_setor_appMakerId_fkey";
ALTER TABLE "hadiah" DROP CONSTRAINT IF EXISTS "hadiah_appMakerId_fkey";
ALTER TABLE "penukaran_poin" DROP CONSTRAINT IF EXISTS "penukaran_poin_appMakerId_fkey";

-- Drop composite unique index
DROP INDEX IF EXISTS "users_appMakerId_username_key";

-- Drop appMakerId columns from all tables
ALTER TABLE "users" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "nasabah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "admin_bank" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "kategori_sampah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "setor_sampah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "detail_setor" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "hadiah" DROP COLUMN IF EXISTS "appMakerId";
ALTER TABLE "penukaran_poin" DROP COLUMN IF EXISTS "appMakerId";

-- Create new global unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- Add kodeSetor and kodePenukaran columns if not exist
ALTER TABLE "setor_sampah" ADD COLUMN IF NOT EXISTS "kodeSetor" TEXT;
ALTER TABLE "penukaran_poin" ADD COLUMN IF NOT EXISTS "kodePenukaran" TEXT;

-- Drop app_makers table
DROP TABLE IF EXISTS "app_makers";
