import { View, Text, TextInput, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
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
import {
  InfoRow, Field, StatusBadge, ActionButton, SectionTitle,
  SaveButton, CancelButton, DeleteButton, detailStyles as styles,
} from '../../components/DetailScreen';

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

type FormErrors = Partial<Record<keyof FormData, string>>;

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
  const [errors, setErrors] = useState<FormErrors>({});

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
    const phoneDigits = q.replace(/\D/g, '');
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (phoneDigits.length > 0 && c.phone ? c.phone.replace(/\D/g, '').includes(phoneDigits) : false)
    );
  }, [customers, customerSearch]);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!form.customerId) {
      nextErrors.customerId = 'Please select a customer.';
    }
    if (!form.scheduledDate.trim()) {
      nextErrors.scheduledDate = 'Please enter a scheduled date.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
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

  const setField = (key: keyof FormData) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() : 'Select Customer';
  const title = isNew ? 'New Job' : editing ? 'Edit Job' : form.title || 'Job Details';

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
              {/* Customer Picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Customer *</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open customer picker"
                  style={[styles.pickerBtn, errors.customerId && styles.inputError]}
                  onPress={() => setCustomerPickerVisible(true)}
                >
                  <Text style={[styles.pickerText, !form.customerId && styles.pickerPlaceholder]}>
                    {customerName}
                  </Text>
                </Pressable>
                {errors.customerId ? <Text style={styles.fieldError}>{errors.customerId}</Text> : null}
              </View>

              <Field label="Title *" value={form.title} onChange={setField('title')} autoFocus={isNew} />
              <Field label="Description" value={form.description} onChange={setField('description')} multiline />

              {/* Status */}
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
                      key={s}
                      style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' }, form.status === s && { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => setForm((f) => ({ ...f, status: s }))}
                    >
                      <Text style={[{ fontSize: 14, color: '#666' }, form.status === s && { color: '#fff', fontWeight: '600' }]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Field
                label="Date (YYYY-MM-DD)"
                value={form.scheduledDate}
                onChange={setField('scheduledDate')}
                error={errors.scheduledDate}
              />
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
                        <TextInput accessibilityRole="text" accessibilityLabel="Text input"
                          style={styles.lineItemQtyInput}
                          value={String(li.quantity)}
                          onChangeText={(v) => updateLineItem(li.id, { quantity: parseInt(v) || 1 })}
                          keyboardType="number-pad"
                        />
                        <Text style={styles.lineItemLabel}>@ $</Text>
                        <TextInput accessibilityRole="text" accessibilityLabel="Text input"
                          style={styles.lineItemPriceInput}
                          value={String(li.unitPrice)}
                          onChangeText={(v) => updateLineItem(li.id, { unitPrice: parseFloat(v) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={styles.lineItemRight}>
                      <Text style={styles.lineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove line item"
                        style={styles.lineItemRemoveButton}
                        hitSlop={8}
                        onPress={() => removeLineItem(li.id)}
                      >
                        <Text style={styles.lineItemRemove}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable accessibilityRole="button" accessibilityLabel="Add service line item" style={styles.addServiceBtn} onPress={() => setServicePickerVisible(true)}>
                  <Text style={styles.addServiceBtnText}>+ Add Service</Text>
                </Pressable>
                {form.lineItems.length > 0 && (
                  <View style={[styles.totalsRow, styles.totalRowFinal]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${lineItemTotal.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline />

              <SaveButton label={isNew ? 'Create Job' : 'Save Changes'} onPress={handleSave} />
              <CancelButton onPress={() => isNew ? router.back() : setEditing(false)} />
            </>
          ) : (
            <>
              <StatusBadge label={STATUS_LABELS[form.status]} color={STATUS_COLORS[form.status]} />

              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Date" value={form.scheduledDate} />
              <InfoRow label="Time" value={form.scheduledTime} />
              <InfoRow label="Duration" value={form.estimatedDuration ? `${form.estimatedDuration} min` : undefined} />
              <InfoRow label="Total" value={lineItemTotal > 0 ? `$${lineItemTotal.toFixed(2)}` : undefined} />
              <InfoRow label="Description" value={form.description} />
              <InfoRow label="Notes" value={form.notes} />

              <SectionTitle title="Actions" />
              {form.status === 'scheduled' && (
                <ActionButton label="▶ Start Job" color="#F59E0B" onPress={() => handleStatusChange('in-progress')} />
              )}
              {form.status === 'in-progress' && (
                <ActionButton label="✓ Complete Job" color="#10B981" onPress={() => handleStatusChange('completed')} />
              )}
              {(form.status === 'scheduled' || form.status === 'in-progress') && (
                <ActionButton label="✕ Cancel Job" color="#EF4444" onPress={() => handleStatusChange('cancelled')} />
              )}
              {form.status === 'cancelled' && (
                <ActionButton label="↻ Reschedule" color="#3B82F6" onPress={() => handleStatusChange('scheduled')} />
              )}

              {!isNew && (() => {
                const existingInvoice = getInvoiceByJobId(id!);
                if (existingInvoice) {
                  return (
                    <ActionButton label={`📄 View Invoice (${existingInvoice.invoiceNumber})`} color="#7C3AED" onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: existingInvoice.id } })} />
                  );
                }
                return (
                  <ActionButton label="📄 Create Invoice" color="#7C3AED" onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: 'new', fromJob: id } })} />
                );
              })()}

              <DeleteButton label="Delete Job" onPress={handleDelete} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal visible={customerPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, Platform.OS === 'android' && styles.modalContainerAndroid]}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close customer picker" onPress={() => { setCustomerPickerVisible(false); setCustomerSearch(''); }}>
              <Text style={styles.headerBtn}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <View style={{ width: 50 }} />
          </View>
          <TextInput accessibilityRole="text" accessibilityLabel="Text input"
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
              <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
                style={styles.pickerRow}
                onPress={() => {
                  setForm((f) => ({ ...f, customerId: item.id }));
                  setErrors((prev) => ({ ...prev, customerId: undefined }));
                  setCustomerPickerVisible(false);
                  setCustomerSearch('');
                }}
              >
                <Text style={styles.pickerRowName}>{item.firstName} {item.lastName}</Text>
                {item.phone ? <Text style={styles.pickerRowSub}>{item.phone}</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
          />
        </View>
      </Modal>

      {/* Service Picker Modal */}
      <Modal visible={servicePickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, Platform.OS === 'android' && styles.modalContainerAndroid]}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close service picker" onPress={() => setServicePickerVisible(false)}>
              <Text style={styles.headerBtn}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Add Service</Text>
            <View style={{ width: 50 }} />
          </View>
          <FlatList
            data={activeServices}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
                style={styles.pickerRow}
                onPress={() => {
                  addLineItemFromService(item.id);
                  setServicePickerVisible(false);
                }}
              >
                <Text style={styles.pickerRowName}>{item.name}</Text>
                <Text style={styles.pickerRowSub}>${item.price.toFixed(2)} · {item.estimatedDuration}min</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No active services. Add some in Price Book.</Text>}
          />
        </View>
      </Modal>
    </>
  );
}
