/**
 * Tests for encryption utilities
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateSalt, maskSecret, hashSecret } from './encryption.js';

describe('encryption', () => {
  describe('generateSalt', () => {
    it('should generate a 64-character hex string (32 bytes)', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a secret correctly', () => {
      const plaintext = 'my-super-secret-api-key-12345';
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      
      // Encrypted should be different from plaintext
      expect(encrypted).not.toBe(plaintext);
      
      // IV should be 32 characters (16 bytes hex)
      expect(iv).toHaveLength(32);
      
      // Decrypt should return original
      const decrypted = decrypt(encrypted, iv, salt);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext with different salts', () => {
      const plaintext = 'same-secret';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      const result1 = encrypt(plaintext, salt1);
      const result2 = encrypt(plaintext, salt2);
      
      // Different salts should produce different encrypted values
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it('should produce different ciphertext for same plaintext and salt (random IV)', () => {
      const plaintext = 'same-secret';
      const salt = generateSalt();
      
      const result1 = encrypt(plaintext, salt);
      const result2 = encrypt(plaintext, salt);
      
      // Same salt but different IVs should produce different encrypted values
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      const decrypted = decrypt(encrypted, iv, salt);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long secrets', () => {
      const plaintext = 'sk-ant-api03-' + 'x'.repeat(500);
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      const decrypted = decrypt(encrypted, iv, salt);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'p@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      const decrypted = decrypt(encrypted, iv, salt);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '🔐秘密の鍵🔑ключ🚀';
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      const decrypted = decrypt(encrypted, iv, salt);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong salt', () => {
      const plaintext = 'my-secret';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt1);
      
      // Decrypting with wrong salt should throw
      expect(() => decrypt(encrypted, iv, salt2)).toThrow();
    });

    it('should fail to decrypt with wrong IV', () => {
      const plaintext = 'my-secret';
      const salt = generateSalt();
      
      const { encrypted } = encrypt(plaintext, salt);
      const wrongIv = generateSalt().slice(0, 32); // Wrong IV
      
      expect(() => decrypt(encrypted, wrongIv, salt)).toThrow();
    });

    it('should fail to decrypt tampered ciphertext', () => {
      const plaintext = 'my-secret';
      const salt = generateSalt();
      
      const { encrypted, iv } = encrypt(plaintext, salt);
      
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -4) + 'ffff';
      
      expect(() => decrypt(tampered, iv, salt)).toThrow();
    });
  });

  describe('maskSecret', () => {
    it('should mask long secrets correctly', () => {
      const secret = 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('sk-ant-a••••xxxx');
    });

    it('should show first 8 and last 4 characters', () => {
      const secret = '12345678901234567890';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('12345678••••7890');
    });

    it('should handle secrets exactly 12 characters', () => {
      const secret = '123456789012';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('••••••••');
    });

    it('should handle short secrets', () => {
      const secret = 'short';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('••••••••');
    });

    it('should handle 13-character secrets (minimum for partial display)', () => {
      const secret = '1234567890123';
      const masked = maskSecret(secret);
      
      // slice(-4) gives last 4 chars: "0123"
      expect(masked).toBe('12345678••••0123');
    });
  });

  describe('hashSecret', () => {
    it('should produce a 16-character hash', () => {
      const hash = hashSecret('my-secret');
      expect(hash).toHaveLength(16);
    });

    it('should produce consistent hashes for same input', () => {
      const hash1 = hashSecret('my-secret');
      const hash2 = hashSecret('my-secret');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashSecret('secret1');
      const hash2 = hashSecret('secret2');
      expect(hash1).not.toBe(hash2);
    });
  });
});