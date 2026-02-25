import { View, Text, TextInput, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import { useInvoices } from '../../contexts/InvoiceContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useJobs } from '../../contexts/JobContext';
import { useEstimates } from '../../contexts/EstimateContext';
import { usePriceBook } from '../../contexts/PriceBookContext';
import { InvoiceStatus, LineItem } from '../../lib/types';
import { isValidInvoiceStatusTransition, calculateInvoiceTotals } from '../../lib/db/repositories/invoices';
import { buildInvoiceShareUrl, buildInvoiceShareMessage } from '../../lib/invoiceSharing';
import { useSettings } from '../../contexts/SettingsContext';
import {
  InfoRow, Field, StatusBadge, ActionButton, SectionTitle,
  SaveButton, CancelButton, DeleteButton, detailStyles as styles,
} from '../../components/DetailScreen';
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
  lineItems: LineItem[];
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
  lineItems: [],
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
  const { customers, getCustomerById } = useCustomers();
  const { getJobById } = useJobs();
  const { settings: appSettings } = useSettings();
  const { getEstimateById } = useEstimates();
  const { getActiveServices } = usePriceBook();
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    customerId: preselectedCustomerId || '',
  }));

  useEffect(() => {
    if (isNew && fromJob) {
      const job = getJobById(fromJob);
      if (job) {
        const data = createInvoiceFromJob(job);
        setForm({
          customerId: data.customerId,
          status: 'draft',
          lineItems: data.lineItems,
          taxRate: String(data.taxRate),
          notes: data.notes || '',
          paymentTerms: data.paymentTerms || 'Due upon receipt',
          dueDate: defaultDueDate(),
        });
      }
    } else if (isNew && fromEstimate) {
      const est = getEstimateById(fromEstimate);
      if (est) {
        const data = createInvoiceFromEstimate(est);
        setForm({
          customerId: data.customerId,
          status: 'draft',
          lineItems: data.lineItems,
          taxRate: String(data.taxRate),
          notes: data.notes || '',
          paymentTerms: data.paymentTerms || 'Due upon receipt',
          dueDate: defaultDueDate(),
        });
      }
    } else if (!isNew && id) {
      const inv = getInvoiceById(id);
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber);
        setForm({
          customerId: inv.customerId,
          status: inv.status,
          lineItems: inv.lineItems,
          taxRate: String(inv.taxRate),
          notes: inv.notes || '',
          paymentTerms: inv.paymentTerms || 'Due upon receipt',
          dueDate: inv.dueDate?.split('T')[0] || defaultDueDate(),
        });
      }
    }
  }, [id, isNew, fromJob, fromEstimate]);

  const selectedCustomer = useMemo(
    () => form.customerId ? getCustomerById(form.customerId) : undefined,
    [form.customerId, getCustomerById]
  );

  const taxRate = parseFloat(form.taxRate) || 0;
  const totals = useMemo(
    () => calculateInvoiceTotals(form.lineItems, taxRate),
    [form.lineItems, taxRate]
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
    if (form.lineItems.length === 0) {
      Alert.alert('Error', 'Please add at least one line item');
      return;
    }

    const data = {
      customerId: form.customerId,
      status: form.status,
      lineItems: form.lineItems,
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
  const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() : 'Select Customer';
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

              {/* Customer Picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Customer *</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Open customer picker" style={styles.pickerBtn} onPress={() => setCustomerPickerVisible(true)}>
                  <Text style={[styles.pickerText, !form.customerId && styles.pickerPlaceholder]}>
                    {customerName}
                  </Text>
                </Pressable>
              </View>

              {/* Line Items */}
              <View style={styles.field}>
                <Text style={styles.label}>Line Items *</Text>
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
              </View>

              {/* Tax Rate */}
              <Field label="Tax Rate (%)" value={form.taxRate} onChange={setField('taxRate')} keyboardType="numeric" placeholder="0" />

              {/* Totals */}
              {form.lineItems.length > 0 && (
                <View style={styles.totalsBox}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Subtotal</Text>
                    <Text style={styles.totalsValue}>${totals.subtotal.toFixed(2)}</Text>
                  </View>
                  {taxRate > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>Tax ({taxRate}%)</Text>
                      <Text style={styles.totalsValue}>${totals.taxAmount.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.totalsRow, styles.totalRowFinal]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${totals.total.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              {/* Payment Terms */}
              <View style={styles.field}>
                <Text style={styles.label}>Payment Terms</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
                      key={term}
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

              <Field label="Due Date (YYYY-MM-DD)" value={form.dueDate} onChange={setField('dueDate')} />
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

              {/* Line Items Table */}
              {form.lineItems.length > 0 && (
                <View style={styles.field}>
                  <SectionTitle title="Line Items" />
                  {form.lineItems.map((li) => (
                    <View key={li.id} style={styles.viewLineItem}>
                      <View style={styles.viewLineItemLeft}>
                        <Text style={styles.viewLineItemName}>{li.name}</Text>
                        <Text style={styles.viewLineItemDetail}>{li.quantity} × ${li.unitPrice.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.viewLineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.totalsBox}>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>Subtotal</Text>
                      <Text style={styles.totalsValue}>${totals.subtotal.toFixed(2)}</Text>
                    </View>
                    {taxRate > 0 && (
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Tax ({taxRate}%)</Text>
                        <Text style={styles.totalsValue}>${totals.taxAmount.toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={[styles.totalsRow, styles.totalRowFinal]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>${totals.total.toFixed(2)}</Text>
                    </View>
                  </View>
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
