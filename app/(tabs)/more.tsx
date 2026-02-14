import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import { verticals } from '../../constants/verticals';

const menuItems = [
  { label: 'Estimates', icon: '📝', route: '/estimate/new' as const, description: 'Create and manage estimates' },
  { label: 'Invoices', icon: '📄', route: '/invoice/new' as const, description: 'Create and manage invoices' },
  { label: 'Price Book', icon: '📋', route: '/price-book' as const, description: 'Manage your services and pricing' },
  { label: 'Settings', icon: '⚙️', route: '/settings' as const, description: 'Business info and industry settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const vertical = verticals.find((v) => v.id === settings.selectedVertical);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>

      {/* Business summary */}
      {settings.businessName ? (
        <Pressable style={styles.businessCard} onPress={() => router.push('/settings')}>
          <Text style={styles.businessIcon}>{vertical?.icon ?? '⚙️'}</Text>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{settings.businessName}</Text>
            <Text style={styles.businessVertical}>{vertical?.name ?? 'Custom'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {menuItems.map((item) => (
        <Pressable key={item.route} style={styles.menuItem} onPress={() => router.push(item.route)}>
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#EA580C', marginBottom: 24 },
  businessCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#FFF7ED', borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDBA74',
  },
  businessIcon: { fontSize: 32, marginRight: 14 },
  businessInfo: { flex: 1 },
  businessName: { fontSize: 18, fontWeight: '700', color: '#111' },
  businessVertical: { fontSize: 14, color: '#EA580C', marginTop: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  menuIcon: { fontSize: 24, marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  menuDesc: { fontSize: 14, color: '#666', marginTop: 2 },
  chevron: { fontSize: 24, color: '#999', fontWeight: '300' },
});
