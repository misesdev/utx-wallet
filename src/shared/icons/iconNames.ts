/**
 * Semantic icon name registry.
 *
 * Usage:
 *   import { AppIcon } from '@/presentation/components/base/AppIcon';
 *   <AppIcon name="home" size={24} color={theme.colors.text} />
 *
 * To add an icon: pick the Ionicons name at https://ionic.io/ionicons
 * and add a semantic entry here. Never import Ionicons directly in screens.
 */

export type IconName = keyof typeof ICON_NAMES;

export const ICON_NAMES = {
  // Navigation
  home: 'home-outline',
  back: 'arrow-back-outline',
  chevronRight: 'chevron-forward-outline',
  chevronUp: 'chevron-up-outline',
  chevronDown: 'chevron-down-outline',
  close: 'close-outline',
  add: 'add-outline',
  create: 'add-circle-outline',
  import: 'download-outline',

  // Wallet actions
  send: 'paper-plane-outline',
  receive: 'arrow-down-circle-outline',
  wallet: 'wallet-outline',
  accounts: 'albums-outline',
  addresses: 'at-outline',
  transactions: 'receipt-outline',
  sync: 'sync-outline',
  scan: 'scan-outline',

  // Funds
  freeze: 'snow-outline',
  unfreeze: 'sunny-outline',

  // Settings & security
  settings: 'settings-outline',
  language: 'language-outline',
  security: 'shield-checkmark-outline',
  backup: 'cloud-upload-outline',
  network: 'globe-outline',
  node: 'server-outline',
  offline: 'cloud-offline-outline',
  safeMode: 'lock-closed-outline',
  syncSettings: 'speedometer-outline',
  key: 'key-outline',
  fingerprint: 'finger-print-outline',
  faceId: 'scan-circle-outline',

  export: 'arrow-up-circle-outline',
  sign: 'pencil-outline',

  // Editing
  edit: 'pencil-outline',
  trash: 'trash-outline',
  copy: 'copy-outline',
  share: 'share-social-outline',
  qrCode: 'qr-code-outline',
  externalLink: 'open-outline',
  donate: 'heart-outline',

  // Status / feedback
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  error: 'close-circle-outline',
  info: 'information-circle-outline',
  empty: 'ellipse-outline',
  check: 'checkmark-outline',

  // Visibility
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',

  // Sorting / filtering
  filter: 'filter-outline',
} as const;
