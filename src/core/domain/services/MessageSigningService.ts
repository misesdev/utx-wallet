import { ECPairKey, sha256, bytesToHex, hexToBytes } from 'bitcoin-tx-lib';
import type { SignedMessage } from '../entities/SignedMessage';

/**
 * Portable QR payload format (compact JSON):
 *   {"v":1,"pub":"<33-byte compressed pubkey hex>","msg":"<content>","sig":"<DER sig hex>"}
 *
 * Hash convention: SHA256(SHA256("UTXWallet Signed Message:\n" + content))
 * This is deterministic, verifiable with any secp256k1 library, and avoids
 * BIP322 full-transaction complexity for arbitrary-content signing.
 */

const MESSAGE_PREFIX = 'UTXWallet Signed Message:\n';

function messageHash(content: string): Uint8Array {
  const encoded = new TextEncoder().encode(MESSAGE_PREFIX + content);
  return sha256(sha256(encoded));
}

class PublicKeyVerifier extends ECPairKey {
  private readonly _pubkeyBytes: Uint8Array;

  constructor(pubkeyBytes: Uint8Array) {
    super({});
    this._pubkeyBytes = pubkeyBytes;
  }

  override getPublicKey(): Uint8Array {
    return this._pubkeyBytes;
  }
}

export class MessageSigningService {
  sign(content: string, privateKey: Uint8Array): SignedMessage {
    const hash = messageHash(content);
    const key = new ECPairKey({ privateKey });
    return {
      version: 1,
      pubkey: key.getPublicKeyHex(),
      content,
      sig: bytesToHex(key.signDER(hash)),
    };
  }

  verify(content: string, pubkeyHex: string, sigHex: string): boolean {
    try {
      const hash = messageHash(content);
      const verifier = new PublicKeyVerifier(hexToBytes(pubkeyHex));
      return verifier.verifySignature(hash, hexToBytes(sigHex));
    } catch {
      return false;
    }
  }

  encode(signed: SignedMessage): string {
    return JSON.stringify({
      v: signed.version,
      pub: signed.pubkey,
      msg: signed.content,
      sig: signed.sig,
    });
  }

  decode(encoded: string): SignedMessage | null {
    try {
      const parsed = JSON.parse(encoded) as Record<string, unknown>;
      if (
        parsed.v !== 1 ||
        typeof parsed.pub !== 'string' ||
        typeof parsed.msg !== 'string' ||
        typeof parsed.sig !== 'string' ||
        !parsed.pub ||
        !parsed.sig
      ) {
        return null;
      }
      return {
        version: 1,
        pubkey: parsed.pub,
        content: parsed.msg,
        sig: parsed.sig,
      };
    } catch {
      return null;
    }
  }
}
