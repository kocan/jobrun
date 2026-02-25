import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme';

interface ErrorStateProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, retryLabel = 'Try Again', onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityLabel={`Error. ${message}`}>
      <Text style={styles.icon} accessibilityLabel="Error icon">⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={styles.retryButton}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  icon: {
    fontSize: 44,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
