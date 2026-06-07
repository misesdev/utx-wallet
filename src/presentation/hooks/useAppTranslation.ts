import { useTranslation } from 'react-i18next';

/**
 * App-wide translation hook. All screens and components use this instead of
 * importing useTranslation from react-i18next directly.
 */
export function useAppTranslation() {
  return useTranslation();
}
