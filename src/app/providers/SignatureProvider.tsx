import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { SignedMessage } from '../../core/domain/entities/SignedMessage';
import type { SignMessageUseCase } from '../../core/domain/usecases/wallet/SignMessageUseCase';
import type { VerifyMessageUseCase } from '../../core/domain/usecases/wallet/VerifyMessageUseCase';
import type { MessageSigningService } from '../../core/domain/services/MessageSigningService';

type SignatureContextValue = {
  signMessage: (walletId: string, network: BitcoinNetwork, content: string) => Promise<SignedMessage>;
  verifyMessage: (content: string, pubkeyHex: string, sigHex: string) => boolean;
  encodeSignedMessage: (signed: SignedMessage) => string;
  decodeSignedMessage: (encoded: string) => SignedMessage | null;
};

export const SignatureContext = createContext<SignatureContextValue | null>(null);

type Props = PropsWithChildren<{
  signMessageUseCase: SignMessageUseCase;
  verifyMessageUseCase: VerifyMessageUseCase;
  signingService: MessageSigningService;
}>;

export function SignatureProvider({ children, signMessageUseCase, verifyMessageUseCase, signingService }: Props) {
  const value: SignatureContextValue = {
    signMessage: (walletId, network, content) =>
      signMessageUseCase.execute(walletId, network, content),
    verifyMessage: (content, pubkeyHex, sigHex) =>
      verifyMessageUseCase.execute(content, pubkeyHex, sigHex),
    encodeSignedMessage: (signed) => signingService.encode(signed),
    decodeSignedMessage: (encoded) => signingService.decode(encoded),
  };

  return <SignatureContext.Provider value={value}>{children}</SignatureContext.Provider>;
}

export function useSignature(): SignatureContextValue {
  const ctx = useContext(SignatureContext);
  if (!ctx) throw new Error('useSignature must be used within SignatureProvider');
  return ctx;
}
