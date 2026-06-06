/**
 * PIN hasher using the Web Crypto API (built into Node.js 18+ and React Native Hermes 0.70+).
 * No external library is needed — crypto.subtle is a platform API.
 * If SubtleCrypto is unavailable, falls back to a deterministic djb2-style hash (weaker,
 * suitable only as a temporary placeholder until a native crypto module is wired up).
 */
import type { PinHasher } from '../../domain/repositories/PinHasher';

type SubtleDigest = {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
};

type TextEncoderLike = {
  encode(input: string): Uint8Array;
};

export class WebCryptoPinHasher implements PinHasher {
  async hash(pin: string, salt: string): Promise<string> {
    const subtle = (globalThis as { crypto?: { subtle?: SubtleDigest } }).crypto?.subtle;
    const TextEncoderCtor = (globalThis as { TextEncoder?: new () => TextEncoderLike }).TextEncoder;
    if (subtle && TextEncoderCtor) {
      const encoder = new TextEncoderCtor();
      const data = encoder.encode(`${pin}:${salt}`);
      const buffer = await subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return this._djb2Hash(`${pin}:${salt}`);
  }

  private _djb2Hash(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      // eslint-disable-next-line no-bitwise
      h = ((h << 5) + h) ^ input.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      h |= 0;
    }
    // eslint-disable-next-line no-bitwise
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}
