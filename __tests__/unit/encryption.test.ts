import { encrypt, decrypt, encryptJson, decryptJson } from '@/lib/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt a string', () => {
    const original = 'test message';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should encrypt and decrypt JSON', () => {
    const original = { name: 'John', email: 'john@example.com' };
    const encrypted = encryptJson(original);
    const decrypted = decryptJson<typeof original>(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should produce different ciphertext for same plaintext', () => {
    const original = 'test message';
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(decrypt(encrypted2));
  });

  it('should handle special characters', () => {
    const original = 'Test with émojis 🚀 and spëcial chars!';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });
});
