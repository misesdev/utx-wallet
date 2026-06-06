import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useSafeMode } from '../../hooks/useSafeMode';

export function SafeModeScreen() {
  const {
    form,
    isSafeModeEnabled,
    statusLabel,
    activateSafeMode,
    deactivateSafeMode,
  } = useSafeMode();

  return (
    <AppScreen title="Safe mode" subtitle="Use only your personal node">
      <AppCard accent={isSafeModeEnabled}>
        <AppText variant="subtitle">{isSafeModeEnabled ? 'Modo seguro ativo' : 'Modo seguro inativo'}</AppText>
        <AppText color="muted">Status: {statusLabel}</AppText>
        <AppText color="muted">Rede: {form.network}</AppText>
        <AppText color="muted">Node: {form.url || 'não configurado'}</AppText>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">Política de conexão</AppText>
        <AppText color="muted">Quando ativo, sincronização, taxas, transações e broadcast usam somente o node pessoal configurado.</AppText>
      </AppCard>

      {isSafeModeEnabled ? (
        <AppButton title="Desativar modo seguro" variant="secondary" onPress={deactivateSafeMode} />
      ) : (
        <AppButton title="Ativar modo seguro" onPress={activateSafeMode} />
      )}
    </AppScreen>
  );
}
