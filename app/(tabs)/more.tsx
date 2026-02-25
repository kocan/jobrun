import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useJobs } from '../../contexts/JobContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { verticals } from '../../constants/verticals';
import { theme } from '../../lib/theme';
import { customersToCSV, jobsToCSV, invoicesToCSV, shareCSV } from '../../lib/csvExport';

const menuItems = [
  { label: 'Estimates', icon: '📝', route: '/estimate/new' as const, description: 'Create and manage estimates' },
  { label: 'Invoices', icon: '📄', route: '/invoice/new' as const, description: 'Create and manage invoices' },
  { label: 'Price Book', icon: '📋', route: '/price-book' as const, description: 'Manage your services and pricing' },
  { label: 'Settings', icon: '⚙️', route: '/settings' as const, description: 'Business info and industry settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { customers } = useCustomers();
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const vertical = verticals.find((v) => v.id === settings.selectedVertical);

  const customerMap: Record<string, string> = {};
  for (const c of customers) {
    customerMap[c.id] = `${c.firstName} ${c.lastName}`.trim();
  }

  const handleExport = async (type: 'customers' | 'jobs' | 'invoices') => {
    try {
      const date = new Date().toISOString().split('T')[0];
      if (type === 'customers') {
        await shareCSV(customersToCSV(customers), `customers-${date}.csv`);
      } else if (type === 'jobs') {
        await shareCSV(jobsToCSV(jobs, customerMap), `jobs-${date}.csv`);
      } else {
        await shareCSV(invoicesToCSV(invoices, customerMap), `invoices-${date}.csv`);
      }
    } catch {
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>

      {/* Business summary */}
      {settings.businessName ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Activate action" style={styles.businessCard} onPress={() => router.push('/settings')}>
          <Text style={styles.businessIcon}>{vertical?.icon ?? '⚙️'}</Text>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{settings.businessName}</Text>
            <Text style={styles.businessVertical}>{vertical?.name ?? 'Custom'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {menuItems.map((item) => (
        <Pressable accessibilityRole="button" accessibilityLabel="Activate action" key={item.route} style={styles.menuItem} onPress={() => router.push(item.route)}>
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionHeader}>Export Data</Text>
      <View style={styles.exportRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Export customers CSV" style={styles.exportBtn} onPress={() => handleExport('customers')}>
          <Text style={styles.exportIcon}>👥</Text>
          <Text style={styles.exportLabel}>Customers</Text>
          <Text style={styles.exportCount}>{customers.length}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Export jobs CSV" style={styles.exportBtn} onPress={() => handleExport('jobs')}>
          <Text style={styles.exportIcon}>🔧</Text>
          <Text style={styles.exportLabel}>Jobs</Text>
          <Text style={styles.exportCount}>{jobs.length}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Export invoices CSV" style={styles.exportBtn} onPress={() => handleExport('invoices')}>
          <Text style={styles.exportIcon}>📄</Text>
          <Text style={styles.exportLabel}>Invoices</Text>
          <Text style={styles.exportCount}>{invoices.length}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, marginBottom: theme.spacing.xxl },
  businessCard: {
    flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, marginBottom: theme.spacing.xl,
    borderWidth: 1, borderColor: '#FDBA74',
  },
  businessIcon: { fontSize: 32, marginRight: 14 },
  businessInfo: { flex: 1 },
  businessName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  businessVertical: { fontSize: 14, color: theme.colors.primary, marginTop: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg,
    backgroundColor: theme.colors.background, borderRadius: theme.radius.md, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  menuIcon: { fontSize: 24, marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  menuDesc: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 24, color: '#999', fontWeight: '300' },

  // Export section
  sectionHeader: { fontSize: 13, fontWeight: '700', color: theme.colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, alignItems: 'center', padding: theme.spacing.lg,
    backgroundColor: theme.colors.background, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  exportIcon: { fontSize: 24, marginBottom: 6 },
  exportLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  exportCount: { fontSize: 12, color: theme.colors.gray400, marginTop: 2 },
});
