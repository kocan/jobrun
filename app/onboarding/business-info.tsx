import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

export default function BusinessInfoScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [name, setName] = useState(settings.businessName);
  const [phone, setPhone] = useState(settings.businessPhone);
  const [email, setEmail] = useState(settings.businessEmail);

  const canContinue = name.trim().length > 0;

  const handleNext = async () => {
    await updateSettings({
      businessName: name.trim(),
      businessPhone: phone.trim(),
      businessEmail: email.trim(),
    });
    router.push('/onboarding/pick-vertical');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>Your Business</Text>
          <Text style={styles.subtitle}>Tell us about your business so we can personalize your experience.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput accessibilityRole="text" accessibilityLabel="Business name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sparkle Pressure Washing"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput accessibilityRole="text" accessibilityLabel="Phone number"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput accessibilityRole="text" accessibilityLabel="Email address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Continue to next step"
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  step: { fontSize: 14, color: '#EA580C', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, lineHeight: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, color: '#111', backgroundColor: '#F9FAFB',
  },
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
