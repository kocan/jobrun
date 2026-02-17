import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList, Share } from 'react-native';
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
              {/* Invoice Number (view only) */}
              {!isNew && invoiceNumber ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Invoice Number</Text>
                  <Text style={styles.invoiceNumberText}>{invoiceNumber}</Text>
                </View>
              ) : null}

              {/* Customer Picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Customer *</Text>
                <Pressable style={styles.pickerBtn} onPress={() => setCustomerPickerVisible(true)}>
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
              </View>

              {/* Tax Rate */}
              <View style={styles.field}>
                <Text style={styles.label}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={form.taxRate}
                  onChangeText={setField('taxRate')}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

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
                <View style={styles.termsRow}>
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <Pressable
                      key={term}
                      style={[styles.termChip, form.paymentTerms === term && styles.termChipActive]}
                      onPress={() => setForm((f) => ({ ...f, paymentTerms: term }))}
                    >
                      <Text style={[styles.termChipText, form.paymentTerms === term && styles.termChipTextActive]}>
                        {term}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Due Date */}
              <Field label="Due Date (YYYY-MM-DD)" value={form.dueDate} onChange={setField('dueDate')} />

              {/* Notes */}
              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline placeholder="e.g. Thank you for your business" />

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isNew ? 'Create Invoice' : 'Save Changes'}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => isNew ? router.back() : setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[form.status] }]}>
                <Text style={styles.statusBadgeText}>{STATUS_LABELS[form.status]}</Text>
              </View>

              <InfoRow label="Invoice #" value={invoiceNumber} />
              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Payment Terms" value={form.paymentTerms} />
              <InfoRow label="Due Date" value={form.dueDate} />

              {/* Line Items Table */}
              {form.lineItems.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.sectionTitle}>Line Items</Text>
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
                  <Text style={styles.sectionTitle}>Share</Text>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]}
                    onPress={async () => {
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
                    }}
                  >
                    <Text style={styles.actionBtnText}>📤 Share Invoice</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                    onPress={async () => {
                      const inv = getInvoiceById(id!);
                      if (!inv) return;
                      const url = buildInvoiceShareUrl(inv, customerName);
                      try {
                        await Clipboard.setStringAsync(url);
                        Alert.alert('Copied', 'Invoice link copied to clipboard');
                      } catch {
                        Alert.alert('Link', url);
                      }
                    }}
                  >
                    <Text style={styles.actionBtnText}>🔗 Copy Link</Text>
                  </Pressable>
                </>
              )}

              {/* Status Actions */}
              <Text style={styles.sectionTitle}>Actions</Text>
              {form.status === 'draft' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={async () => {
                  await updateInvoice(id!, { status: 'sent' });
                  setForm((f) => ({ ...f, status: 'sent' }));
                }}>
                  <Text style={styles.actionBtnText}>✉ Mark as Sent</Text>
                </Pressable>
              )}
              {(form.status === 'sent' || form.status === 'viewed' || form.status === 'overdue') && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={handleMarkAsPaid}>
                  <Text style={styles.actionBtnText}>💰 Mark as Paid</Text>
                </Pressable>
              )}
              {(form.status === 'sent' || form.status === 'viewed') && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={async () => {
                  await updateInvoice(id!, { status: 'overdue' });
                  setForm((f) => ({ ...f, status: 'overdue' }));
                }}>
                  <Text style={styles.actionBtnText}>⚠ Mark Overdue</Text>
                </Pressable>
              )}
              {form.status !== 'paid' && form.status !== 'cancelled' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#9CA3AF' }]} onPress={async () => {
                  await updateInvoice(id!, { status: 'cancelled' });
                  setForm((f) => ({ ...f, status: 'cancelled' }));
                }}>
                  <Text style={styles.actionBtnText}>✕ Cancel Invoice</Text>
                </Pressable>
              )}
              {form.status === 'cancelled' && (
                <Pressable style={[styles.actionBtn, { backgroundColor: '#6B7280' }]} onPress={async () => {
                  await updateInvoice(id!, { status: 'draft' });
                  setForm((f) => ({ ...f, status: 'draft' }));
                }}>
                  <Text style={styles.actionBtnText}>↻ Revert to Draft</Text>
                </Pressable>
              )}

              {form.status === 'paid' && (
                <View style={styles.paidBanner}>
                  <Text style={styles.paidBannerText}>✓ Paid {getInvoiceById(id!)?.paidAt?.split('T')[0]}</Text>
                </View>
              )}

              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Invoice</Text>
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

function Field({
  label, value, onChange, multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
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
        placeholder={placeholder}
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
  invoiceNumberText: { fontSize: 18, fontWeight: '700', color: '#EA580C' },
  pickerBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, backgroundColor: '#F9FAFB',
  },
  pickerText: { fontSize: 16, color: '#111' },
  pickerPlaceholder: { color: '#999' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  termsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB',
  },
  termChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  termChipText: { fontSize: 14, color: '#666' },
  termChipTextActive: { color: '#fff', fontWeight: '600' },
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
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  paidBanner: { backgroundColor: '#D1FAE5', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  paidBannerText: { color: '#065F46', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  searchInput: {
    marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB',
  },
  pickerRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  pickerRowName: { fontSize: 17, color: '#111' },
  pickerRowSub: { fontSize: 14, color: '#666', marginTop: 2 },
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
  totalsBox: { marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 15, color: '#666' },
  totalsValue: { fontSize: 15, color: '#111' },
  totalRowFinal: { borderTopWidth: 2, borderTopColor: '#111', marginTop: 4, paddingTop: 8 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#111' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#111' },
  viewLineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  viewLineItemLeft: { flex: 1 },
  viewLineItemName: { fontSize: 16, color: '#111', fontWeight: '500' },
  viewLineItemDetail: { fontSize: 14, color: '#666', marginTop: 2 },
  viewLineItemTotal: { fontSize: 16, fontWeight: '600', color: '#111', marginLeft: 12 },
});
