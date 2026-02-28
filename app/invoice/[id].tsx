import { View, Text, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useInvoices } from '../../contexts/InvoiceContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useJobs } from '../../contexts/JobContext';
import { useEstimates } from '../../contexts/EstimateContext';
import { InvoiceStatus } from '../../lib/types';
import { isValidInvoiceStatusTransition, calculateInvoiceTotals } from '../../lib/db/repositories/invoices';
import { buildInvoiceShareUrl, buildInvoiceShareMessage } from '../../lib/invoiceSharing';
import { useSettings } from '../../contexts/SettingsContext';
import {
  InfoRow, Field, StatusBadge, ActionButton, SectionTitle,
  SaveButton, CancelButton, DeleteButton, FormSectionHeader, detailStyles as styles,
} from '../../components/DetailScreen';
import { CustomerPickerField, useCustomerName } from '../../components/CustomerPickerField';
import { ServicePickerModal } from '../../components/ServicePickerModal';
import { LineItemEditor, TotalsView, LineItemsView } from '../../components/LineItemEditor';
import { DatePickerField } from '../../components/DateTimePicker';
import { useLineItems } from '../../hooks/useLineItems';
import { theme } from '../../lib/theme';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  'draft': 'Draft',
  'sent': 'Sent',
  'viewed': 'Viewed',
  'paid': 'Paid',
  'overdue': 'Overdue',
  'cancelled': 'Cancelled',
};
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  'draft': '#6B7280',
  'sent': '#3B82F6',
  'viewed': '#8B5CF6',
  'paid': '#10B981',
  'overdue': '#EF4444',
  'cancelled': '#9CA3AF',
};

const PAYMENT_TERMS_OPTIONS = ['Due upon receipt', 'Net 15', 'Net 30', 'Net 60'];

type FormData = {
  customerId: string;
  status: InvoiceStatus;
  taxRate: string;
  notes: string;
  paymentTerms: string;
  dueDate: string;
};

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

const emptyForm: FormData = {
  customerId: '',
  status: 'draft',
  taxRate: '0',
  notes: '',
  paymentTerms: 'Due upon receipt',
  dueDate: defaultDueDate(),
};

