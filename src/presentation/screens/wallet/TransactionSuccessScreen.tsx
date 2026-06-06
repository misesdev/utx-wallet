import React from 'react';
import { StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type SuccessRouteProp = RouteProp<AppStackParamList, 'TransactionSuccess'>;
type SuccessNavProp = NativeStackNavigationProp<AppStackParamList, 'TransactionSuccess'>;

function formatSats(sats: number): string {
  return sats.toLocaleString('pt-BR');
}

export function TransactionSuccessScreen() {
  const route = useRoute<SuccessRouteProp>();
  const navigation = useNavigation<SuccessNavProp>();
  const { txid, amountSats, feeSats } = route.params;

  function copyTxid() {
    Clipboard.setString(txid);
  }

  function goHome() {
    navigation.reset({ index: 0, routes: [{ name: AppRoutes.Home }] });
  }

  return (
    <AppScreen title="Transação enviada">
      <View style={styles.iconRow}>
        <AppText variant="display" color="success" testID="success-icon">
          ✓
        </AppText>
      </View>

      <AppText variant="title" style={styles.heading} testID="success-heading">
        Envio realizado!
      </AppText>
      <AppText variant="body" color="muted" style={styles.subtitle}>
        Sua transação foi transmitida para a rede Bitcoin.
      </AppText>

      <AppCard>
        <View style={styles.row}>
          <AppText color="muted">Valor enviado</AppText>
          <AppText variant="subtitle" testID="success-amount">
            {`${formatSats(amountSats)} sats`}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText color="muted">Taxa paga</AppText>
          <AppText testID="success-fee">{`${formatSats(feeSats)} sats`}</AppText>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="label" color="muted">
          ID da transação (txid)
        </AppText>
        <AppText style={styles.txid} testID="success-txid">
          {txid}
        </AppText>
        <AppButton
          title="Copiar txid"
          variant="secondary"
          size="sm"
          onPress={copyTxid}
          testID="btn-copy-txid"
        />
      </AppCard>

      <AppButton
        title="Ir para início"
        onPress={goHome}
        testID="btn-go-home"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  iconRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  heading: {
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txid: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
    lineHeight: 20,
    marginBottom: 12,
  },
});
