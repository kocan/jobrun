import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onPressCta }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}>
      <Text style={styles.icon} accessibilityLabel={`${title} icon`}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={onPressCta}
        >
          <Text style={[styles.ctaText, { color: colors.white }]}>{ctaLabel}</Text>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
