import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { sanitizeText, SanitizeText } from './sanitize.decorator.js';

class TestDto {
  @SanitizeText()
  nama: string;

  @SanitizeText()
  deskripsi?: string;

  password?: string; // no sanitize
}

describe('SanitizeText and sanitizeText utility', () => {
  it('should strip script tags and their contents', () => {
    const input = "<script>alert('XSS')</script>";
    const result = sanitizeText(input);
    expect(result).toBe('');
  });

  it('should strip img tags with onerror handlers', () => {
    const input = "<img src=x onerror=alert('XSS')>";
    const result = sanitizeText(input);
    expect(result).toBe('');
  });

  it('should strip svg tags with onload handlers', () => {
    const input = '<svg onload=alert(1)>';
    const result = sanitizeText(input);
    expect(result).toBe('');
  });

  it('should strip javascript: pseudoprotocol', () => {
    const input = 'javascript:alert(document.cookie)';
    const result = sanitizeText(input);
    expect(result).toBe('alert(document.cookie)');
  });

  it('should recursively strip nested HTML tags', () => {
    const input = '<<script>script>alert("XSS")<</script>/script>';
    const result = sanitizeText(input);
    expect(result).not.toContain('<script>');
  });

  it('should strip iframe and style tags along with content', () => {
    const input = '<iframe src="http://evil.com"></iframe>Hello<style>body{color:red}</style>';
    const result = sanitizeText(input);
    expect(result).toBe('Hello');
  });

  it('should preserve safe plain text and entities', () => {
    const input = 'Bank Sampah &lt;Berkah&gt; Mandiri';
    const result = sanitizeText(input);
    expect(result).toBe('Bank Sampah &lt;Berkah&gt; Mandiri');
  });

  it('should return non-string inputs as-is', () => {
    expect(sanitizeText(12345)).toBe(12345);
    expect(sanitizeText(null)).toBe(null);
    expect(sanitizeText(undefined)).toBe(undefined);
  });

  it('should transform DTO properties using class-transformer', () => {
    const raw = {
      nama: "<script>alert('hack')</script>Budi",
      deskripsi: '<img src=x onerror=alert(1)>Deskripsi barang',
      password: '<raw_password!>',
    };

    const instance = plainToInstance(TestDto, raw);
    expect(instance.nama).toBe('Budi');
    expect(instance.deskripsi).toBe('Deskripsi barang');
    expect(instance.password).toBe('<raw_password!>');
  });
});
