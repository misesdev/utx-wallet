import { SignMessageUseCase } from '../../../src/core/domain/usecases/wallet/SignMessageUseCase';
import type { MessageSigner } from '../../../src/core/domain/repositories/MessageSigner';
import type { SignedMessage } from '../../../src/core/domain/entities/SignedMessage';

const SIGNED: SignedMessage = {
  version: 1,
  pubkey: 'aabbcc',
  content: 'hello world',
  sig: 'ddeeff',
};

const mockSigner: MessageSigner = {
  sign: jest.fn().mockResolvedValue(SIGNED),
};

const useCase = new SignMessageUseCase(mockSigner);

describe('SignMessageUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSigner.sign as jest.Mock).mockResolvedValue(SIGNED);
  });

  it('delegates to the signer with the provided arguments', async () => {
    const result = await useCase.execute('wallet-1', 'mainnet', 'hello world');
    expect(mockSigner.sign).toHaveBeenCalledWith('wallet-1', 'mainnet', 'hello world');
    expect(result).toEqual(SIGNED);
  });

  it('propagates errors thrown by the signer', async () => {
    (mockSigner.sign as jest.Mock).mockRejectedValue(new Error('WATCH_ONLY_WALLET'));
    await expect(useCase.execute('wallet-2', 'mainnet', 'content')).rejects.toThrow('WATCH_ONLY_WALLET');
  });
});
