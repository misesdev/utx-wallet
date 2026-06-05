import React from 'react';
import { StyleSheet } from 'react-native';
import type { Address } from '../../../core/domain/entities/Address';
import { AppCard } from '../base/AppCard';
import { AppText } from '../base/AppText';

type AddressCardProps = {
  address: Pick<Address, 'value' | 'type'>;
};

export function AddressCard({ address }: AddressCardProps) {
  return (
    <AppCard>
      <AppText variant="label" color="muted">{address.type}</AppText>
      <AppText style={styles.address}>{address.value}</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  address: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    lineHeight: 22,
  },
});
