import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { usePriceBook } from '../contexts/PriceBookContext';
import { verticals } from '../constants/verticals';
import { VerticalId } from '../lib/types';

type SelectableVertical = VerticalId | 'custom';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { resetToDefaults } = usePriceBook();

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
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setDirty(true); }}
            placeholder="Business name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
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
          <TextInput
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
          <Pressable style={styles.saveButton} onPress={handleSaveBusiness}>
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
            <Pressable
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
          <Pressable
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
});
