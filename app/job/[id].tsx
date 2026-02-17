import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useJobs } from '../../contexts/JobContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { usePriceBook } from '../../contexts/PriceBookContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { Job, JobStatus, LineItem } from '../../lib/types';
import { isValidStatusTransition } from '../../lib/db/repositories/jobs';
import { calculateTotal } from '../../lib/db/repositories/priceBook';

const STATUS_OPTIONS: JobStatus[] = ['scheduled', 'in-progress', 'completed', 'cancelled'];
const STATUS_LABELS: Record<JobStatus, string> = {
  'scheduled': 'Scheduled',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};
const STATUS_COLORS: Record<JobStatus, string> = {
  'scheduled': '#3B82F6',
  'in-progress': '#F59E0B',
  'completed': '#10B981',
  'cancelled': '#EF4444',
};

type FormData = {
  customerId: string;
  title: string;
  description: string;
  status: JobStatus;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: string;
  notes: string;
  lineItems: LineItem[];
};

const emptyForm: FormData = {
  customerId: '',
  title: '',
  description: '',
  status: 'scheduled',
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: '09:00',
  estimatedDuration: '60',
  notes: '',
  lineItems: [],
};

export default function JobDetailScreen() {
  const { id, customerId: preselectedCustomerId, scheduledDate: preselectedDate, date: preselectedDate2 } = useLocalSearchParams<{ id: string; customerId?: string; scheduledDate?: string; date?: string }>();
  const router = useRouter();
  const { getJobById, addJob, updateJob, deleteJob } = useJobs();
  const { customers, getCustomerById } = useCustomers();
  const { getActiveServices } = usePriceBook();
  const { getInvoiceByJobId } = useInvoices();
  const [servicePickerVisible, setServicePickerVisible] = useState(false);

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    customerId: preselectedCustomerId || '',
    scheduledDate: preselectedDate || preselectedDate2 || emptyForm.scheduledDate,
  }));
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      const job = getJobById(id);
      if (job) {
        setForm({
          customerId: job.customerId,
          title: job.title,
          description: job.description || '',
          status: job.status,
          scheduledDate: job.scheduledDate,
          scheduledTime: job.scheduledTime || '',
          estimatedDuration: String(job.estimatedDuration || 60),
          notes: job.notes || '',
          lineItems: job.lineItems || [],
        });
      }
    }
  }, [id, isNew, getJobById]);

  const selectedCustomer = useMemo(
    () => form.customerId ? getCustomerById(form.customerId) : undefined,
    [form.customerId, getCustomerById]
  );

  const lineItemTotal = useMemo(
    () => calculateTotal(form.lineItems.map((li) => ({ price: li.unitPrice, quantity: li.quantity }))),
    [form.lineItems]
  );

  const activeServices = useMemo(() => getActiveServices(), [getActiveServices]);

  const addLineItemFromService = (serviceId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc) return;
    const li: LineItem = {
      id: Crypto.randomUUID(),
      serviceId: svc.id,
      name: svc.name,
      description: svc.description,
      quantity: 1,
      unitPrice: svc.price,
      total: svc.price,
    };
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, li] }));
  };

  const updateLineItem = (liId: string, updates: Partial<LineItem>) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li) => {
        if (li.id !== liId) return li;
        const updated = { ...li, ...updates };
        updated.total = Math.round(updated.unitPrice * updated.quantity * 100) / 100;
        return updated;
      }),
    }));
  };

  const removeLineItem = (liId: string) => {
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((li) => li.id !== liId) }));
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearch]);

  const handleSave = async () => {
    if (!form.customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }

    const jobData = {
      customerId: form.customerId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime || undefined,
      estimatedDuration: parseInt(form.estimatedDuration) || 60,
      notes: form.notes.trim() || undefined,
      lineItems: form.lineItems,
      total: lineItemTotal,
      photos: [],
    };

    if (isNew) {
      await addJob(jobData as Omit<Job, 'id' | 'createdAt' | 'updatedAt'>);
      router.back();
    } else {
      await updateJob(id!, jobData);
      setEditing(false);
    }
  };

  const handleStatusChange = async (newStatus: JobStatus) => {
    const job = getJobById(id!);
    if (!job) return;
    if (!isValidStatusTransition(job.status, newStatus)) {
      Alert.alert('Invalid', `Cannot change from ${STATUS_LABELS[job.status]} to ${STATUS_LABELS[newStatus]}`);
      return;
    }
    await updateJob(id!, { status: newStatus });
    setForm((f) => ({ ...f, status: newStatus }));
  };

  const handleDelete = () => {
    Alert.alert('Delete Job', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteJob(id!);
          router.back();
        },
      },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() : 'Select Customer';
  const title = isNew ? 'New Job' : editing ? 'Edit Job' : form.title || 'Job Details';

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            !isNew && !editing ? (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.headerBtn}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {editing ? (
            <>
              {/* Customer Picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Customer *</Text>
                <Pressable style={styles.pickerBtn} onPress={() => setCustomerPickerVisible(true)}>
                  <Text style={[styles.pickerText, !form.customerId && styles.pickerPlaceholder]}>
                    {customerName}
                  </Text>
                </Pressable>
              </View>

              <Field label="Title *" value={form.title} onChange={setField('title')} autoFocus={isNew} />
              <Field label="Description" value={form.description} onChange={setField('description')} multiline />

              {/* Status */}
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.statusChip, form.status === s && { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => setForm((f) => ({ ...f, status: s }))}
                    >
                      <Text style={[styles.statusChipText, form.status === s && styles.statusChipActive]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Field label="Date (YYYY-MM-DD)" value={form.scheduledDate} onChange={setField('scheduledDate')} />
              <Field label="Time (HH:MM)" value={form.scheduledTime} onChange={setField('scheduledTime')} />
              <Field label="Duration (minutes)" value={form.estimatedDuration} onChange={setField('estimatedDuration')} keyboardType="number-pad" />
              {/* Line Items */}
              <View style={styles.field}>
                <Text style={styles.label}>Line Items</Text>
                {form.lineItems.map((li) => (
                  <View key={li.id} style={styles.lineItemRow}>
                    <View style={styles.lineItemInfo}>
                      <Text style={styles.lineItemName}>{li.name}</Text>
                      <View style={styles.lineItemControls}>
                        <Text style={styles.lineItemLabel}>Qty:</Text>
                        <TextInput
                          style={styles.lineItemQtyInput}
                          value={String(li.quantity)}
                          onChangeText={(v) => updateLineItem(li.id, { quantity: parseInt(v) || 1 })}
                          keyboardType="number-pad"
                        />
                        <Text style={styles.lineItemLabel}>@ $</Text>
                        <TextInput
                          style={styles.lineItemPriceInput}
                          value={String(li.unitPrice)}
                          onChangeText={(v) => updateLineItem(li.id, { unitPrice: parseFloat(v) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={styles.lineItemRight}>
                      <Text style={styles.lineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
                      <Pressable onPress={() => removeLineItem(li.id)}>
                        <Text style={styles.lineItemRemove}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable style={styles.addServiceBtn} onPress={() => setServicePickerVisible(true)}>
                  <Text style={styles.addServiceBtnText}>+ Add Service</Text>
                </Pressable>
                {form.lineItems.length > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${lineItemTotal.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline />

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isNew ? 'Create Job' : 'Save Changes'}</Text>
              </Pressable>
              {!isNew && (
                <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
              {isNew && (
                <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[form.status] }]}>
                <Text style={styles.statusBadgeText}>{STATUS_LABELS[form.status]}</Text>
              </View>

              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Date" value={form.scheduledDate} />
              <InfoRow label="Time" value={form.scheduledTime} />
              <InfoRow label="Duration" value={form.estimatedDuration ? `${form.estimatedDuration} min` : undefined} />
              <InfoRow label="Total" value={lineItemTotal > 0 ? `$${lineItemTotal.toFixed(2)}` : undefined} />
              <InfoRow label="Description" value={form.description} />
              <InfoRow label="Notes" value={form.notes} />

              {/* Action Buttons */}
              <Text style={styles.sectionTitle}>Actions</Text>
              {form.status === 'scheduled' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleStatusChange('in-progress')}>
                  <Text style={styles.actionBtnText}>▶ Start Job</Text>
                </Pressable>
              )}
              {form.status === 'in-progress' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleStatusChange('completed')}>
                  <Text style={styles.actionBtnText}>✓ Complete Job</Text>
                </Pressable>
              )}
              {(form.status === 'scheduled' || form.status === 'in-progress') && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleStatusChange('cancelled')}>
                  <Text style={styles.actionBtnText}>✕ Cancel Job</Text>
                </Pressable>
              )}
              {form.status === 'cancelled' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleStatusChange('scheduled')}>
                  <Text style={styles.actionBtnText}>↻ Reschedule</Text>
                </Pressable>
              )}

              {/* Invoice */}
              {!isNew && (() => {
                const existingInvoice = getInvoiceByJobId(id!);
                if (existingInvoice) {
                  return (
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: existingInvoice.id } })}>
                      <Text style={styles.actionBtnText}>📄 View Invoice ({existingInvoice.invoiceNumber})</Text>
                    </Pressable>
                  );
                }
                return (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: 'new', fromJob: id } })}>
                    <Text style={styles.actionBtnText}>📄 Create Invoice</Text>
                  </Pressable>
                );
              })()}

              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Job</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal visible={customerPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setCustomerPickerVisible(false); setCustomerSearch(''); }}>
              <Text style={styles.headerBtn}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <View style={{ width: 50 }} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={customerSearch}
            onChangeText={setCustomerSearch}
            autoFocus
          />
          <FlatList
            data={filteredCustomers}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.customerRow}
                onPress={() => {
                  setForm((f) => ({ ...f, customerId: item.id }));
                  setCustomerPickerVisible(false);
                  setCustomerSearch('');
                }}
              >
                <Text style={styles.customerRowName}>{item.firstName} {item.lastName}</Text>
                {item.phone ? <Text style={styles.customerRowPhone}>{item.phone}</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
          />
        </View>
      </Modal>

      {/* Service Picker Modal */}
      <Modal visible={servicePickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setServicePickerVisible(false)}>
              <Text style={styles.headerBtn}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Add Service</Text>
            <View style={{ width: 50 }} />
          </View>
          <FlatList
            data={activeServices}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.customerRow}
                onPress={() => {
                  addLineItemFromService(item.id);
                  setServicePickerVisible(false);
                }}
              >
                <Text style={styles.customerRowName}>{item.name}</Text>
                <Text style={styles.customerRowPhone}>${item.price.toFixed(2)} · {item.estimatedDuration}min</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No active services. Add some in Price Book.</Text>}
          />
        </View>
      </Modal>
    </>
  );
}

