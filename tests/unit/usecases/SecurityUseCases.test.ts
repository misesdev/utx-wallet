import { LoadSecuritySettingsUseCase } from '../../../src/core/domain/usecases/security/LoadSecuritySettingsUseCase';
import { SaveSecuritySettingsUseCase } from '../../../src/core/domain/usecases/security/SaveSecuritySettingsUseCase';
import { SetPinUseCase } from '../../../src/core/domain/usecases/security/SetPinUseCase';
import { VerifyPinUseCase } from '../../../src/core/domain/usecases/security/VerifyPinUseCase';
import { ClearPinUseCase } from '../../../src/core/domain/usecases/security/ClearPinUseCase';
import { CheckBiometricAvailabilityUseCase } from '../../../src/core/domain/usecases/security/CheckBiometricAvailabilityUseCase';
import { AuthenticateWithBiometricUseCase } from '../../../src/core/domain/usecases/security/AuthenticateWithBiometricUseCase';
import { ReauthenticateUseCase } from '../../../src/core/domain/usecases/security/ReauthenticateUseCase';
import type { SecuritySettingsRepository } from '../../../src/core/domain/repositories/SecuritySettingsRepository';
import type { BiometricAuthProvider } from '../../../src/core/domain/repositories/BiometricAuthProvider';
import type { PinHasher } from '../../../src/core/domain/repositories/PinHasher';
import type { SecuritySettings } from '../../../src/core/domain/entities/SecuritySettings';
import { DEFAULT_SECURITY_SETTINGS } from '../../../src/core/domain/entities/SecuritySettings';

const SETTINGS: SecuritySettings = {
  pinEnabled: true,
  biometricEnabled: false,
  autoLockSeconds: 300,
  hideBalance: false,
  blockScreenshots: true,
};

function makeRepo(stored: SecuritySettings | null = null): jest.Mocked<SecuritySettingsRepository> {
  return {
    load: jest.fn().mockResolvedValue(stored),
    save: jest.fn().mockResolvedValue(undefined),
    savePinCredentials: jest.fn().mockResolvedValue(undefined),
    loadPinCredentials: jest.fn().mockResolvedValue(null),
    clearPinCredentials: jest.fn().mockResolvedValue(undefined),
  };
}

function makeHasher(fixedHash = 'abc123'): jest.Mocked<PinHasher> {
  return { hash: jest.fn().mockResolvedValue(fixedHash) };
}

function makeBiometricProvider(available = true, authResult = true): jest.Mocked<BiometricAuthProvider> {
  return {
    checkAvailability: jest.fn().mockResolvedValue({ available, type: available ? 'fingerprint' : 'none' }),
    authenticate: jest.fn().mockResolvedValue(authResult),
  };
}

describe('LoadSecuritySettingsUseCase', () => {
  it('retorna configurações salvas quando existem', async () => {
    const uc = new LoadSecuritySettingsUseCase(makeRepo(SETTINGS));
    const result = await uc.execute();
    expect(result).toEqual(SETTINGS);
  });

  it('retorna configurações padrão quando nenhuma está salva', async () => {
    const uc = new LoadSecuritySettingsUseCase(makeRepo(null));
    const result = await uc.execute();
    expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
  });
});

describe('SaveSecuritySettingsUseCase', () => {
  it('delega ao repositório com as configurações fornecidas', async () => {
    const repo = makeRepo();
    await new SaveSecuritySettingsUseCase(repo).execute(SETTINGS);
    expect(repo.save).toHaveBeenCalledWith(SETTINGS);
  });
});

describe('SetPinUseCase', () => {
  it('PIN correto — salva hash e salt no repositório', async () => {
    const repo = makeRepo();
    const hasher = makeHasher('deadbeef');
    await new SetPinUseCase(repo, hasher).execute('1234');
    expect(hasher.hash).toHaveBeenCalledWith('1234', expect.any(String));
    expect(repo.savePinCredentials).toHaveBeenCalledWith('deadbeef', expect.any(String));
  });

  it('usa um salt único gerado automaticamente', async () => {
    const repo = makeRepo();
    const hasher = makeHasher();
    await new SetPinUseCase(repo, hasher).execute('4321');
    const [, salt] = hasher.hash.mock.calls[0];
    expect(typeof salt).toBe('string');
    expect(salt.length).toBeGreaterThan(0);
  });

  it('rejeita PIN com menos de 4 dígitos com INVALID_PIN_FORMAT', async () => {
    const uc = new SetPinUseCase(makeRepo(), makeHasher());
    await expect(uc.execute('123')).rejects.toMatchObject({ code: 'INVALID_PIN_FORMAT' });
  });

  it('rejeita PIN com mais de 8 dígitos com INVALID_PIN_FORMAT', async () => {
    const uc = new SetPinUseCase(makeRepo(), makeHasher());
    await expect(uc.execute('123456789')).rejects.toMatchObject({ code: 'INVALID_PIN_FORMAT' });
  });

  it('rejeita PIN com caracteres não numéricos com INVALID_PIN_FORMAT', async () => {
    const uc = new SetPinUseCase(makeRepo(), makeHasher());
    await expect(uc.execute('12ab')).rejects.toMatchObject({ code: 'INVALID_PIN_FORMAT' });
  });

  it('aceita PINs de 4 a 8 dígitos', async () => {
    const uc = new SetPinUseCase(makeRepo(), makeHasher());
    await expect(uc.execute('1234')).resolves.toBeUndefined();
    await expect(uc.execute('12345678')).resolves.toBeUndefined();
  });

  it('não chama o repositório quando o PIN é inválido', async () => {
    const repo = makeRepo();
    await expect(new SetPinUseCase(repo, makeHasher()).execute('abc')).rejects.toBeDefined();
    expect(repo.savePinCredentials).not.toHaveBeenCalled();
  });
});

