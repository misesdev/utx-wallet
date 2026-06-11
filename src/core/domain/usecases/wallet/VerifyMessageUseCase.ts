import type { MessageSigningService } from '../../services/MessageSigningService';

export class VerifyMessageUseCase {
  constructor(private readonly signingService: MessageSigningService) {}

  execute(content: string, pubkeyHex: string, sigHex: string): boolean {
    return this.signingService.verify(content, pubkeyHex, sigHex);
  }
}
