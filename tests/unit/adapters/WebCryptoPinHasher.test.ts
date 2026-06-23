import { WebCryptoPinHasher } from '../../../src/core/infrastructure/adapters/PinHasherAdapter';

describe('WebCryptoPinHasher', () => {
  let hasher: WebCryptoPinHasher;

  beforeEach(() => {
    hasher = new WebCryptoPinHasher();
  });

  describe('hash() — happy path', () => {
    it('returns a 64-character hex string (SHA-256)', async () => {
      const result = await hasher.hash('1234', 'salt-abc');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same inputs produce the same hash', async () => {
      const a = await hasher.hash('123456', 'my-salt');
      const b = await hasher.hash('123456', 'my-salt');
      expect(a).toBe(b);
    });

    it('produces different hashes for different PINs', async () => {
      const a = await hasher.hash('111111', 'same-salt');
      const b = await hasher.hash('999999', 'same-salt');
      expect(a).not.toBe(b);
    });

    it('produces different hashes for different salts', async () => {
      const a = await hasher.hash('123456', 'salt-A');
      const b = await hasher.hash('123456', 'salt-B');
      expect(a).not.toBe(b);
    });

    it('includes the salt in the computation (not just PIN)', async () => {
      const pinOnly = await hasher.hash('123456', '');
      const withSalt = await hasher.hash('123456', 'extra-entropy');
      expect(pinOnly).not.toBe(withSalt);
    });
  });

  describe('hash() — failure modes', () => {
    it('throws when crypto.subtle is unavailable', async () => {
      const original = (globalThis as { crypto?: unknown }).crypto;
      (globalThis as { crypto?: unknown }).crypto = undefined;
      try {
        await expect(hasher.hash('1234', 'salt')).rejects.toThrow('SubtleCrypto is not available');
      } finally {
        (globalThis as { crypto?: unknown }).crypto = original;
      }
    });

    it('thrown error message mentions secure runtime', async () => {
      const original = (globalThis as { crypto?: unknown }).crypto;
      (globalThis as { crypto?: unknown }).crypto = undefined;
      try {
        await expect(hasher.hash('1234', 'salt')).rejects.toThrow('secure runtime');
      } finally {
        (globalThis as { crypto?: unknown }).crypto = original;
      }
    });
  });

  describe('hash() — TextEncoder fallback', () => {
    it('still produces a valid SHA-256 hash when globalThis.TextEncoder is undefined', async () => {
      const original = (globalThis as { TextEncoder?: unknown }).TextEncoder;
      (globalThis as { TextEncoder?: unknown }).TextEncoder = undefined;
      try {
        const result = await hasher.hash('1234', 'salt-abc');
        expect(result).toMatch(/^[0-9a-f]{64}$/);
      } finally {
        (globalThis as { TextEncoder?: unknown }).TextEncoder = original;
      }
    });

    it('produces the same hash with and without globalThis.TextEncoder', async () => {
      const withEncoder = await hasher.hash('5678', 'test-salt');

      const original = (globalThis as { TextEncoder?: unknown }).TextEncoder;
      (globalThis as { TextEncoder?: unknown }).TextEncoder = undefined;
      let withoutEncoder: string;
      try {
        withoutEncoder = await hasher.hash('5678', 'test-salt');
      } finally {
        (globalThis as { TextEncoder?: unknown }).TextEncoder = original;
      }

      expect(withoutEncoder!).toBe(withEncoder);
    });

    it('fallback encoder is deterministic', async () => {
      const original = (globalThis as { TextEncoder?: unknown }).TextEncoder;
      (globalThis as { TextEncoder?: unknown }).TextEncoder = undefined;
      let a: string;
      let b: string;
      try {
        a = await hasher.hash('9999', 'salt-x');
        b = await hasher.hash('9999', 'salt-x');
      } finally {
        (globalThis as { TextEncoder?: unknown }).TextEncoder = original;
      }
      expect(a!).toBe(b!);
    });
  });
});