describe('VerifyPinUseCase', () => {
  it('PIN correto — retorna true', async () => {
    const repo = makeRepo();
    repo.loadPinCredentials.mockResolvedValue({ hash: 'correcthash', salt: 'somesalt' });
    const hasher = makeHasher('correcthash');
    const ok = await new VerifyPinUseCase(repo, hasher).execute('1234');
    expect(ok).toBe(true);
  });

  it('PIN incorreto — retorna false', async () => {
    const repo = makeRepo();
    repo.loadPinCredentials.mockResolvedValue({ hash: 'correcthash', salt: 'somesalt' });
    const hasher = makeHasher('wronghash');
    const ok = await new VerifyPinUseCase(repo, hasher).execute('9999');
    expect(ok).toBe(false);
  });

  it('retorna false quando nenhum PIN está configurado', async () => {
    const repo = makeRepo();
    repo.loadPinCredentials.mockResolvedValue(null);
    const ok = await new VerifyPinUseCase(repo, makeHasher()).execute('1234');
    expect(ok).toBe(false);
  });

  it('passa o salt armazenado ao hasher', async () => {
    const repo = makeRepo();
    repo.loadPinCredentials.mockResolvedValue({ hash: 'h', salt: 'stored-salt' });
    const hasher = makeHasher('h');
    await new VerifyPinUseCase(repo, hasher).execute('1234');
    expect(hasher.hash).toHaveBeenCalledWith('1234', 'stored-salt');
  });
});

describe('ClearPinUseCase', () => {
  it('delega ao repositório para limpar credenciais', async () => {
    const repo = makeRepo();
    await new ClearPinUseCase(repo).execute();
    expect(repo.clearPinCredentials).toHaveBeenCalledTimes(1);
  });
});

describe('CheckBiometricAvailabilityUseCase', () => {
  it('biometria disponível — retorna available=true com tipo', async () => {
    const provider = makeBiometricProvider(true);
    const result = await new CheckBiometricAvailabilityUseCase(provider).execute();
    expect(result.available).toBe(true);
    expect(result.type).toBe('fingerprint');
  });

  it('biometria indisponível — retorna available=false com tipo none', async () => {
    const provider = makeBiometricProvider(false);
    const result = await new CheckBiometricAvailabilityUseCase(provider).execute();
    expect(result.available).toBe(false);
    expect(result.type).toBe('none');
  });
});

describe('ReauthenticateUseCase', () => {
  function makeReauth(pinOk: boolean, bioOk = true) {
    const repo = makeRepo();
    repo.loadPinCredentials.mockResolvedValue({ hash: pinOk ? 'match' : 'stored', salt: 's' });
    const hasher = makeHasher(pinOk ? 'match' : 'mismatch');
    const verifyPin = new VerifyPinUseCase(repo, hasher);
    const bio = new AuthenticateWithBiometricUseCase(makeBiometricProvider(true, bioOk));
    return new ReauthenticateUseCase(verifyPin, bio);
  }

  it('reautenticação obrigatória — PIN correto retorna true', async () => {
    const ok = await makeReauth(true).execute('pin', '1234');
    expect(ok).toBe(true);
  });

  it('reautenticação obrigatória — PIN incorreto lança INVALID_PIN', async () => {
    await expect(makeReauth(false).execute('pin', '9999')).rejects.toMatchObject({ code: 'INVALID_PIN' });
  });

  it('reautenticação obrigatória — PIN ausente lança PIN_REQUIRED', async () => {
    await expect(makeReauth(true).execute('pin')).rejects.toMatchObject({ code: 'PIN_REQUIRED' });
  });

  it('biometria disponível — autenticação biométrica bem-sucedida retorna true', async () => {
    const ok = await makeReauth(true, true).execute('biometric');
    expect(ok).toBe(true);
  });

  it('biometria indisponível — autenticação biométrica retorna false', async () => {
    const ok = await makeReauth(true, false).execute('biometric');
    expect(ok).toBe(false);
  });
});
