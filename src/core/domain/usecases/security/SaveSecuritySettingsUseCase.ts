import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';
import type { SecuritySettings } from '../../entities/SecuritySettings';

export class SaveSecuritySettingsUseCase {
  constructor(private readonly repo: SecuritySettingsRepository) {}

  execute(settings: SecuritySettings): Promise<void> {
    return this.repo.save(settings);
  }
}
