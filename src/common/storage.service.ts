import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { extname, resolve } from 'node:path';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) {
    return false;
  }
  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }
  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  return false;
}

export interface UploadableFile {
  buffer?: Buffer;
  path?: string;
  originalname?: string;
  filename?: string;
  mimetype?: string;
  size?: number;
}

/**
 * Mapping dari logical bucket key (dipakai controller) ke env var name
 * yang menyimpan nama bucket Supabase sesungguhnya.
 */
const BUCKET_ENV_MAP: Record<string, string> = {
  nasabah: 'SUPABASE_NASABAH_BUCKET',
  'kategori-sampah': 'SUPABASE_SAMPAH_BUCKET',
  hadiah: 'SUPABASE_HADIAH_BUCKET',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Lifecycle hook: dipanggil sekali saat modul diinisialisasi.
   * Memberikan peringatan awal jika Supabase belum dikonfigurasi.
   */
  onModuleInit() {
    const { url, key } = this.getSupabaseConfig();
    if (!url || !key) {
      this.logger.warn(
        'Supabase Storage belum dikonfigurasi (SUPABASE_URL/SUPABASE_KEY kosong) — seluruh upload foto akan memakai fallback local',
      );
    }
  }

  private getSupabaseConfig() {
    const url =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL;
    const key =
      this.configService.get<string>('SUPABASE_KEY') ||
      process.env.SUPABASE_KEY;
    return { url, key };
  }

  /**
   * Menerjemahkan logical bucket key ke nama bucket Supabase sesungguhnya
   * yang dibaca dari environment variable. Jika env var tidak diset,
   * fallback ke logical key itu sendiri (backward-compatible).
   */
  resolveSupabaseBucket(logicalKey: string): string {
    const envVarName = BUCKET_ENV_MAP[logicalKey];
    if (envVarName) {
      const envValue =
        this.configService.get<string>(envVarName) ||
        process.env[envVarName];
      if (envValue) {
        return envValue;
      }
    }
    // Fallback: pakai logical key sebagai nama bucket
    return logicalKey;
  }

  async uploadFile(
    bucket: string,
    file: UploadableFile,
  ): Promise<string> {
    const { url, key } = this.getSupabaseConfig();

    const rawExt = extname(file.originalname || file.filename || '').toLowerCase();
    let safeExt = '.jpg';
    if (rawExt === '.png' || file.mimetype === 'image/png') {
      safeExt = '.png';
    } else if (rawExt === '.webp' || file.mimetype === 'image/webp') {
      safeExt = '.webp';
    } else if (rawExt === '.jpeg' || rawExt === '.jpg' || file.mimetype === 'image/jpeg') {
      safeExt = '.jpg';
    }
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;

    let fileBuffer: Buffer | null = file.buffer || null;
    if (!fileBuffer && file.path && existsSync(file.path)) {
      try {
        fileBuffer = await readFile(file.path);
      } catch (err: any) {
        this.logger.error(`Gagal membaca file dari path ${file.path}: ${err.message}`);
      }
    }

    if (fileBuffer) {
      if (!validateImageMagicBytes(fileBuffer)) {
        if (file.path && existsSync(file.path)) {
          try {
            await unlink(file.path);
          } catch {
            // ignore
          }
        }
        throw new BadRequestException(
          'Format berkas tidak valid: isi berkas bukan gambar JPG, PNG, atau WEBP yang sah',
        );
      }
    }

    // Resolve nama bucket Supabase dari env (logical key tetap dipakai untuk path lokal)
    const supabaseBucket = this.resolveSupabaseBucket(bucket);

    // Jika konfigurasi Supabase tersedia dan buffer ada, upload ke Supabase Storage
    if (url && key && fileBuffer) {
      try {
        const uploadEndpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${supabaseBucket}/${filename}`;
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': file.mimetype || 'image/jpeg',
            'x-upsert': 'true',
          },
          body: new Uint8Array(fileBuffer),
        });

        if (response.ok) {
          // Hapus file temp lokal jika ada
          if (file.path && existsSync(file.path)) {
            try {
              await unlink(file.path);
            } catch {
              // ignore
            }
          }
          const publicUrl = `${url.replace(/\/$/, '')}/storage/v1/object/public/${supabaseBucket}/${filename}`;
          return publicUrl;
        } else {
          const errText = await response.text();
          this.logger.error(
            `Supabase Storage upload GAGAL — ` +
            `storage_fallback_used: true | ` +
            `bucket: "${supabaseBucket}" (logical key: "${bucket}") | ` +
            `status: ${response.status} | ` +
            `response: ${errText}. ` +
            `Menggunakan fallback penyimpanan lokal.`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Supabase Storage upload ERROR — ` +
          `storage_fallback_used: true | ` +
          `bucket: "${supabaseBucket}" (logical key: "${bucket}") | ` +
          `error: ${err.message}. ` +
          `Menggunakan fallback penyimpanan lokal.`,
        );
      }
    }

    // Fallback: URL statis lokal (tetap pakai logical key untuk struktur folder)
    if (file.filename) {
      return `/uploads/${bucket}/${file.filename}`;
    }
    return `/uploads/${bucket}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    const { url, key } = this.getSupabaseConfig();

    if (url && key && fileUrl.startsWith(url)) {
      try {
        const parts = fileUrl.replace(`${url}/storage/v1/object/public/`, '').split('/');
        const bucket = parts[0];
        const filename = parts.slice(1).join('/');

        if (bucket && filename) {
          const deleteEndpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filename}`;
          const response = await fetch(deleteEndpoint, {
            method: 'DELETE',
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          });
          return response.ok;
        }
      } catch (err: any) {
        this.logger.warn(`Gagal menghapus file di Supabase Storage: ${err.message}`);
      }
    }

    // Fallback lokal (hanya izinkan penghapusan berkas di dalam direktori uploads)
    try {
      const uploadRootDir = resolve(process.cwd(), 'uploads');
      const localRelPath = fileUrl.replace(/^\/?(?:uploads\/)?/, '');
      const localPath = resolve(uploadRootDir, localRelPath);

      if (localPath.startsWith(uploadRootDir) && existsSync(localPath)) {
        await unlink(localPath);
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  }
}
