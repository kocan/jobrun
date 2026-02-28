import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useCustomers } from '../../contexts/CustomerContext';
import { useJobs } from '../../contexts/JobContext';
import { useEstimates } from '../../contexts/EstimateContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { Customer, CommunicationEntry, CommunicationType } from '../../lib/types';
import * as comLogRepo from '../../lib/db/repositories/communicationLog';
import { theme } from '../../lib/theme';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
};

function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-\+\(\)\.]{7,}$/.test(phone);
}

const COMM_TYPES: { value: CommunicationType; label: string; icon: string }[] = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'text', label: 'Text', icon: '💬' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'visit', label: 'Visit', icon: '🏠' },
];

const COMM_TYPE_ICONS: Record<string, string> = {
  call: '📞', text: '💬', email: '✉️', note: '📝', visit: '🏠',
};

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCustomerById, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { getJobsByCustomer } = useJobs();
  const { getEstimatesByCustomer } = useEstimates();
  const { getInvoicesByCustomer } = useInvoices();

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [comLog, setComLog] = useState<CommunicationEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryType, setEntryType] = useState<CommunicationType>('note');
  const [entrySummary, setEntrySummary] = useState('');

  const refreshComLog = useCallback(() => {
    if (!isNew && id) {
      setComLog(comLogRepo.getEntriesByCustomer(id));
    }
  }, [id, isNew]);

  useEffect(() => {
    refreshComLog();
  }, [refreshComLog]);

  const handleAddEntry = () => {
    if (!entrySummary.trim()) {
      Alert.alert('Required', 'Please enter a summary');
      return;
    }
    const entry: CommunicationEntry = {
      id: Crypto.randomUUID(),
      customerId: id!,
      type: entryType,
      summary: entrySummary.trim(),
      createdAt: new Date().toISOString(),
    };
    comLogRepo.addEntry(entry);
    setComLog((prev) => [entry, ...prev]);
    setEntrySummary('');
    setShowAddEntry(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert('Delete Entry', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          comLogRepo.deleteEntry(entryId);
          setComLog((prev) => prev.filter((e) => e.id !== entryId));
        },
      },
    ]);
  };

  useEffect(() => {
    if (!isNew && id) {
      const customer = getCustomerById(id);
      if (customer) {
        setForm({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          zip: customer.zip || '',
          notes: customer.notes || '',
        });
      }
    }
  }, [id, isNew, getCustomerById]);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!validateEmail(form.email)) e.email = 'Invalid email format';
    if (!validatePhone(form.phone)) e.phone = 'Invalid phone format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const data = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zip: form.zip.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (isNew) {
      await addCustomer(data);
      router.back();
    } else {
      await updateCustomer(id!, data);
      setEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Customer', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomer(id!);
          router.back();
        },
      },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const title = isNew ? 'New Customer' : editing ? 'Edit Customer' : `${form.firstName} ${form.lastName}`;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            !isNew && !editing ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Enable edit mode" onPress={() => setEditing(true)}>
                <Text style={styles.headerBtn}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {editing ? (
            <>
              <Field label="First Name *" value={form.firstName} onChange={setField('firstName')} error={errors.firstName} autoFocus={isNew} />
              <Field label="Last Name" value={form.lastName} onChange={setField('lastName')} />
              <Field label="Email" value={form.email} onChange={setField('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Phone" value={form.phone} onChange={setField('phone')} error={errors.phone} keyboardType="phone-pad" />
              <Field label="Address" value={form.address} onChange={setField('address')} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Field label="City" value={form.city} onChange={setField('city')} />
                </View>
                <View style={{ width: 80, marginLeft: 12 }}>
                  <Field label="State" value={form.state} onChange={setField('state')} autoCapitalize="characters" />
                </View>
                <View style={{ width: 90, marginLeft: 12 }}>
                  <Field label="ZIP" value={form.zip} onChange={setField('zip')} keyboardType="number-pad" />
                </View>
              </View>
              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline />

              <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isNew ? 'Add Customer' : 'Save Changes'}</Text>
              </Pressable>
              {!isNew && (
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <InfoRow label="Name" value={`${form.firstName} ${form.lastName}`.trim()} />
              <InfoRow label="Email" value={form.email} />
              <InfoRow label="Phone" value={form.phone} />
              <InfoRow label="Address" value={[form.address, form.city, form.state, form.zip].filter(Boolean).join(', ')} />
              <InfoRow label="Notes" value={form.notes} />

              <Text style={styles.sectionTitle}>Estimates</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Create new record" style={styles.addJobBtn} onPress={() => router.push({ pathname: '/estimate/[id]', params: { id: 'new', customerId: id } })}>
                <Text style={styles.addJobBtnText}>+ New Estimate</Text>
              </Pressable>
              {getEstimatesByCustomer(id!).length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionIcon}>📝</Text>
                  <Text style={styles.emptySectionText}>No estimates yet — create one to send a quote.</Text>
                </View>
              ) : (
                getEstimatesByCustomer(id!).map((est) => (
                  <Pressable accessibilityRole="button" accessibilityLabel={`View estimate $${est.total.toFixed(2)}`} key={est.id} style={styles.jobRow} onPress={() => router.push({ pathname: '/estimate/[id]', params: { id: est.id } })}>
                    <View style={styles.jobRowLeft}>
                      <Text style={styles.jobRowTitle}>${est.total.toFixed(2)}</Text>
                      <Text style={styles.jobRowDate}>{est.status} · {est.createdAt.split('T')[0]}</Text>
                    </View>
                    <View style={[styles.jobStatusDot, { backgroundColor: { 'draft': '#6B7280', 'sent': '#3B82F6', 'viewed': '#8B5CF6', 'accepted': '#10B981', 'declined': '#EF4444', 'expired': '#F59E0B' }[est.status] }]} />
                  </Pressable>
                ))
              )}

              <Text style={styles.sectionTitle}>Jobs</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Create new record" style={styles.addJobBtn} onPress={() => router.push({ pathname: '/job/[id]', params: { id: 'new', customerId: id } })}>
                <Text style={styles.addJobBtnText}>+ New Job</Text>
              </Pressable>
              {getJobsByCustomer(id!).length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionIcon}>🔧</Text>
                  <Text style={styles.emptySectionText}>No jobs yet — schedule one to get started.</Text>
                </View>
              ) : (
                getJobsByCustomer(id!).map((job) => (
                  <Pressable accessibilityRole="button" accessibilityLabel={`View job ${job.title}`} key={job.id} style={styles.jobRow} onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}>
                    <View style={styles.jobRowLeft}>
                      <Text style={styles.jobRowTitle}>{job.title}</Text>
                      <Text style={styles.jobRowDate}>{job.scheduledDate}{job.scheduledTime ? ` at ${job.scheduledTime}` : ''}</Text>
                    </View>
                    <View style={[styles.jobStatusDot, { backgroundColor: { 'scheduled': '#3B82F6', 'in-progress': '#F59E0B', 'completed': '#10B981', 'cancelled': '#EF4444' }[job.status] }]} />
                  </Pressable>
                ))
              )}

              <Text style={styles.sectionTitle}>Invoices</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Create new record" style={styles.addJobBtn} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: 'new', customerId: id } })}>
                <Text style={styles.addJobBtnText}>+ New Invoice</Text>
              </Pressable>
              {getInvoicesByCustomer(id!).length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionIcon}>📄</Text>
                  <Text style={styles.emptySectionText}>No invoices yet — create one to get paid.</Text>
                </View>
              ) : (
                getInvoicesByCustomer(id!).map((inv) => (
                  <Pressable accessibilityRole="button" accessibilityLabel={`View invoice ${inv.invoiceNumber}`} key={inv.id} style={styles.jobRow} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: inv.id } })}>
                    <View style={styles.jobRowLeft}>
                      <Text style={styles.jobRowTitle}>{inv.invoiceNumber} — ${inv.total.toFixed(2)}</Text>
                      <Text style={styles.jobRowDate}>{inv.status} · {inv.createdAt.split('T')[0]}</Text>
                    </View>
                    <View style={[styles.jobStatusDot, { backgroundColor: { 'draft': '#6B7280', 'sent': '#3B82F6', 'viewed': '#8B5CF6', 'paid': '#10B981', 'overdue': '#EF4444', 'cancelled': '#9CA3AF' }[inv.status] }]} />
                  </Pressable>
                ))
              )}

              <Text style={styles.sectionTitle}>Communication Log</Text>
              {showAddEntry ? (
                <View style={styles.addEntryForm}>
                  <View style={styles.entryTypeRow}>
                    {COMM_TYPES.map((t) => (
                      <Pressable
                        key={t.value}
                        accessibilityRole="button"
                        accessibilityLabel={`Type: ${t.label}`}
                        style={[styles.entryTypeBtn, entryType === t.value && styles.entryTypeBtnActive]}
                        onPress={() => setEntryType(t.value)}
                      >
                        <Text style={styles.entryTypeIcon}>{t.icon}</Text>
                        <Text style={[styles.entryTypeBtnText, entryType === t.value && styles.entryTypeBtnTextActive]}>{t.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    accessibilityRole="text"
                    accessibilityLabel="Entry summary"
                    style={[styles.input, { marginBottom: 10 }]}
                    placeholder="What happened?"
                    value={entrySummary}
                    onChangeText={setEntrySummary}
                    multiline
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Cancel" style={[styles.addJobBtn, { backgroundColor: '#D1D5DB' }]} onPress={() => setShowAddEntry(false)}>
                      <Text style={[styles.addJobBtnText, { color: '#374151' }]}>Cancel</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Save log entry" style={styles.addJobBtn} onPress={handleAddEntry}>
                      <Text style={styles.addJobBtnText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Add communication entry" style={styles.addJobBtn} onPress={() => setShowAddEntry(true)}>
                  <Text style={styles.addJobBtnText}>+ Log Communication</Text>
                </Pressable>
              )}
              {comLog.length === 0 && !showAddEntry ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionIcon}>💬</Text>
                  <Text style={styles.emptySectionText}>No communication logged yet.</Text>
                </View>
              ) : (
                comLog.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel="Delete communication entry"
                    style={styles.timelineEntry}
                    onLongPress={() => handleDeleteEntry(entry.id)}
                  >
                    <View style={styles.timelineDot}>
                      <Text style={styles.timelineIcon}>{COMM_TYPE_ICONS[entry.type] || '📝'}</Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineType}>{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</Text>
                      <Text style={styles.timelineSummary}>{entry.summary}</Text>
                      <Text style={styles.timelineDate}>{formatEntryDate(entry.createdAt)}</Text>
                    </View>
                  </Pressable>
                ))
              )}

              <Pressable accessibilityRole="button" accessibilityLabel="Delete record" style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Customer</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  multiline,
  autoFocus,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityRole="text" accessibilityLabel="Text input"
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  headerBtn: { color: '#EA580C', fontSize: 17, fontWeight: '600' },
  row: { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444' },
  error: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  saveBtn: {
    backgroundColor: '#EA580C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#666', fontSize: 17 },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 24 },
  deleteBtnText: { color: '#EF4444', fontSize: 17, fontWeight: '600' },
  infoRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  infoLabel: { fontSize: 13, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 17, color: '#111' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 24, marginBottom: 12 },
  placeholder: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  emptySection: { alignItems: 'center', paddingVertical: 16 },
  emptySectionIcon: { fontSize: 28, marginBottom: 6 },
  emptySectionText: { fontSize: 14, color: '#999', textAlign: 'center' },
  addJobBtn: { backgroundColor: '#EA580C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  addJobBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  jobRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  jobRowLeft: { flex: 1 },
  jobRowTitle: { fontSize: 16, color: '#111', fontWeight: '500' },
  jobRowDate: { fontSize: 14, color: '#666', marginTop: 2 },
  jobStatusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 12 },

  // Communication log
  addEntryForm: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 12 },
  entryTypeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  entryTypeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', gap: 4 },
  entryTypeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  entryTypeIcon: { fontSize: 14 },
  entryTypeBtnText: { fontSize: 13, color: '#666' },
  entryTypeBtnTextActive: { color: '#fff', fontWeight: '600' },
  timelineEntry: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 },
  timelineIcon: { fontSize: 16 },
  timelineContent: { flex: 1 },
  timelineType: { fontSize: 12, fontWeight: '700', color: theme.colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineSummary: { fontSize: 15, color: '#111', marginTop: 2 },
  timelineDate: { fontSize: 12, color: '#999', marginTop: 4 },
});
