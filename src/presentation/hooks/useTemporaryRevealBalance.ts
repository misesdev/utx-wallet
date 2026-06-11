import { useCallback, useState } from 'react';
import { useSecurity } from '../../app/providers/SecurityProvider';
import { useReauthenticate } from './useReauthenticate';
import type { UseReauthenticateState } from './useReauthenticate';

export type UseTemporaryRevealBalanceState = Pick<
  UseReauthenticateState,
  'pinModalVisible' | 'pinError' | 'submitPin' | 'cancelAuth'
> & {
  /** True when balances should be masked on screen. */
  hidden: boolean;
  /** Whether the global hideBalance setting is active at all. */
  hideBalanceEnabled: boolean;
  /** Toggle visibility: reveals after PIN auth, or re-hides immediately. */
  toggleReveal: () => Promise<void>;
};

/**
 * Per-screen balance visibility with PIN-gated reveal.
 *
 * When the global "Hide Balances" setting is off, hidden is always false and
 * the eye button should not be shown.
 *
 * When enabled: hidden starts true (masked). The user can press the eye button
 * to trigger PIN auth; on success balances are shown until they press again.
 */
export function useTemporaryRevealBalance(): UseTemporaryRevealBalanceState {
  const { settings } = useSecurity();
  const hideBalanceEnabled = settings.hideBalance;
  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();

  const [revealed, setRevealed] = useState(false);

  const hidden = hideBalanceEnabled && !revealed;

  const toggleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    const ok = await requireAuth();
    if (ok) {
      setRevealed(true);
    }
  }, [revealed, requireAuth]);

  return {
    hidden,
    hideBalanceEnabled,
    toggleReveal,
    pinModalVisible,
    pinError,
    submitPin,
    cancelAuth,
  };
}
