import { NativeModules, Platform } from 'react-native';

export interface ScreenCaptureGuard {
  enable(): void;
  disable(): void;
}

export class NoopScreenCaptureAdapter implements ScreenCaptureGuard {
  enable(): void {}
  disable(): void {}
}

/**
 * Android: sets/clears WindowManager.LayoutParams.FLAG_SECURE via the
 * ScreenSecurityModule native bridge. Prevents OS-level screenshots,
 * screen recording, and hides app content in the recent-apps switcher.
 *
 * iOS: FLAG_SECURE has no direct equivalent. The PrivacyOverlay component
 * (AppState-based) handles hiding content in the task switcher on iOS.
 */
export class NativeScreenCaptureAdapter implements ScreenCaptureGuard {
  enable(): void {
    if (Platform.OS === 'android') {
      NativeModules.ScreenSecurity?.enable();
    }
  }

  disable(): void {
    if (Platform.OS === 'android') {
      NativeModules.ScreenSecurity?.disable();
    }
  }
}
