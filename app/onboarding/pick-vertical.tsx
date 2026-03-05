import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { verticals } from '../../constants/verticals';
import { useSettings } from '../../contexts/SettingsContext';
import { VerticalId } from '../../lib/types';
import { useTheme } from '../../contexts/ThemeContext';

type SelectableVertical = VerticalId | 'custom';

const customOption = { id: 'custom' as const, name: 'Other / Custom', icon: '⚙️', description: 'Start with an empty price book and build your own' };

export default function PickVerticalScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<SelectableVertical | null>(
    settings.selectedVertical as SelectableVertical | null
  );

  const dynamicStyles = useMemo(() => ({
    container: { flex: 1, backgroundColor: colors.surface },
    card: {
      flexDirection: 'row' as const, alignItems: 'center' as const, padding: 16,
      backgroundColor: colors.gray50, borderRadius: 12,
      borderWidth: 2, borderColor: colors.gray200,
    },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.orange50 },
  }), [colors]);

  const handleNext = async () => {
    if (!selected) return;
    await updateSettings({ selectedVertical: selected });
    router.push('/onboarding/confirm');
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Pick Your Industry</Text>
        <Text style={styles.subtitle}>We'll set up your price book with common services for your industry.</Text>

        <View style={styles.grid}>
          {verticals.map((v) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Select ${v.name}`}
              key={v.id}
              style={[dynamicStyles.card, selected === v.id && dynamicStyles.cardSelected]}
              onPress={() => setSelected(v.id)}
            >
              <Text style={styles.cardIcon}>{v.icon}</Text>
              <Text style={[styles.cardName, selected === v.id && styles.cardNameSelected]}>{v.name}</Text>
              <Text style={styles.cardDesc}>{v.defaultServices.length} services included</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Select Other or Custom"
            style={[dynamicStyles.card, selected === 'custom' && dynamicStyles.cardSelected]}
            onPress={() => setSelected('custom')}
          >
            <Text style={styles.cardIcon}>{customOption.icon}</Text>
            <Text style={[styles.cardName, selected === 'custom' && styles.cardNameSelected]}>{customOption.name}</Text>
            <Text style={styles.cardDesc}>{customOption.description}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue to next step"
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  step: { fontSize: 14, color: '#EA580C', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24, lineHeight: 22 },
  grid: { gap: 12 },
  cardIcon: { fontSize: 32, marginRight: 14 },
  cardName: { fontSize: 17, fontWeight: '600', color: '#111', flex: 1 },
  cardNameSelected: { color: '#EA580C' },
  cardDesc: { fontSize: 13, color: '#6B7280', position: 'absolute', bottom: 8, left: 62 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#EA580C', width: 24 },
  button: {
    backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
