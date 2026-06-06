import type { SecuritySettingsRepository } from '../../repositories/SecuritySettingsRepository';
import { DEFAULT_SECURITY_SETTINGS, type SecuritySettings } from '../../entities/SecuritySettings';

export class LoadSecuritySettingsUseCase {
  constructor(private readonly repo: SecuritySettingsRepository) {}

  async execute(): Promise<SecuritySettings> {
    return (await this.repo.load()) ?? DEFAULT_SECURITY_SETTINGS;
  }
}
