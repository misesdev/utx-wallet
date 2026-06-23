/**
 * PIN hasher using the Web Crypto API (built into Node.js 18+ and React Native Hermes 0.70+).
 * No external library is needed — crypto.subtle is a platform API.
 * Falls back to a pure-JS UTF-8 encoder when TextEncoder is absent from globalThis
 * (some React Native Hermes builds expose it on `global` but not `globalThis`).
 * Throws only if SubtleCrypto itself is unavailable, as that is unrecoverable.
 */
import type { PinHasher } from '../../domain/repositories/PinHasher';

type SubtleDigest = {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
};

type TextEncoderCtor = new () => { encode(s: string): Uint8Array };

export class WebCryptoPinHasher implements PinHasher {
  /** Encode a string to UTF-8 bytes. Prefers the platform TextEncoder; falls back to pure JS. */
  private _utf8Encode(str: string): Uint8Array {
    const TE = (globalThis as { TextEncoder?: TextEncoderCtor }).TextEncoder ?? null;

    if (TE) return new TE().encode(str);

    // Pure-JS UTF-8 encoder covering the Basic Multilingual Plane (BMP).
    // PINs and salts are ASCII-only so this path is always correct for them.
    const bytes: number[] = [];
    /* eslint-disable no-bitwise */
    for (let i = 0; i < str.length; i++) {
      const cp = str.charCodeAt(i);
      if (cp < 0x80) {
        bytes.push(cp);
      } else if (cp < 0x800) {
        bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else {
        bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      }
    }
    /* eslint-enable no-bitwise */
    return new Uint8Array(bytes);
  }

  async hash(pin: string, salt: string): Promise<string> {
    const subtle = (globalThis as { crypto?: { subtle?: SubtleDigest } }).crypto?.subtle;
    if (!subtle) {
      throw new Error(
        'SubtleCrypto is not available in this environment. PIN hashing requires a secure runtime.',
      );
    }
    const data = this._utf8Encode(`${pin}:${salt}`);
    const buffer = await subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