function Field({
  label, value, onChange, multiline, autoFocus, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; autoFocus?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
      />
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
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, fontSize: 16, color: '#111', backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, backgroundColor: '#F9FAFB',
  },
  pickerText: { fontSize: 16, color: '#111' },
  pickerPlaceholder: { color: '#999' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB',
  },
  statusChipText: { fontSize: 14, color: '#666' },
  statusChipActive: { color: '#fff', fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#EA580C', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
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
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  searchInput: {
    marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB',
  },
  customerRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  customerRowName: { fontSize: 17, color: '#111' },
  customerRowPhone: { fontSize: 14, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', padding: 24, color: '#999', fontSize: 16 },
  lineItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  lineItemInfo: { flex: 1 },
  lineItemName: { fontSize: 16, color: '#111', fontWeight: '500' },
  lineItemControls: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  lineItemLabel: { fontSize: 14, color: '#666', marginRight: 4 },
  lineItemQtyInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, width: 48, fontSize: 14, textAlign: 'center', marginRight: 8,
  },
  lineItemPriceInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, width: 72, fontSize: 14, textAlign: 'right',
  },
  lineItemRight: { alignItems: 'flex-end', marginLeft: 12 },
  lineItemTotal: { fontSize: 16, fontWeight: '600', color: '#111' },
  lineItemRemove: { fontSize: 18, color: '#EF4444', minWidth: 44, minHeight: 44, textAlign: 'center' as const, lineHeight: 44, padding: 4 },
  addServiceBtn: {
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EA580C',
    borderRadius: 8, borderStyle: 'dashed', marginTop: 8,
  },
  addServiceBtnText: { color: '#EA580C', fontSize: 16, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginTop: 8,
    borderTopWidth: 2, borderTopColor: '#111',
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#111' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#111' },
});
