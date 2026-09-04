-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NASABAH', 'ADMIN');

-- CreateEnum
CREATE TYPE "JenisSampah" AS ENUM ('plastik', 'kertas', 'logam', 'kaca');

-- CreateEnum
CREATE TYPE "StatusSetor" AS ENUM ('menunggu_konfirmasi', 'diverifikasi', 'ditolak', 'selesai');

-- CreateEnum
CREATE TYPE "StatusPenukaran" AS ENUM ('diproses', 'selesai');

-- CreateTable
CREATE TABLE "app_makers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "namaSiswa" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "namaApp" TEXT NOT NULL,
    "appKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_makers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nasabah" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namaNasabah" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "telp" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "foto" TEXT,
    "saldoPoin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nasabah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_bank" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namaUnit" TEXT NOT NULL,
    "namaPengelola" TEXT NOT NULL,
    "telp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori_sampah" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "namaKategori" TEXT NOT NULL,
    "hargaPerKg" INTEGER NOT NULL,
    "poinPerKg" INTEGER NOT NULL,
    "jenis" "JenisSampah" NOT NULL,
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategori_sampah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setor_sampah" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "nasabahId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalBeratKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBeratKgReal" DOUBLE PRECISION,
    "estimasiTotalPoin" INTEGER NOT NULL DEFAULT 0,
    "totalPoinReal" INTEGER,
    "status" "StatusSetor" NOT NULL DEFAULT 'menunggu_konfirmasi',
    "catatan" TEXT,
    "catatanAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setor_sampah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detail_setor" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "setorSampahId" TEXT NOT NULL,
    "kategoriSampahId" TEXT NOT NULL,
    "beratKg" DOUBLE PRECISION NOT NULL,
    "beratKgReal" DOUBLE PRECISION,
    "poinPerKg" INTEGER NOT NULL,
    "subtotalPoin" INTEGER NOT NULL DEFAULT 0,
    "subtotalPoinReal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detail_setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hadiah" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "namaHadiah" TEXT NOT NULL,
    "deskripsi" TEXT,
    "poinDibutuhkan" INTEGER NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hadiah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penukaran_poin" (
    "id" TEXT NOT NULL,
    "appMakerId" TEXT NOT NULL,
    "nasabahId" TEXT NOT NULL,
    "hadiahId" TEXT NOT NULL,
    "poinDigunakan" INTEGER NOT NULL,
    "status" "StatusPenukaran" NOT NULL DEFAULT 'diproses',
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penukaran_poin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_makers_email_key" ON "app_makers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_makers_appKey_key" ON "app_makers"("appKey");

-- CreateIndex
CREATE UNIQUE INDEX "users_appMakerId_username_key" ON "users"("appMakerId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "nasabah_userId_key" ON "nasabah"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_bank_userId_key" ON "admin_bank"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_bank" ADD CONSTRAINT "admin_bank_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_bank" ADD CONSTRAINT "admin_bank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kategori_sampah" ADD CONSTRAINT "kategori_sampah_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setor_sampah" ADD CONSTRAINT "setor_sampah_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setor_sampah" ADD CONSTRAINT "setor_sampah_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "nasabah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_setor" ADD CONSTRAINT "detail_setor_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_setor" ADD CONSTRAINT "detail_setor_setorSampahId_fkey" FOREIGN KEY ("setorSampahId") REFERENCES "setor_sampah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_setor" ADD CONSTRAINT "detail_setor_kategoriSampahId_fkey" FOREIGN KEY ("kategoriSampahId") REFERENCES "kategori_sampah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadiah" ADD CONSTRAINT "hadiah_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penukaran_poin" ADD CONSTRAINT "penukaran_poin_appMakerId_fkey" FOREIGN KEY ("appMakerId") REFERENCES "app_makers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penukaran_poin" ADD CONSTRAINT "penukaran_poin_nasabahId_fkey" FOREIGN KEY ("nasabahId") REFERENCES "nasabah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penukaran_poin" ADD CONSTRAINT "penukaran_poin_hadiahId_fkey" FOREIGN KEY ("hadiahId") REFERENCES "hadiah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
