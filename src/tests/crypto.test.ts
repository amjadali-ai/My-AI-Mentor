import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  hashSecret,
  verifySecret,
  hashRecoveryPhrase,
  generateVaultKey,
  encryptData,
  decryptData,
  packageVaultKey,
  recoverVaultKey,
} from '../lib/crypto';

describe('Security & Cryptography Service (crypto.ts)', () => {
  it('generates unique, cryptographically random salts', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).toHaveLength(32); // 16 bytes in hex = 32 chars
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
  });

  it('correctly hashes and verifies a 4 to 8 digit PIN using PBKDF2', async () => {
    const salt = generateSalt();
    const pin = '198425';
    const hash = await hashSecret(pin, salt);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(32);

    // Verify correct PIN passes
    const isValid = await verifySecret(pin, hash, salt);
    expect(isValid).toBe(true);

    // Verify incorrect PIN fails
    const isWrongValid = await verifySecret('123456', hash, salt);
    expect(isWrongValid).toBe(false);
  });

  it('hashes recovery phrases deterministically in lowercase', async () => {
    const phrase1 = 'BS Artificial Intelligence 2026';
    const phrase2 = '   bs artificial intelligence 2026   ';
    const hash1 = await hashRecoveryPhrase(phrase1);
    const hash2 = await hashRecoveryPhrase(phrase2);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 characters
  });

  it('encrypts and decrypts sensitive data using AES-GCM 256-bit', async () => {
    const secretMessage = JSON.stringify({ student: 'Amjad Roghani', semester: '3rd Semester' });
    const passphrase = 'MyMasterPassphrase2026!';

    const pkg = await encryptData(secretMessage, passphrase);
    expect(pkg.ciphertext).toBeDefined();
    expect(pkg.iv).toHaveLength(24); // 12 bytes hex
    expect(pkg.salt).toHaveLength(32); // 16 bytes hex

    const decrypted = await decryptData(pkg, passphrase);
    expect(decrypted).toBe(secretMessage);

    // Wrong passphrase should fail decryption
    await expect(decryptData(pkg, 'WrongPassphrase')).rejects.toThrow();
  });

  it('implements genuine recovery of encrypted key material via recovery phrase', async () => {
    const vaultKey = generateVaultKey();
    expect(vaultKey).toHaveLength(64); // 32 bytes hex = 256 bits

    const userPin = '739104';
    const recoveryPhrase = 'falcon horizon quantum matrix umt lahore';

    // Package vault key with both PIN and Recovery Phrase
    const pinPackage = await packageVaultKey(vaultKey, userPin);
    const recoveryPackage = await packageVaultKey(vaultKey, recoveryPhrase);

    // 1. Recover using PIN
    const recoveredFromPin = await recoverVaultKey(pinPackage, userPin);
    expect(recoveredFromPin).toBe(vaultKey);

    // 2. Recover using Recovery Phrase (Genuine Key Recovery)
    const recoveredFromPhrase = await recoverVaultKey(recoveryPackage, recoveryPhrase);
    expect(recoveredFromPhrase).toBe(vaultKey);

    // 3. Invalid phrase must return null and fail safely without silent deletion
    const invalidAttempt = await recoverVaultKey(recoveryPackage, 'wrong recovery words');
    expect(invalidAttempt).toBeNull();
  });
});

