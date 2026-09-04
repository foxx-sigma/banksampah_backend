import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface UploadableFile {
  buffer?: Buffer;
  path?: string;
  originalname?: string;
  filename?: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  private getSupabaseConfig() {
    const url =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL;
    const key =
      this.configService.get<string>('SUPABASE_KEY') ||
      process.env.SUPABASE_KEY;
    return { url, key };
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

    // Jika konfigurasi Supabase tersedia dan buffer ada, upload ke Supabase Storage
    if (url && key && fileBuffer) {
      try {
        const uploadEndpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filename}`;
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
          const publicUrl = `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filename}`;
          return publicUrl;
        } else {
          const errText = await response.text();
          this.logger.warn(
            `Supabase Storage upload gagal (status ${response.status}): ${errText}. Menggunakan file lokal.`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `Supabase Storage upload error: ${err.message}. Menggunakan file lokal.`,
        );
      }
    }

    // Fallback: URL statis lokal
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

    // Fallback lokal
    try {
      const localRelPath = fileUrl.replace(/^\//, '');
      const localPath = join(process.cwd(), localRelPath);
      if (existsSync(localPath)) {
        await unlink(localPath);
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  }
}
