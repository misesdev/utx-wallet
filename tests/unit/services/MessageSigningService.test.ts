import { secp256k1 } from '@noble/curves/secp256k1';
import { MessageSigningService } from '../../../src/core/domain/services/MessageSigningService';

const service = new MessageSigningService();

// Deterministic test private key
const PRIVATE_KEY = new Uint8Array(32).fill(0x11);
const PUBLIC_KEY_HEX = (() => {
  const pub = secp256k1.getPublicKey(PRIVATE_KEY, true);
  return Array.from(pub).map(b => b.toString(16).padStart(2, '0')).join('');
})();

describe('MessageSigningService', () => {
  describe('sign', () => {
    it('returns a SignedMessage with correct version, pubkey, content and sig', () => {
      const result = service.sign('hello', PRIVATE_KEY);
      expect(result.version).toBe(1);
      expect(result.pubkey).toBe(PUBLIC_KEY_HEX);
      expect(result.content).toBe('hello');
      expect(result.sig.length).toBeGreaterThan(0);
    });

    it('produces deterministic signature for same input', () => {
      const a = service.sign('test content', PRIVATE_KEY);
      const b = service.sign('test content', PRIVATE_KEY);
      expect(a.sig).toBe(b.sig);
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
      const otherPub = secp256k1.getPublicKey(otherKey, true);
      const otherPubHex = Array.from(otherPub).map(b => b.toString(16).padStart(2, '0')).join('');
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
      const signed = service.sign('test', PRIVATE_KEY);
      const encoded = service.encode(signed);
      const parsed = JSON.parse(encoded);
      expect(parsed.v).toBe(1);
      expect(parsed.pub).toBe(signed.pubkey);
      expect(parsed.msg).toBe(signed.content);
      expect(parsed.sig).toBe(signed.sig);
    });

    it('decode returns null for invalid JSON', () => {
      expect(service.decode('not json')).toBeNull();
    });

    it('decode returns null when version is missing or wrong', () => {
      expect(service.decode(JSON.stringify({ v: 2, pub: 'a', msg: 'b', sig: 'c' }))).toBeNull();
      expect(service.decode(JSON.stringify({ pub: 'a', msg: 'b', sig: 'c' }))).toBeNull();
    });

    it('decode returns null when required fields are missing', () => {
      expect(service.decode(JSON.stringify({ v: 1, msg: 'b', sig: 'c' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, pub: 'a', sig: 'c' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, pub: 'a', msg: 'b' }))).toBeNull();
    });

    it('decode returns null when pub or sig are empty strings', () => {
      expect(service.decode(JSON.stringify({ v: 1, pub: '', msg: 'b', sig: 'c' }))).toBeNull();
      expect(service.decode(JSON.stringify({ v: 1, pub: 'a', msg: 'b', sig: '' }))).toBeNull();
    });
  });
});
