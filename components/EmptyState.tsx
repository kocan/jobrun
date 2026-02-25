import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onPressCta }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}>
      <Text style={styles.icon} accessibilityLabel={`${title} icon`}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={styles.ctaButton}
          onPress={onPressCta}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
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
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