export default function InvoiceDetailScreen() {
  const { id, fromJob, fromEstimate, customerId: preselectedCustomerId } = useLocalSearchParams<{
    id: string; fromJob?: string; fromEstimate?: string; customerId?: string;
  }>();
  const router = useRouter();
  const { getInvoiceById, addInvoice, updateInvoice, deleteInvoice, createInvoiceFromJob, createInvoiceFromEstimate, markAsPaid } = useInvoices();
  const { customers, getCustomerById, addCustomer } = useCustomers();
  const { getJobById } = useJobs();
  const { settings: appSettings } = useSettings();
  const { getEstimateById } = useEstimates();
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    customerId: preselectedCustomerId || '',
  }));
  const [lineItems, setLineItemsRaw] = useState<import('../../lib/types').LineItem[]>([]);

  const setLineItems = (updater: (items: import('../../lib/types').LineItem[]) => import('../../lib/types').LineItem[]) => {
    setLineItemsRaw(updater);
  };

  const li = useLineItems(lineItems, setLineItems);
  const customerName = useCustomerName(form.customerId);

  useEffect(() => {
    if (isNew && fromJob) {
      const job = getJobById(fromJob);
      if (job) {
        const data = createInvoiceFromJob(job);
        setForm({
          customerId: data.customerId,
          status: 'draft',
          taxRate: String(data.taxRate),
          notes: data.notes || '',
          paymentTerms: data.paymentTerms || 'Due upon receipt',
          dueDate: defaultDueDate(),
        });
        setLineItemsRaw(data.lineItems);
      }
    } else if (isNew && fromEstimate) {
      const est = getEstimateById(fromEstimate);
      if (est) {
        const data = createInvoiceFromEstimate(est);
        setForm({
          customerId: data.customerId,
          status: 'draft',
          taxRate: String(data.taxRate),
          notes: data.notes || '',
          paymentTerms: data.paymentTerms || 'Due upon receipt',
          dueDate: defaultDueDate(),
        });
        setLineItemsRaw(data.lineItems);
      }
    } else if (!isNew && id) {
      const inv = getInvoiceById(id);
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber);
        setForm({
          customerId: inv.customerId,
          status: inv.status,
          taxRate: String(inv.taxRate),
          notes: inv.notes || '',
          paymentTerms: inv.paymentTerms || 'Due upon receipt',
          dueDate: inv.dueDate?.split('T')[0] || defaultDueDate(),
        });
        setLineItemsRaw(inv.lineItems);
      }
    }
  }, [id, isNew, fromJob, fromEstimate]);

  const taxRate = parseFloat(form.taxRate) || 0;
  const totals = useMemo(
    () => calculateInvoiceTotals(lineItems, taxRate),
    [lineItems, taxRate]
  );

  const handleSave = async () => {
    if (!form.customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (lineItems.length === 0) {
      Alert.alert('Error', 'Please add at least one line item');
      return;
    }

    const data = {
      customerId: form.customerId,
      status: form.status,
      lineItems,
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      notes: form.notes.trim() || undefined,
      paymentTerms: form.paymentTerms,
      dueDate: form.dueDate,
      payments: [],
      jobId: fromJob || undefined,
      estimateId: fromEstimate || undefined,
    };

    if (isNew) {
      await addInvoice(data as any);
      router.back();
    } else {
      await updateInvoice(id!, data);
      setEditing(false);
    }
  };

  const handleMarkAsPaid = () => {
    Alert.alert('Mark as Paid', 'Mark this invoice as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          await markAsPaid(id!);
          setForm((f) => ({ ...f, status: 'paid' }));
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Invoice', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteInvoice(id!);
          router.back();
        },
      },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const title = isNew ? 'New Invoice' : editing ? 'Edit Invoice' : `Invoice ${invoiceNumber}`;

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
              {/* Invoice Number (view only) */}
              {!isNew && invoiceNumber ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Invoice Number</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.primary }}>{invoiceNumber}</Text>
                </View>
              ) : null}

              <FormSectionHeader title="Customer Info" />
              <CustomerPickerField
                customerId={form.customerId}
                onSelect={(cId) => setForm((f) => ({ ...f, customerId: cId }))}
              />

              <FormSectionHeader title="Line Items" />
              <LineItemEditor
                lineItems={lineItems}
                onUpdateItem={li.updateItem}
                onRemoveItem={li.removeItem}
                onAddService={li.openServicePicker}
                required
              />

              {/* Tax Rate */}
              <Field label="Tax Rate (%)" value={form.taxRate} onChange={setField('taxRate')} keyboardType="numeric" placeholder="0" />

              {lineItems.length > 0 && (
                <TotalsView subtotal={totals.subtotal} taxRate={taxRate} taxAmount={totals.taxAmount} total={totals.total} />
              )}

              <FormSectionHeader title="Payment" />
              <View style={styles.field}>
                <Text style={styles.label}>Payment Terms</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <Pressable
                      key={term}
                      accessibilityRole="radio"
                      accessibilityLabel={term}
                      accessibilityState={{ selected: form.paymentTerms === term }}
                      style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' }, form.paymentTerms === term && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                      onPress={() => setForm((f) => ({ ...f, paymentTerms: term }))}
                    >
                      <Text style={[{ fontSize: 14, color: '#666' }, form.paymentTerms === term && { color: '#fff', fontWeight: '600' }]}>
                        {term}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <DatePickerField label="Due Date" value={form.dueDate} onChange={setField('dueDate')} />
              <FormSectionHeader title="Notes" />
              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline placeholder="e.g. Thank you for your business" />

              <SaveButton label={isNew ? 'Create Invoice' : 'Save Changes'} onPress={handleSave} />
              <CancelButton onPress={() => isNew ? router.back() : setEditing(false)} />
            </>
          ) : (
            <>
              <StatusBadge label={STATUS_LABELS[form.status]} color={STATUS_COLORS[form.status]} />

              <InfoRow label="Invoice #" value={invoiceNumber} />
              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Payment Terms" value={form.paymentTerms} />
              <InfoRow label="Due Date" value={form.dueDate} />

              {lineItems.length > 0 && (
                <View style={styles.field}>
                  <SectionTitle title="Line Items" />
                  <LineItemsView lineItems={lineItems} />
                  <TotalsView subtotal={totals.subtotal} taxRate={taxRate} taxAmount={totals.taxAmount} total={totals.total} />
                </View>
              )}

              <InfoRow label="Notes" value={form.notes} />

              {/* Share Actions */}
              {(form.status === 'draft' || form.status === 'sent') && (
                <>
                  <SectionTitle title="Share" />
                  <ActionButton label="📤 Share Invoice" color="#7C3AED" onPress={async () => {
                    const inv = getInvoiceById(id!);
                    if (!inv) return;
                    const message = buildInvoiceShareMessage(inv, customerName, appSettings.businessName || undefined);
                    try {
                      await Share.share({ message });
                      if (inv.status === 'draft') {
                        await updateInvoice(id!, { status: 'sent' });
                        setForm((f) => ({ ...f, status: 'sent' }));
                      }
                    } catch {}
                  }} />
                  <ActionButton label="🔗 Copy Link" color="#6B7280" onPress={async () => {
                    const inv = getInvoiceById(id!);
                    if (!inv) return;
                    const url = buildInvoiceShareUrl(inv, customerName);
                    try {
                      await Clipboard.setStringAsync(url);
                      Alert.alert('Copied', 'Invoice link copied to clipboard');
                    } catch {
                      Alert.alert('Link', url);
                    }
                  }} />
                </>
              )}

              <SectionTitle title="Actions" />
              {form.status === 'draft' && (
                <ActionButton label="✉ Mark as Sent" color="#3B82F6" onPress={async () => {
                  await updateInvoice(id!, { status: 'sent' });
                  setForm((f) => ({ ...f, status: 'sent' }));
                }} />
              )}
              {(form.status === 'sent' || form.status === 'viewed' || form.status === 'overdue') && (
                <ActionButton label="💰 Mark as Paid" color="#10B981" onPress={handleMarkAsPaid} />
              )}
              {(form.status === 'sent' || form.status === 'viewed') && (
                <ActionButton label="⚠ Mark Overdue" color="#EF4444" onPress={async () => {
                  await updateInvoice(id!, { status: 'overdue' });
                  setForm((f) => ({ ...f, status: 'overdue' }));
                }} />
              )}
              {form.status !== 'paid' && form.status !== 'cancelled' && (
                <ActionButton label="✕ Cancel Invoice" color="#9CA3AF" onPress={async () => {
                  await updateInvoice(id!, { status: 'cancelled' });
                  setForm((f) => ({ ...f, status: 'cancelled' }));
                }} />
              )}
              {form.status === 'cancelled' && (
                <ActionButton label="↻ Revert to Draft" color="#6B7280" onPress={async () => {
                  await updateInvoice(id!, { status: 'draft' });
                  setForm((f) => ({ ...f, status: 'draft' }));
                }} />
              )}

              {form.status === 'paid' && (
                <View style={{ backgroundColor: '#D1FAE5', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#065F46', fontSize: 16, fontWeight: '600' }}>✓ Paid {getInvoiceById(id!)?.paidAt?.split('T')[0]}</Text>
                </View>
              )}

              <DeleteButton label="Delete Invoice" onPress={handleDelete} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ServicePickerModal
        visible={li.servicePickerVisible}
        services={li.activeServices}
        onSelect={li.handleServiceSelect}
        onClose={li.closeServicePicker}
      />
    </>
  );
}
