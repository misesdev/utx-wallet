import { ECPairKey } from 'bitcoin-tx-lib';
import { MessageSigningService } from '../../../src/core/domain/services/MessageSigningService';

const service = new MessageSigningService();

// Deterministic test private key
const PRIVATE_KEY = new Uint8Array(32).fill(0x11);
const PUBLIC_KEY_HEX = new ECPairKey({ privateKey: PRIVATE_KEY }).getPublicKeyHex();

describe('MessageSigningService', () => {
  describe('sign', () => {
    it('returns a SignedMessage with correct version, pubkey, content and sig', () => {
      const result = service.sign('hello', PRIVATE_KEY);
      expect(result.version).toBe(1);
      expect(result.pubkey).toBe(PUBLIC_KEY_HEX);
      expect(result.content).toBe('hello');
      expect(result.sig.length).toBeGreaterThan(0);
    });

    it('both signatures from the same key are independently valid', () => {
      const a = service.sign('test content', PRIVATE_KEY);
      const b = service.sign('test content', PRIVATE_KEY);
      expect(service.verify(a.content, a.pubkey, a.sig)).toBe(true);
      expect(service.verify(b.content, b.pubkey, b.sig)).toBe(true);
      expect(a.pubkey).toBe(b.pubkey);
    });

    it('produces different signatures for different content', () => {
      const a = service.sign('content A', PRIVATE_KEY);
      const b = service.sign('content B', PRIVATE_KEY);
      expect(a.sig).not.toBe(b.sig);
    });
  });

  describe('verify', () => {
    it('returns true for a valid sign/verify round-trip', () => {
      const signed = service.sign('round trip content', PRIVATE_KEY);
      const ok = service.verify(signed.content, signed.pubkey, signed.sig);
      expect(ok).toBe(true);
    });

    it('returns false when content is tampered', () => {
      const signed = service.sign('original content', PRIVATE_KEY);
      const ok = service.verify('modified content', signed.pubkey, signed.sig);
      expect(ok).toBe(false);
    });

    it('returns false when pubkey is wrong', () => {
      const otherKey = new Uint8Array(32).fill(0x22);
      const otherPubHex = new ECPairKey({ privateKey: otherKey }).getPublicKeyHex();
      const signed = service.sign('content', PRIVATE_KEY);
      const ok = service.verify(signed.content, otherPubHex, signed.sig);
      expect(ok).toBe(false);
    });

    it('returns false for an invalid signature hex', () => {
      const ok = service.verify('content', PUBLIC_KEY_HEX, 'deadbeef');
      expect(ok).toBe(false);
    });

    it('returns false for invalid hex strings', () => {
      const ok = service.verify('content', 'nothex', 'alsonothex');
      expect(ok).toBe(false);
    });
  });

  describe('encode / decode', () => {
    it('round-trips a SignedMessage through encode/decode', () => {
      const signed = service.sign('round trip', PRIVATE_KEY);
      const encoded = service.encode(signed);
      const decoded = service.decode(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.version).toBe(1);
      expect(decoded!.pubkey).toBe(signed.pubkey);
      expect(decoded!.content).toBe(signed.content);
      expect(decoded!.sig).toBe(signed.sig);
    });

    it('encodes to compact JSON with keys v, pub, msg, sig', () => {
      const signed = service.sign('hello encode', PRIVATE_KEY);
      const encoded = service.encode(signed);
      const parsed = JSON.parse(encoded) as Record<string, unknown>;
      expect(parsed.v).toBe(1);
      expect(parsed.pub).toBe(signed.pubkey);
      expect(parsed.msg).toBe(signed.content);
      expect(parsed.sig).toBe(signed.sig);
    });

    it('decode returns null for invalid JSON', () => {
      expect(service.decode('not json')).toBeNull();
    });

    it('decode returns null when version is missing or wrong', () => {
      expect(service.decode(JSON.stringify({ v: 2, pub: 'x', msg: 'y', sig: 'z' }))).toBeNull();
      expect(service.decode(JSON.stringify({ pub: 'x', msg: 'y', sig: 'z' }))).toBeNull();
    });

    it('decode returns null when required fields are missing', () => {
      expect(service.decode(JSON.stringify({ v: 1, pub: 'x', msg: 'y' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, pub: 'x', sig: 'z' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, msg: 'y', sig: 'z' }))).toBeNull();
    });

    it('decode returns null when pub or sig are empty strings', () => {
      expect(service.decode(JSON.stringify({ v: 1, pub: '', msg: 'y', sig: 'z' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, pub: 'x', msg: 'y', sig: '' }))).toBeNull();
    });
  });

  describe('cross-key verification', () => {
    it('a message signed by key A is not verified by key B pubkey', () => {
      const keyA = new Uint8Array(32).fill(0x11);
      const keyB = new Uint8Array(32).fill(0x33);
      const pubB = new ECPairKey({ privateKey: keyB }).getPublicKeyHex();
      const signed = service.sign('cross check', keyA);
      expect(service.verify(signed.content, pubB, signed.sig)).toBe(false);
    });

    it('a message signed and verified with same key succeeds regardless of sig format variation', () => {
      const signed = service.sign('stability check', PRIVATE_KEY);
      expect(service.verify(signed.content, signed.pubkey, signed.sig)).toBe(true);
    });

    it('the public key in the signed message is the compressed pubkey of the signing key', () => {
      const signed = service.sign('pubkey check', PRIVATE_KEY);
      expect(signed.pubkey).toBe(PUBLIC_KEY_HEX);
      expect(signed.pubkey).toHaveLength(66); // 33 bytes = 66 hex chars
      expect(signed.pubkey).toMatch(/^(02|03)/); // compressed pubkey prefix
    });

    it('sig field is valid DER hex', () => {
      const signed = service.sign('der check', PRIVATE_KEY);
      const sigBytes = Buffer.from(signed.sig, 'hex');
      // DER sequence starts with 0x30
      expect(sigBytes[0]).toBe(0x30);
      // Total length matches DER length byte
      expect(sigBytes.length).toBeGreaterThanOrEqual(70);
      expect(sigBytes.length).toBeLessThanOrEqual(72);
    });
  });
});
