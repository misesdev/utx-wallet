import { renderHook, act } from '@testing-library/react-native';
import { useSecuritySettings } from '../../../src/presentation/hooks/useSecuritySettings';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { SecuritySettings } from '../../../src/core/domain/entities/SecuritySettings';

const SETTINGS: SecuritySettings = {
  pinEnabled: false,
  biometricEnabled: false,
  autoLockSeconds: 300,
  hideBalance: false,
  blockScreenshots: true,
};

// Stable context mock — same reference across renders to prevent infinite useEffect loops
const mockSecurity = {
  settings: SETTINGS,
  biometricAvailable: false,
  biometricType: 'none' as const,
  isLoading: false,
  updateSettings: jest.fn<Promise<void>, [Partial<SecuritySettings>]>(),
  setupPin: jest.fn<Promise<void>, [string]>(),
  validatePin: jest.fn<Promise<boolean>, [string]>(),
  removePin: jest.fn<Promise<void>, []>(),
  reauthenticate: jest.fn<Promise<boolean>, [any, string?]>(),
};

jest.mock('../../../src/app/providers/SecurityProvider', () => ({
  useSecurity: () => mockSecurity,
}));

describe('useSecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurity.settings = { ...SETTINGS };
    mockSecurity.biometricAvailable = false;
    mockSecurity.isLoading = false;
    mockSecurity.updateSettings.mockResolvedValue(undefined);
    mockSecurity.setupPin.mockResolvedValue(undefined);
    mockSecurity.validatePin.mockResolvedValue(false);
    mockSecurity.removePin.mockResolvedValue(undefined);
  });

  describe('estado inicial', () => {
    it('expõe as configurações do contexto', () => {
      const { result } = renderHook(() => useSecuritySettings());
      expect(result.current.settings).toEqual(SETTINGS);
    });

    it('modal de PIN começa fechado', () => {
      const { result } = renderHook(() => useSecuritySettings());
      expect(result.current.pinModalVisible).toBe(false);
    });

    it('sem erros iniciais', () => {
      const { result } = renderHook(() => useSecuritySettings());
      expect(result.current.error).toBeNull();
      expect(result.current.pinError).toBeNull();
    });
  });

  describe('ocultar saldo (hideBalance)', () => {
    it('toggleHideBalance chama updateSettings com hideBalance=true', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleHideBalance(); });
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ hideBalance: true });
    });

    it('toggleHideBalance inverte o valor atual', async () => {
      mockSecurity.settings = { ...SETTINGS, hideBalance: true };
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleHideBalance(); });
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ hideBalance: false });
    });

    it('define error quando updateSettings falha', async () => {
      mockSecurity.updateSettings.mockRejectedValue(new AppError('Falha', 'SAVE_ERROR'));
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleHideBalance(); });
      expect(result.current.error).toBe('Falha');
    });
  });

  describe('configurar PIN', () => {
    it('openPinSetup abre modal no passo set-new', () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinSetup(); });
      expect(result.current.pinModalVisible).toBe(true);
      expect(result.current.pinModalStep).toBe('set-new');
    });

    it('primeiro submitPinStep avança para confirm-new', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinSetup(); });
      await act(async () => { await result.current.submitPinStep('1234'); });
      expect(result.current.pinModalStep).toBe('confirm-new');
    });

    it('segundo submitPinStep com PIN igual salva e fecha modal', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinSetup(); });
      await act(async () => { await result.current.submitPinStep('1234'); });
      await act(async () => { await result.current.submitPinStep('1234'); });
      expect(mockSecurity.setupPin).toHaveBeenCalledWith('1234');
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ pinEnabled: true });
      expect(result.current.pinModalVisible).toBe(false);
    });

    it('confirmação com PIN diferente exibe erro e volta para set-new', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinSetup(); });
      await act(async () => { await result.current.submitPinStep('1234'); });
      await act(async () => { await result.current.submitPinStep('9999'); });
      expect(result.current.pinError).toMatch(/coincidem/i);
      expect(result.current.pinModalStep).toBe('set-new');
      expect(mockSecurity.setupPin).not.toHaveBeenCalled();
    });

    it('closePinModal fecha e limpa estado', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinSetup(); });
      act(() => { result.current.closePinModal(); });
      expect(result.current.pinModalVisible).toBe(false);
      expect(result.current.pinError).toBeNull();
    });
  });

  describe('remover PIN', () => {
    it('openPinRemove abre modal no passo verify-to-remove', () => {
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinRemove(); });
      expect(result.current.pinModalStep).toBe('verify-to-remove');
      expect(result.current.pinModalVisible).toBe(true);
    });

    it('PIN correto remove PIN e fecha modal', async () => {
      mockSecurity.validatePin.mockResolvedValue(true);
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinRemove(); });
      await act(async () => { await result.current.submitPinStep('1234'); });
      expect(mockSecurity.removePin).toHaveBeenCalledTimes(1);
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({
        pinEnabled: false,
        biometricEnabled: false,
      });
      expect(result.current.pinModalVisible).toBe(false);
    });

    it('PIN incorreto exibe erro e mantém modal aberto', async () => {
      mockSecurity.validatePin.mockResolvedValue(false);
      const { result } = renderHook(() => useSecuritySettings());
      act(() => { result.current.openPinRemove(); });
      await act(async () => { await result.current.submitPinStep('9999'); });
      expect(result.current.pinError).toMatch(/incorreto/i);
      expect(result.current.pinModalVisible).toBe(true);
      expect(mockSecurity.removePin).not.toHaveBeenCalled();
    });
  });

  describe('biometria', () => {
    it('toggleBiometric não faz nada se biometria indisponível', async () => {
      mockSecurity.biometricAvailable = false;
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleBiometric(); });
      expect(mockSecurity.updateSettings).not.toHaveBeenCalled();
    });

    it('toggleBiometric não faz nada se PIN não está configurado', async () => {
      mockSecurity.biometricAvailable = true;
      mockSecurity.settings = { ...SETTINGS, pinEnabled: false };
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleBiometric(); });
      expect(mockSecurity.updateSettings).not.toHaveBeenCalled();
    });

    it('toggleBiometric ativa biometria quando PIN está configurado e biometria disponível', async () => {
      mockSecurity.biometricAvailable = true;
      mockSecurity.settings = { ...SETTINGS, pinEnabled: true, biometricEnabled: false };
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleBiometric(); });
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ biometricEnabled: true });
    });
  });

  describe('bloqueio automático', () => {
    it('setAutoLock chama updateSettings com o valor selecionado', async () => {
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.setAutoLock(60); });
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ autoLockSeconds: 60 });
    });
  });

  describe('bloquear screenshots', () => {
    it('toggleBlockScreenshots inverte o valor', async () => {
      mockSecurity.settings = { ...SETTINGS, blockScreenshots: true };
      const { result } = renderHook(() => useSecuritySettings());
      await act(async () => { await result.current.toggleBlockScreenshots(); });
      expect(mockSecurity.updateSettings).toHaveBeenCalledWith({ blockScreenshots: false });
    });
  });
});
