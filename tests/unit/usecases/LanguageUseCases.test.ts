import { findBestLanguageTag } from 'react-native-localize';
import { DetectDeviceLanguageUseCase } from '../../../src/core/domain/usecases/language/DetectDeviceLanguageUseCase';
import { GetCurrentLanguageUseCase } from '../../../src/core/domain/usecases/language/GetCurrentLanguageUseCase';
import { SetLanguageUseCase } from '../../../src/core/domain/usecases/language/SetLanguageUseCase';
import { LanguageService } from '../../../src/core/application/services/LanguageService';
import { i18next, type SupportedLanguage } from '../../../src/shared/i18n';

type StorageMock = {
  value: string | null;
  getLanguage: jest.Mock<Promise<string | null>, []>;
  setLanguage: jest.Mock<Promise<void>, [string]>;
};

function createStorage(value: string | null = null): StorageMock {
  const storage: StorageMock = {
    value,
    getLanguage: jest.fn(async () => storage.value),
    setLanguage: jest.fn(async language => {
      storage.value = language;
    }),
  };
  return storage;
}

describe('language use cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads pt-BR as fallback when no saved language and no supported device language exists', async () => {
    const storage = createStorage(null);
    const service = new LanguageService(storage as any);
    const detectDeviceLanguage = { execute: jest.fn((): SupportedLanguage => 'pt-BR') };
    const useCase = new GetCurrentLanguageUseCase(service, detectDeviceLanguage as any);

    await expect(useCase.execute()).resolves.toBe('pt-BR');
    expect(detectDeviceLanguage.execute).toHaveBeenCalledTimes(1);
  });

  it('detects the best supported device language', () => {
    (findBestLanguageTag as jest.Mock).mockReturnValueOnce({ languageTag: 'en-US', isRTL: false });

    expect(new DetectDeviceLanguageUseCase().execute()).toBe('en-US');
    expect(findBestLanguageTag).toHaveBeenCalledWith(['pt-BR', 'en-US']);
  });

  it('persists a manually selected language and updates i18next', async () => {
    const storage = createStorage(null);
    const service = new LanguageService(storage as any);
    const useCase = new SetLanguageUseCase(service);

    await useCase.execute('en-US');

    expect(storage.setLanguage).toHaveBeenCalledWith('en-US');
    expect(i18next.changeLanguage).toHaveBeenCalledWith('en-US');
    await expect(service.getCurrent()).resolves.toBe('en-US');
  });

  it('uses saved language before device detection', async () => {
    const storage = createStorage('en-US');
    const service = new LanguageService(storage as any);
    const detectDeviceLanguage = { execute: jest.fn((): SupportedLanguage => 'pt-BR') };
    const useCase = new GetCurrentLanguageUseCase(service, detectDeviceLanguage as any);

    await expect(useCase.execute()).resolves.toBe('en-US');
    expect(detectDeviceLanguage.execute).not.toHaveBeenCalled();
  });
});
