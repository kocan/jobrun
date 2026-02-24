import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🚀</Text>
        <Text style={styles.title}>Welcome to JobRun</Text>
        <Text style={styles.subtitle}>
          The simplest way to manage your service business — schedule jobs, send estimates, and get paid.
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tap to activate action" style={styles.button} onPress={() => router.push('/onboarding/business-info')}>
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#EA580C', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 26 },
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
