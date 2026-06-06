import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';
import type { PinHasher } from '../../repositories/PinHasher';

export class VerifyPinUseCase {
  constructor(
    private readonly repo: SecuritySettingsRepository,
    private readonly hasher: PinHasher,
  ) {}

  async execute(pin: string): Promise<boolean> {
    const credentials = await this.repo.loadPinCredentials();
    if (!credentials) return false;
    const hash = await this.hasher.hash(pin, credentials.salt);
    return hash === credentials.hash;
  }
}
