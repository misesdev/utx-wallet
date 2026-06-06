import { NodeConnectionTestUseCase } from '../../../src/core/domain/usecases/network/NodeConnectionTestUseCase';
import type { NodeConnectionTester } from '../../../src/core/domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
  personalNodeUrl: 'http://127.0.0.1',
  personalNodePort: 3000,
};

describe('NodeConnectionTestUseCase', () => {
  it('returns connected for a valid personal node connection', async () => {
    const tester: jest.Mocked<NodeConnectionTester> = {
      testConnection: jest.fn().mockResolvedValue({ status: 'connected', expectedNetwork: 'testnet4', actualNetwork: 'testnet4' }),
    };
    const useCase = new NodeConnectionTestUseCase(tester);

    await expect(useCase.execute(CONFIG)).resolves.toEqual({
      status: 'connected',
      expectedNetwork: 'testnet4',
      actualNetwork: 'testnet4',
    });
    expect(tester.testConnection).toHaveBeenCalledWith(CONFIG);
  });

  it('returns disconnected for an invalid personal node connection', async () => {
    const tester: jest.Mocked<NodeConnectionTester> = {
      testConnection: jest.fn().mockResolvedValue({ status: 'disconnected', expectedNetwork: 'testnet4' }),
    };
    const useCase = new NodeConnectionTestUseCase(tester);

    await expect(useCase.execute(CONFIG)).resolves.toEqual({
      status: 'disconnected',
      expectedNetwork: 'testnet4',
    });
  });
});
