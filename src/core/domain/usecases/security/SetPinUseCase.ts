import { AppError } from '../../../application/errors/AppError';
import { generateId } from '../../../../shared/utils/generateId';
import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';
import type { PinHasher } from '../../repositories/PinHasher';

export class SetPinUseCase {
  constructor(
    private readonly repo: SecuritySettingsRepository,
    private readonly hasher: PinHasher,
  ) {}

  async execute(pin: string): Promise<void> {
    if (!/^\d{4,8}$/.test(pin)) {
      throw new AppError('PIN deve ter entre 4 e 8 dígitos numéricos', 'INVALID_PIN_FORMAT');
    }
    const salt = generateId();
    const hash = await this.hasher.hash(pin, salt);
    await this.repo.savePinCredentials(hash, salt);
  }
}
