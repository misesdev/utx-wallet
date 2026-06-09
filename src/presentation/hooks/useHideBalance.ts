import { useSecurity } from '../../app/providers/SecurityProvider';

export function useHideBalance(): boolean {
  return useSecurity().settings.hideBalance;
}
