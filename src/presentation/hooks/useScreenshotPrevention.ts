import { useEffect, useRef } from 'react';
import { NativeScreenCaptureAdapter } from '../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { useSecurity } from '../../app/providers/SecurityProvider';

const guard = new NativeScreenCaptureAdapter();

/**
 * Enforces the global blockScreenshots setting via the native module.
 * Call once at app root level (inside SecurityProvider).
 */
export function useScreenshotPrevention(): void {
  const { settings, isLoading } = useSecurity();
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (prevRef.current === settings.blockScreenshots) return;
    prevRef.current = settings.blockScreenshots;

    if (settings.blockScreenshots) {
      guard.enable();
    } else {
      guard.disable();
    }

    return () => {
      guard.disable();
    };
  }, [settings.blockScreenshots, isLoading]);
}
