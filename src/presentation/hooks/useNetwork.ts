import { useContext } from 'react';
import { NetworkContext } from '../../app/providers/NetworkProvider';

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
