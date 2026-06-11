import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
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

const bytesToHex = (b: Uint8Array) =>
  Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');

const hexToBytes = (h: string): Uint8Array => {
  const pairs = h.match(/.{2}/g);
  if (!pairs || pairs.length * 2 !== h.length) throw new Error('Invalid hex string');
  return new Uint8Array(pairs.map(b => parseInt(b, 16)));
};

function messageHash(content: string): Uint8Array {
  return sha256(sha256(MESSAGE_PREFIX + content));
}

export class MessageSigningService {
  sign(content: string, privateKey: Uint8Array): SignedMessage {
    const hash = messageHash(content);
    const sig = secp256k1.sign(hash, privateKey, { lowS: true });
    const pubkey = secp256k1.getPublicKey(privateKey, true);
    return {
      version: 1,
      pubkey: bytesToHex(pubkey),
      content,
      sig: bytesToHex(sig.toDERRawBytes()),
    };
  }

  verify(content: string, pubkeyHex: string, sigHex: string): boolean {
    try {
      const hash = messageHash(content);
      return secp256k1.verify(hexToBytes(sigHex), hash, hexToBytes(pubkeyHex));
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
