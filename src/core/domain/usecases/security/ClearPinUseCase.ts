import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';

export class ClearPinUseCase {
  constructor(private readonly repo: SecuritySettingsRepository) {}

  execute(): Promise<void> {
    return this.repo.clearPinCredentials();
  }
}
