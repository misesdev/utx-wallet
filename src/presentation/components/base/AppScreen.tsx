import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from './AppHeader';

type AppScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scrollable?: boolean;
  testID?: string;
  rightAction?: React.ReactNode;
}>;

export function AppScreen({ title, subtitle, scrollable = true, testID, rightAction, children }: AppScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.content, !scrollable && styles.contentFlex]}>
      {children}
    </View>
  );

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <AppHeader title={title} subtitle={subtitle} rightAction={rightAction} />
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentFlex: {
    flex: 1,
  },
});
