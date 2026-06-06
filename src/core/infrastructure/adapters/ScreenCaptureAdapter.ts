/**
 * Guards the current screen against OS-level screenshot capture.
 *
 * Native implementation (Android): set WindowManager.LayoutParams.FLAG_SECURE
 * via a ReactContextBaseJavaModule. iOS: UITextField with isSecureTextEntry
 * or a custom native view can achieve similar protection.
 *
 * Until native modules are wired up, NoopScreenCaptureAdapter is used as a
 * safe placeholder that compiles in both platforms.
 */
export interface ScreenCaptureGuard {
  enable(): void;
  disable(): void;
}

export class NoopScreenCaptureAdapter implements ScreenCaptureGuard {
  enable(): void {}
  disable(): void {}
}
