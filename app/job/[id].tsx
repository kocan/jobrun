import { View, Text, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
  StatusBadge, ActionButton, SectionTitle,
  SaveButton, CancelButton, DeleteButton, FormSectionHeader,
} from '../../components/DetailScreen';
import { detailStyles as styles } from '../../styles/detailScreen';
import { Field } from '../../components/shared/Field';
import { InfoRow } from '../../components/shared/InfoRow';
import { LineItemEditor } from '../../components/shared/LineItemEditor';
import { CustomerPicker } from '../../components/CustomerPicker';
import { ServicePicker } from '../../components/ServicePicker';
import { DatePickerField, TimePickerField } from '../../components/DateTimePicker';

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
  const { customers, getCustomerById, addCustomer } = useCustomers();
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
              <FormSectionHeader title="Customer Info" />
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

              <FormSectionHeader title="Schedule" />
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s}
                      accessibilityRole="radio"
                      accessibilityLabel={STATUS_LABELS[s]}
                      accessibilityState={{ selected: form.status === s }}
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

              <DatePickerField
                label="Date"
                value={form.scheduledDate}
                onChange={setField('scheduledDate')}
                error={errors.scheduledDate}
              />
              <TimePickerField label="Time" value={form.scheduledTime} onChange={setField('scheduledTime')} />
              <Field label="Duration (minutes)" value={form.estimatedDuration} onChange={setField('estimatedDuration')} keyboardType="number-pad" />
              <FormSectionHeader title="Line Items" />
              <LineItemEditor
                lineItems={form.lineItems}
                onUpdateItem={updateLineItem}
                onRemoveItem={removeLineItem}
                onAddService={() => setServicePickerVisible(true)}
              />
              {form.lineItems.length > 0 && (
                <View style={[styles.totalsRow, styles.totalRowFinal]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${lineItemTotal.toFixed(2)}</Text>
                </View>
              )}

              <FormSectionHeader title="Notes" />
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

      <CustomerPicker
        visible={customerPickerVisible}
        customers={customers}
        onSelect={(c) => {
          setForm((f) => ({ ...f, customerId: c.id }));
          setErrors((prev) => ({ ...prev, customerId: undefined }));
          setCustomerPickerVisible(false);
        }}
        onClose={() => setCustomerPickerVisible(false)}
        onAddCustomer={async (data) => addCustomer(data)}
      />

      <ServicePicker
        visible={servicePickerVisible}
        services={activeServices}
        onSelect={(svc) => {
          addLineItemFromService(svc.id);
          setServicePickerVisible(false);
        }}
        onClose={() => setServicePickerVisible(false)}
      />
    </>
  );
}
