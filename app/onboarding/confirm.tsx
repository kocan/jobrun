import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../contexts/SettingsContext';
import { usePriceBook } from '../../contexts/PriceBookContext';
import { verticals } from '../../constants/verticals';

export default function ConfirmScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useSettings();
  const { initializeFromDefaults } = usePriceBook();

  const vertical = verticals.find((v) => v.id === settings.selectedVertical);
  const verticalName = vertical?.name ?? 'Custom';
  const verticalIcon = vertical?.icon ?? '⚙️';

  const handleComplete = async () => {
    // Initialize price book from vertical defaults
    if (vertical) {
      await initializeFromDefaults(vertical.defaultServices);
    }

    await completeOnboarding({
      businessName: settings.businessName,
      businessPhone: settings.businessPhone,
      businessEmail: settings.businessEmail,
      selectedVertical: settings.selectedVertical!,
    });

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.check}>✅</Text>
        <Text style={styles.title}>You're All Set!</Text>
        <Text style={styles.subtitle}>Here's a summary of your setup:</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Business</Text>
            <Text style={styles.summaryValue}>{settings.businessName}</Text>
          </View>
          {settings.businessPhone ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone</Text>
              <Text style={styles.summaryValue}>{settings.businessPhone}</Text>
            </View>
          ) : null}
          {settings.businessEmail ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Email</Text>
              <Text style={styles.summaryValue}>{settings.businessEmail}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Industry</Text>
            <Text style={styles.summaryValue}>{verticalIcon} {verticalName}</Text>
          </View>
        </View>

        {vertical && (
          <Text style={styles.hint}>
            {vertical.defaultServices.length} services have been added to your price book. You can customize them anytime.
          </Text>
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tap to activate action" style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>Start Using JobRun</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  check: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  summaryCard: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryLabel: { fontSize: 15, color: '#666' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  hint: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 20, lineHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#EA580C', width: 24 },
  button: {
    backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
