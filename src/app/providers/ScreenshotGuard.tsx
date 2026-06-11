import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useScreenshotPrevention } from '../../presentation/hooks/useScreenshotPrevention';
import { useSecurity } from './SecurityProvider';

/**
 * Wires screenshot prevention globally and adds a JS-level privacy overlay
 * shown whenever the app is inactive or backgrounded.
 *
 * The overlay serves two purposes:
 *  1. Prevents seed / balance data from appearing in the iOS task switcher.
 *  2. Complements Android FLAG_SECURE (which handles it natively) on older
 *     OS versions where the flag may not cover the app switcher thumbnail.
 *
 * Rendered at root level inside SecurityProvider but outside the navigator.
 */
export function ScreenshotGuard({ children }: React.PropsWithChildren) {
  useScreenshotPrevention();

  const { settings } = useSecurity();
  const [isInBackground, setIsInBackground] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setIsInBackground(state === 'inactive' || state === 'background');
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      {children}
      {isInBackground && settings.blockScreenshots && (
        <View
          style={[StyleSheet.absoluteFill, styles.overlay]}
          testID="privacy-overlay"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#000',
    zIndex: 99999,
    elevation: 99999,
  },
});
