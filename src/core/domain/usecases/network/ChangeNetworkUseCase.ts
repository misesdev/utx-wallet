import { AppError } from '../../../application/errors/AppError';
import type { BitcoinNetwork, NetworkConfig } from '../../entities/Network';
import type { NodeRepository } from '../../repositories/NodeRepository';

export class ChangeNetworkUseCase {
  constructor(private readonly nodeRepository: NodeRepository) {}

  async execute(targetNetwork: BitcoinNetwork, walletNetwork?: BitcoinNetwork): Promise<NetworkConfig> {
    if (walletNetwork && walletNetwork !== targetNetwork) {
      throw new AppError('A rede selecionada é incompatível com a carteira atual', 'NETWORK_INCOMPATIBLE');
    }

    const currentConfig = await this.nodeRepository.getNetworkConfig();
    const nextConfig: NetworkConfig = {
      ...currentConfig,
      network: targetNetwork,
    };

    await this.nodeRepository.setNetworkConfig(nextConfig);
    return nextConfig;
  }
}
