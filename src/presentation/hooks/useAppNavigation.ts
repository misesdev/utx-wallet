import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList, AuthStackParamList } from '../../app/navigation/routes';

export type AppNavigation = NativeStackNavigationProp<AppStackParamList & AuthStackParamList>;

export function useAppNavigation() {
  return useNavigation<AppNavigation>();
}
