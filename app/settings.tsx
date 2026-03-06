import { View, Text, TextInput, Pressable, Switch, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { registerForPushNotifications } from '../lib/notifications';
import { useSettings } from '../contexts/SettingsContext';
import { usePriceBook } from '../contexts/PriceBookContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomers } from '../contexts/CustomerContext';
import { useJobs } from '../contexts/JobContext';
import { useInvoices } from '../contexts/InvoiceContext';
import { useNetwork } from '../lib/network';
import { getPendingSyncCount } from '../lib/db/syncQueue';
import { verticals } from '../constants/verticals';
import { VerticalId, StripeAccountStatus } from '../lib/types';
import { customersToCSV, jobsToCSV, invoicesToCSV, shareCSV } from '../lib/csvExport';

type SelectableVertical = VerticalId | 'custom';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { resetToDefaults } = usePriceBook();
  const { user, signOut, isConfigured } = useAuth();
  const { customers } = useCustomers();
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const { isOnline } = useNetwork();
  const [pendingSync, setPendingSync] = useState(0);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    setPendingSync(getPendingSyncCount());
  }, []);

  const handleConnectStripe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to connect your Stripe account.');
      return;
    }

    setStripeLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          returnUrl: `${API_BASE_URL}/api/stripe/connect/callback?userId=${user.id}`,
          refreshUrl: `${API_BASE_URL}/api/stripe/connect/callback?userId=${user.id}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Stripe onboarding');
      }

      // Save the account ID locally
      await updateSettings({
        stripeAccountId: data.stripeAccountId,
        stripeAccountStatus: 'pending',
      });

      // Open Stripe onboarding in browser
      await Linking.openURL(data.url);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to connect Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleRefreshStripeStatus = async () => {
    if (!user || !settings.stripeAccountId) return;

    setStripeLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/connect/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stripeAccountId: settings.stripeAccountId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await updateSettings({
          stripeAccountStatus: data.status as StripeAccountStatus,
        });
      }
    } catch {
      // Silently fail on status refresh
    } finally {
      setStripeLoading(false);
    }
  };

  const handleDisconnectStripe = () => {
    Alert.alert(
      'Disconnect Stripe',
      'Are you sure you want to disconnect your Stripe account? You will no longer be able to accept card payments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await updateSettings({
              stripeAccountId: null,
              stripeAccountStatus: 'not_connected',
            });
          },
        },
      ],
    );
  };

  const getStripeStatusDisplay = () => {
    switch (settings.stripeAccountStatus) {
      case 'connected':
        return { text: 'Connected', color: '#22C55E' };
      case 'pending':
        return { text: 'Pending Verification', color: '#EAB308' };
      case 'restricted':
        return { text: 'Restricted', color: '#F97316' };
      default:
        return { text: 'Not Connected', color: '#6B7280' };
    }
  };

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
          <TextInput accessibilityRole="text" accessibilityLabel="Business name"
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setDirty(true); }}
            placeholder="Business name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput accessibilityRole="text" accessibilityLabel="Phone number"
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
          <TextInput accessibilityRole="text" accessibilityLabel="Email address"
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
          <Pressable accessibilityRole="button" accessibilityLabel="Save business settings" style={styles.saveButton} onPress={handleSaveBusiness}>
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
            <Pressable accessibilityRole="button" accessibilityLabel={`Select ${v.name} industry`}
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
          <Pressable accessibilityRole="button" accessibilityLabel="Select Other or Custom industry"
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
      {/* Notifications Section */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Payment Received</Text>
            <Text style={styles.toggleDesc}>When a customer pays an invoice</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Toggle payment received notifications"
            value={settings.notifyPaymentReceived}
            onValueChange={async (value) => {
              if (value) await registerForPushNotifications();
              await updateSettings({ notifyPaymentReceived: value });
            }}
            trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
            thumbColor={settings.notifyPaymentReceived ? '#EA580C' : '#f4f3f4'}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Estimate Accepted</Text>
            <Text style={styles.toggleDesc}>When a customer accepts an estimate</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Toggle estimate accepted notifications"
            value={settings.notifyEstimateAccepted}
            onValueChange={async (value) => {
              if (value) await registerForPushNotifications();
              await updateSettings({ notifyEstimateAccepted: value });
            }}
            trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
            thumbColor={settings.notifyEstimateAccepted ? '#EA580C' : '#f4f3f4'}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Appointment Reminders</Text>
            <Text style={styles.toggleDesc}>Day-before reminder for scheduled jobs</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Toggle appointment reminder notifications"
            value={settings.notifyAppointmentReminder}
            onValueChange={async (value) => {
              if (value) await registerForPushNotifications();
              await updateSettings({ notifyAppointmentReminder: value });
            }}
            trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
            thumbColor={settings.notifyAppointmentReminder ? '#EA580C' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Payment Setup Section */}
      <Text style={styles.sectionTitle}>Payment Setup</Text>
      <View style={styles.card}>
        <View style={styles.stripeHeader}>
          <Text style={styles.stripeTitle}>Stripe Connect</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStripeStatusDisplay().color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStripeStatusDisplay().color }]} />
            <Text style={[styles.statusText, { color: getStripeStatusDisplay().color }]}>
              {getStripeStatusDisplay().text}
            </Text>
          </View>
        </View>
        <Text style={styles.stripeDesc}>
          Accept credit card payments directly from your customers. Funds are deposited to your bank account.
        </Text>
        {settings.stripeAccountStatus === 'not_connected' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Connect Stripe account"
            style={[styles.saveButton, stripeLoading && styles.buttonDisabled]}
            onPress={handleConnectStripe}
            disabled={stripeLoading}
          >
            {stripeLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Connect Stripe Account</Text>
            )}
          </Pressable>
        ) : settings.stripeAccountStatus === 'pending' ? (
          <View style={styles.stripeActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue Stripe setup"
              style={styles.saveButton}
              onPress={handleConnectStripe}
            >
              <Text style={styles.saveButtonText}>Continue Setup</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh Stripe status"
              style={styles.secondaryButton}
              onPress={handleRefreshStripeStatus}
            >
              {stripeLoading ? (
                <ActivityIndicator color="#EA580C" />
              ) : (
                <Text style={styles.secondaryButtonText}>Refresh Status</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.stripeConnected}>
            <Text style={styles.stripeAccountLabel}>Account ID</Text>
            <Text style={styles.stripeAccountId}>{settings.stripeAccountId}</Text>
            <View style={styles.stripeActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh Stripe status"
                style={styles.secondaryButton}
                onPress={handleRefreshStripeStatus}
              >
                {stripeLoading ? (
                  <ActivityIndicator color="#EA580C" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Refresh Status</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Disconnect Stripe account"
                style={styles.disconnectButton}
                onPress={handleDisconnectStripe}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        )}
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

      {/* Export Data Section */}
      <Text style={styles.sectionTitle}>Export Data</Text>
      <View style={styles.card}>
        <Text style={styles.exportHint}>Export your data as CSV files for use in spreadsheets or other apps.</Text>
        <View style={styles.exportRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Export customers CSV" style={styles.exportBtn} onPress={() => handleExport('customers')}>
            <Text style={styles.exportBtnText}>Customers ({customers.length})</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Export jobs CSV" style={styles.exportBtn} onPress={() => handleExport('jobs')}>
            <Text style={styles.exportBtnText}>Jobs ({jobs.length})</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Export invoices CSV" style={styles.exportBtn} onPress={() => handleExport('invoices')}>
            <Text style={styles.exportBtnText}>Invoices ({invoices.length})</Text>
          </Pressable>
        </View>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        {user ? (
          <>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.accountEmail}>{user.email}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out of account"
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
            <Pressable accessibilityRole="button" accessibilityLabel="Sign in to your account"
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
  changeHint: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  verticalList: { gap: 8 },
  verticalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  verticalItemActive: { borderColor: '#EA580C', backgroundColor: '#FFF7ED' },
  verticalItemIcon: { fontSize: 22, marginRight: 10 },
  verticalItemName: { fontSize: 15, fontWeight: '500', color: '#333' },
  verticalItemNameActive: { color: '#EA580C', fontWeight: '600' },
  exportHint: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, alignItems: 'center' as const, paddingVertical: 12,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB',
  },
  exportBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  accountEmail: { fontSize: 16, color: '#111', fontWeight: '500', marginTop: 4, marginBottom: 16 },
  accountOffline: { fontSize: 15, color: '#6B7280', marginBottom: 16 },
  signOutButton: {
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center' as const,
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  toggleDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  // Stripe styles
  stripeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stripeTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  stripeDesc: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  stripeActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryButton: {
    flex: 1, alignItems: 'center' as const, paddingVertical: 12,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#EA580C',
  },
  secondaryButtonText: { color: '#EA580C', fontSize: 14, fontWeight: '600' },
  disconnectButton: {
    flex: 1, alignItems: 'center' as const, paddingVertical: 12,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#DC2626',
  },
  disconnectButtonText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  stripeConnected: { marginTop: 4 },
  stripeAccountLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  stripeAccountId: { fontSize: 14, fontFamily: 'monospace', color: '#333', marginBottom: 8 },
});
