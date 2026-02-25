import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { usePriceBook } from '../contexts/PriceBookContext';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../lib/network';
import { getPendingSyncCount } from '../lib/db/syncQueue';
import { verticals } from '../constants/verticals';
import { VerticalId } from '../lib/types';

type SelectableVertical = VerticalId | 'custom';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { resetToDefaults } = usePriceBook();
  const { user, signOut, isConfigured } = useAuth();
  const { isOnline } = useNetwork();
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    setPendingSync(getPendingSyncCount());
  }, []);

  const [name, setName] = useState(settings.businessName);
  const [phone, setPhone] = useState(settings.businessPhone);
  const [email, setEmail] = useState(settings.businessEmail);
  const [dirty, setDirty] = useState(false);

  const currentVertical = verticals.find((v) => v.id === settings.selectedVertical);
  const currentVerticalName = currentVertical?.name ?? 'Custom';
  const currentVerticalIcon = currentVertical?.icon ?? '⚙️';

  const handleSaveBusiness = async () => {
    if (!name.trim()) return;
    await updateSettings({
      businessName: name.trim(),
      businessPhone: phone.trim(),
      businessEmail: email.trim(),
    });
    setDirty(false);
  };

  const handleChangeVertical = (verticalId: SelectableVertical) => {
    if (verticalId === settings.selectedVertical) return;

    const newVertical = verticals.find((v) => v.id === verticalId);

    Alert.alert(
      'Change Industry',
      'This will reset your price book to the default services for this industry. Custom services will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Change',
          style: 'destructive',
          onPress: async () => {
            if (newVertical) {
              await resetToDefaults(newVertical.defaultServices);
            } else {
              await resetToDefaults([]);
            }
            await updateSettings({ selectedVertical: verticalId });
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Business Info Section */}
      <Text style={styles.sectionTitle}>Business Info</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput accessibilityRole="text" accessibilityLabel="Text input"
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setDirty(true); }}
            placeholder="Business name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput accessibilityRole="text" accessibilityLabel="Text input"
            style={styles.input}
            value={phone}
            onChangeText={(v) => { setPhone(v); setDirty(true); }}
            placeholder="Phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput accessibilityRole="text" accessibilityLabel="Text input"
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setDirty(true); }}
            placeholder="Email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {dirty && (
          <Pressable accessibilityRole="button" accessibilityLabel="Activate action" style={styles.saveButton} onPress={handleSaveBusiness}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        )}
      </View>

      {/* Industry Vertical Section */}
      <Text style={styles.sectionTitle}>Industry</Text>
      <View style={styles.card}>
        <View style={styles.currentVertical}>
          <Text style={styles.currentVerticalIcon}>{currentVerticalIcon}</Text>
          <Text style={styles.currentVerticalName}>{currentVerticalName}</Text>
        </View>
        <Text style={styles.changeHint}>Tap a different industry to switch. This will reset your price book.</Text>
        <View style={styles.verticalList}>
          {verticals.map((v) => (
            <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
              key={v.id}
              style={[styles.verticalItem, settings.selectedVertical === v.id && styles.verticalItemActive]}
              onPress={() => handleChangeVertical(v.id)}
            >
              <Text style={styles.verticalItemIcon}>{v.icon}</Text>
              <Text style={[styles.verticalItemName, settings.selectedVertical === v.id && styles.verticalItemNameActive]}>
                {v.name}
              </Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
            style={[styles.verticalItem, settings.selectedVertical === 'custom' && styles.verticalItemActive]}
            onPress={() => handleChangeVertical('custom')}
          >
            <Text style={styles.verticalItemIcon}>⚙️</Text>
            <Text style={[styles.verticalItemName, settings.selectedVertical === 'custom' && styles.verticalItemNameActive]}>
              Other / Custom
            </Text>
          </Pressable>
        </View>
      </View>
      {/* Sync Status Section */}
      <Text style={styles.sectionTitle}>Sync Status</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isOnline ? '#22C55E' : '#EAB308', marginRight: 8 }} />
          <Text style={{ fontSize: 15, color: '#333', fontWeight: '500' }}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#666' }}>
          {pendingSync === 0 ? 'All changes synced' : `${pendingSync} change${pendingSync !== 1 ? 's' : ''} pending sync`}
        </Text>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        {user ? (
          <>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.accountEmail}>{user.email}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
              style={styles.signOutButton}
              onPress={() => {
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ]);
              }}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.accountOffline}>Using app offline (no account)</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
              style={styles.saveButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.saveButtonText}>Sign In</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 16, color: '#111', backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#EA580C', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  currentVertical: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  currentVerticalIcon: { fontSize: 28, marginRight: 10 },
  currentVerticalName: { fontSize: 18, fontWeight: '600', color: '#111' },
  changeHint: { fontSize: 13, color: '#888', marginBottom: 16 },
  verticalList: { gap: 8 },
  verticalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  verticalItemActive: { borderColor: '#EA580C', backgroundColor: '#FFF7ED' },
  verticalItemIcon: { fontSize: 22, marginRight: 10 },
  verticalItemName: { fontSize: 15, fontWeight: '500', color: '#333' },
  verticalItemNameActive: { color: '#EA580C', fontWeight: '600' },
  accountEmail: { fontSize: 16, color: '#111', fontWeight: '500', marginTop: 4, marginBottom: 16 },
  accountOffline: { fontSize: 15, color: '#888', marginBottom: 16 },
  signOutButton: {
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center' as const,
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
});
