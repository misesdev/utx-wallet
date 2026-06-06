export type AutoLockSeconds = 0 | 60 | 300 | 600 | 1800;

export type SecuritySettings = {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoLockSeconds: AutoLockSeconds;
  hideBalance: boolean;
  blockScreenshots: boolean;
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  pinEnabled: false,
  biometricEnabled: false,
  autoLockSeconds: 300,
  hideBalance: false,
  blockScreenshots: true,
};

export const AUTO_LOCK_OPTIONS: { label: string; value: AutoLockSeconds }[] = [
  { label: 'Nunca', value: 0 },
  { label: '1 minuto', value: 60 },
  { label: '5 minutos', value: 300 },
  { label: '10 minutos', value: 600 },
  { label: '30 minutos', value: 1800 },
];
