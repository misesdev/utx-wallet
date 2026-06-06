import React, { useState } from 'react';
import { AppButton } from '../../components/base/AppButton';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { AuthRoutes } from '../../../app/navigation/routes';

export function CreateWalletScreen() {
  const navigation = useAppNavigation();
  const { initiate, isLoading } = useCreateWallet();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Wallet name is required');
      return;
    }
    if (trimmed.length > 48) {
      setNameError('Name must be 48 characters or fewer');
      return;
    }
    setNameError('');
    initiate(trimmed);
    navigation.navigate(AuthRoutes.BackupSeed);
  }

  return (
    <AppScreen title="New wallet" subtitle="Name your wallet to get started">
      <AppText variant="body" color="muted">
        Your wallet name is stored locally and never shared.
      </AppText>

      <FormInput
        label="Wallet name"
        placeholder="e.g. Main wallet"
        value={name}
        onChangeText={text => {
          setName(text);
          if (nameError) setNameError('');
        }}
        error={nameError}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreate}
        maxLength={48}
      />

      <AppButton
        title="Generate seed phrase"
        onPress={handleCreate}
        disabled={isLoading}
      />
    </AppScreen>
  );
}
