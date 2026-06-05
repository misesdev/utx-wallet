import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/icon.png')} style={styles.icon} resizeMode="contain" />
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 96,
    height: 96,
  },
  spinner: {
    marginTop: 32,
  },
});
