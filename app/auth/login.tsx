import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen() {
  const { signInWithMagicLink, skipAuth, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isConfigured) {
      setError('Authentication is not configured yet. Skip for now and use the app offline.');
      return;
    }

    setSending(true);
    const { error: sendError } = await signInWithMagicLink(email.trim());
    setSending(false);

    if (sendError) {
      setError(sendError);
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🏗️ JobRun</Text>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a magic link — no password needed.
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check your email!</Text>
            <Text style={styles.successText}>
              We sent a login link to {email}. Tap it to sign in.
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry login" style={styles.retryButton} onPress={() => setSent(false)}>
              <Text style={styles.retryText}>Use a different email</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput accessibilityRole="text" accessibilityLabel="Text input"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!sending}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable accessibilityRole="button" accessibilityLabel="Send magic link to sign in"
              style={[styles.button, sending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              <Text style={styles.buttonText}>
                {sending ? 'Sending…' : 'Send Magic Link'}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Skip login for now" style={styles.skipButton} onPress={skipAuth}>
          <Text style={styles.skipText}>Continue without account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: '#111', backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  error: { color: '#DC2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#6B7280', fontSize: 15 },
  successBox: { alignItems: 'center', padding: 24, backgroundColor: '#FFF7ED', borderRadius: 16, marginBottom: 16 },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  successText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  retryButton: { marginTop: 16 },
  retryText: { color: '#EA580C', fontSize: 15, fontWeight: '600' },
});
