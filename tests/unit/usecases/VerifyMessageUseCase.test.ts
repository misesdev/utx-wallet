import { VerifyMessageUseCase } from '../../../src/core/domain/usecases/wallet/VerifyMessageUseCase';
import { MessageSigningService } from '../../../src/core/domain/services/MessageSigningService';

const mockSigningService: Pick<MessageSigningService, 'verify'> = {
  verify: jest.fn(),
};

const useCase = new VerifyMessageUseCase(mockSigningService as MessageSigningService);

describe('VerifyMessageUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when signing service returns true', () => {
    (mockSigningService.verify as jest.Mock).mockReturnValue(true);
    const result = useCase.execute('hello', 'pubkeyHex', 'sigHex');
    expect(result).toBe(true);
    expect(mockSigningService.verify).toHaveBeenCalledWith('hello', 'pubkeyHex', 'sigHex');
  });

  it('returns false when signing service returns false', () => {
    (mockSigningService.verify as jest.Mock).mockReturnValue(false);
    const result = useCase.execute('hello', 'pubkeyHex', 'badSig');
    expect(result).toBe(false);
  });
});
