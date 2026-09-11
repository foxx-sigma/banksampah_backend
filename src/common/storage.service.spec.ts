import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { StorageService, validateImageMagicBytes } from './storage.service.js';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// --- helpers -----------------------------------------------------------

/** Minimal JPEG buffer (starts with FF D8 FF) padded to 12 bytes */
function makeJpegBuffer(): Buffer {
  const buf = Buffer.alloc(12);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

/** Build a mock ConfigService whose `.get(key)` returns values from the map */
function buildConfigService(envMap: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: vi.fn((key: string) => envMap[key]),
  } as unknown as ConfigService;
}

// --- tests -------------------------------------------------------------

describe('StorageService', () => {
  let loggerErrorSpy: Mock;
  let loggerWarnSpy: Mock;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Spy on Logger prototype so any `new Logger(...)` instance is captured
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =====================================================================
  // 1. Bucket key translation from env
  // =====================================================================
  describe('resolveSupabaseBucket', () => {
    it('should translate "nasabah" to the value of SUPABASE_NASABAH_BUCKET from env', () => {
      const configService = buildConfigService({
        SUPABASE_NASABAH_BUCKET: 'my-custom-nasabah-bucket',
      });
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('nasabah')).toBe('my-custom-nasabah-bucket');
    });

    it('should translate "kategori-sampah" to the value of SUPABASE_SAMPAH_BUCKET from env', () => {
      const configService = buildConfigService({
        SUPABASE_SAMPAH_BUCKET: 'prod-sampah',
      });
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('kategori-sampah')).toBe('prod-sampah');
    });

    it('should translate "hadiah" to the value of SUPABASE_HADIAH_BUCKET from env', () => {
      const configService = buildConfigService({
        SUPABASE_HADIAH_BUCKET: 'prod-hadiah',
      });
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('hadiah')).toBe('prod-hadiah');
    });
  });

  // =====================================================================
  // 2. Fallback to default logical key when env var is not set
  // =====================================================================
  describe('resolveSupabaseBucket — env not set', () => {
    it('should fallback to "nasabah" when SUPABASE_NASABAH_BUCKET is undefined', () => {
      const configService = buildConfigService({}); // nothing set
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('nasabah')).toBe('nasabah');
    });

    it('should fallback to "kategori-sampah" when SUPABASE_SAMPAH_BUCKET is undefined', () => {
      const configService = buildConfigService({});
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('kategori-sampah')).toBe('kategori-sampah');
    });

    it('should fallback to "hadiah" when SUPABASE_HADIAH_BUCKET is undefined', () => {
      const configService = buildConfigService({});
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('hadiah')).toBe('hadiah');
    });

    it('should fallback to the logical key for an unknown bucket', () => {
      const configService = buildConfigService({});
      const service = new StorageService(configService);

      expect(service.resolveSupabaseBucket('some-unknown-bucket')).toBe('some-unknown-bucket');
    });
  });

  // =====================================================================
  // 3. Supabase fetch fails → fallback to local without exception,
  //    logger.error called
  // =====================================================================
  describe('uploadFile — Supabase failure fallback', () => {
    it('should return a local fallback URL and call logger.error when Supabase responds with !ok', async () => {
      const configService = buildConfigService({
        SUPABASE_URL: 'https://fake.supabase.co',
        SUPABASE_KEY: 'fake-key',
        SUPABASE_NASABAH_BUCKET: 'real-nasabah-bucket',
      });
      const service = new StorageService(configService);

      // Mock global fetch to simulate a failed Supabase response
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('{"error":"Bucket not found"}'),
      }));

      const file = {
        buffer: makeJpegBuffer(),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      // Should NOT throw
      const result = await service.uploadFile('nasabah', file);

      // Should return a local fallback URL using the LOGICAL key (not Supabase bucket name)
      expect(result).toMatch(/^\/uploads\/nasabah\//);
      expect(result).toMatch(/\.jpg$/);

      // logger.error must have been called (not .warn)
      expect(loggerErrorSpy).toHaveBeenCalled();
      const errorMsg = loggerErrorSpy.mock.calls[0][0] as string;
      expect(errorMsg).toContain('storage_fallback_used: true');
      expect(errorMsg).toContain('403');
      expect(errorMsg).toContain('real-nasabah-bucket');
    });

    it('should return a local fallback URL and call logger.error when fetch throws a network error', async () => {
      const configService = buildConfigService({
        SUPABASE_URL: 'https://fake.supabase.co',
        SUPABASE_KEY: 'fake-key',
      });
      const service = new StorageService(configService);

      // Mock global fetch to simulate a network error
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const file = {
        buffer: makeJpegBuffer(),
        originalname: 'test.png',
        mimetype: 'image/jpeg',
      };

      const result = await service.uploadFile('hadiah', file);

      expect(result).toMatch(/^\/uploads\/hadiah\//);

      expect(loggerErrorSpy).toHaveBeenCalled();
      const errorMsg = loggerErrorSpy.mock.calls[0][0] as string;
      expect(errorMsg).toContain('storage_fallback_used: true');
      expect(errorMsg).toContain('ECONNREFUSED');
    });

    it('should use the Supabase bucket name from env in the upload URL when fetch succeeds', async () => {
      const configService = buildConfigService({
        SUPABASE_URL: 'https://fake.supabase.co',
        SUPABASE_KEY: 'fake-key',
        SUPABASE_SAMPAH_BUCKET: 'my-sampah-prod',
      });
      const service = new StorageService(configService);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }));

      const file = {
        buffer: makeJpegBuffer(),
        originalname: 'sampah.jpg',
        mimetype: 'image/jpeg',
      };

      const result = await service.uploadFile('kategori-sampah', file);

      // Public URL should contain the ACTUAL bucket name from env
      expect(result).toContain('/my-sampah-prod/');
      expect(result).toContain('https://fake.supabase.co/storage/v1/object/public/my-sampah-prod/');

      // Upload endpoint should also use the real bucket name
      const fetchMock = vi.mocked(globalThis.fetch);
      const fetchUrl = fetchMock.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('/my-sampah-prod/');

      // No errors should have been logged
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 4. onModuleInit startup warning
  // =====================================================================
  describe('onModuleInit', () => {
    it('should log a warning when SUPABASE_URL/KEY are not configured', () => {
      const configService = buildConfigService({});
      const service = new StorageService(configService);

      service.onModuleInit();

      expect(loggerWarnSpy).toHaveBeenCalled();
      const warnMsg = loggerWarnSpy.mock.calls[0][0] as string;
      expect(warnMsg).toContain('Supabase Storage belum dikonfigurasi');
    });

    it('should NOT log a warning when SUPABASE_URL and KEY are configured', () => {
      const configService = buildConfigService({
        SUPABASE_URL: 'https://fake.supabase.co',
        SUPABASE_KEY: 'fake-key',
      });
      const service = new StorageService(configService);

      service.onModuleInit();

      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 5. validateImageMagicBytes (kept for completeness)
  // =====================================================================
  describe('validateImageMagicBytes', () => {
    it('should return true for valid JPEG magic bytes', () => {
      expect(validateImageMagicBytes(makeJpegBuffer())).toBe(true);
    });

    it('should return false for too-short buffer', () => {
      expect(validateImageMagicBytes(Buffer.alloc(4))).toBe(false);
    });

    it('should return false for random bytes', () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
      expect(validateImageMagicBytes(buf)).toBe(false);
    });
  });
});
