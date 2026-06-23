import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';
import type { PinHasher } from '../../repositories/PinHasher';

/** Regex matching the legacy djb2 hash format: exactly 8 lowercase hex chars. */
const DJB2_PATTERN = /^[0-9a-f]{8}$/;

export class VerifyPinUseCase {
  constructor(
    private readonly repo: SecuritySettingsRepository,
    private readonly hasher: PinHasher,
  ) {}

  async execute(pin: string): Promise<boolean> {
    const credentials = await this.repo.loadPinCredentials();
    if (!credentials) return false;

    // Try SHA-256 first. If SubtleCrypto is unavailable the hasher throws;
    // we catch and still attempt the legacy djb2 path below.
    let sha256: string | null = null;
    try {
      sha256 = await this.hasher.hash(pin, credentials.salt);
      if (sha256 === credentials.hash) return true;
    } catch {
      // crypto.subtle unavailable — fall through to legacy check
    }

    // Legacy migration: PINs set before SHA-256 was introduced were hashed with
    // djb2, producing an 8-char lowercase hex string. Verify with the original
    // algorithm and transparently upgrade the stored hash on success.
    if (DJB2_PATTERN.test(credentials.hash)) {
      const legacy = VerifyPinUseCase._djb2(`${pin}:${credentials.salt}`);
      if (legacy === credentials.hash) {
        if (sha256) {
          // Upgrade in background; failure is silent because next login will retry.
          this.repo.savePinCredentials(sha256, credentials.salt).catch(() => {});
        }
        return true;
      }
    }

    return false;
  }

  /** djb2 hash that matches the legacy PinHasherAdapter fallback exactly. */
  private static _djb2(str: string): string {
    /* eslint-disable no-bitwise */
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h |= 0; // keep as signed 32-bit int between iterations, matching the original
    }
    return (h >>> 0).toString(16).padStart(8, '0');
    /* eslint-enable no-bitwise */
  }
}
