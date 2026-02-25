import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme';

interface LoadingStateProps {
  message?: string;
  accessibilityLabel?: string;
}

export function LoadingState({
  message = 'Loading...',
  accessibilityLabel = 'Loading content',
}: LoadingStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
