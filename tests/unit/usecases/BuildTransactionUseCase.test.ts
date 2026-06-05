import { BuildTransactionUseCase } from '../../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import type { TransactionRepository } from '../../../src/core/domain/repositories/TransactionRepository';

const transaction = {
  id: 'draft-1',
  amountSats: 1000,
  direction: 'outgoing',
  status: 'pending',
  createdAt: '2026-06-05T00:00:00.000Z',
} as const;

describe('BuildTransactionUseCase', () => {
  it('delegates transaction building to the repository', async () => {
    const repository: TransactionRepository = {
      build: jest.fn(async () => transaction),
      sign: jest.fn(),
      broadcast: jest.fn(),
      list: jest.fn(),
    };
    const useCase = new BuildTransactionUseCase(repository);

    const draft = { toAddress: 'tb1qplaceholder', amountSats: 1000 };
    await expect(useCase.execute(draft)).resolves.toEqual(transaction);
    expect(repository.build).toHaveBeenCalledWith(draft);
  });
});
