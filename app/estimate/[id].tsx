import { View, Text, TextInput, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import { useEstimates } from '../../contexts/EstimateContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useJobs } from '../../contexts/JobContext';
import { usePriceBook } from '../../contexts/PriceBookContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { EstimateStatus, LineItem } from '../../lib/types';
import { isValidEstimateStatusTransition, calculateEstimateTotals } from '../../lib/db/repositories/estimates';
import { buildShareUrl, buildShareMessage } from '../../lib/estimateSharing';
import { useSettings } from '../../contexts/SettingsContext';
import {
  InfoRow, Field, StatusBadge, ActionButton, SectionTitle,
  SaveButton, CancelButton, DeleteButton, detailStyles as styles,
} from '../../components/DetailScreen';

const STATUS_LABELS: Record<EstimateStatus, string> = {
  'draft': 'Draft',
  'sent': 'Sent',
  'viewed': 'Viewed',
  'accepted': 'Accepted',
  'declined': 'Declined',
  'expired': 'Expired',
};
const STATUS_COLORS: Record<EstimateStatus, string> = {
  'draft': '#6B7280',
  'sent': '#3B82F6',
  'viewed': '#8B5CF6',
  'accepted': '#10B981',
  'declined': '#EF4444',
  'expired': '#F59E0B',
};

type FormData = {
  customerId: string;
  status: EstimateStatus;
  lineItems: LineItem[];
  taxRate: string;
  notes: string;
  expiresAt: string;
};

function defaultExpiresAt(): string {
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
  expiresAt: defaultExpiresAt(),
};

export default function EstimateDetailScreen() {
  const { id, customerId: preselectedCustomerId } = useLocalSearchParams<{ id: string; customerId?: string }>();
  const router = useRouter();
  const { getEstimateById, addEstimate, updateEstimate, deleteEstimate } = useEstimates();
  const { customers, getCustomerById } = useCustomers();
  const { addJob } = useJobs();
  const { getActiveServices } = usePriceBook();
  const { getInvoiceByJobId } = useInvoices();
  const { settings: appSettings } = useSettings();
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    customerId: preselectedCustomerId || '',
  }));

  useEffect(() => {
    if (!isNew && id) {
      const est = getEstimateById(id);
      if (est) {
        setForm({
          customerId: est.customerId,
          status: est.status,
          lineItems: est.lineItems,
          taxRate: String(est.taxRate),
          notes: est.notes || '',
          expiresAt: est.expiresAt.split('T')[0],
        });
      }
    }
  }, [id, isNew, getEstimateById]);

  const selectedCustomer = useMemo(
    () => form.customerId ? getCustomerById(form.customerId) : undefined,
    [form.customerId, getCustomerById]
  );

  const taxRate = parseFloat(form.taxRate) || 0;
  const totals = useMemo(
    () => calculateEstimateTotals(form.lineItems, taxRate),
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
      expiresAt: form.expiresAt,
    };

    if (isNew) {
      await addEstimate(data as any);
      router.back();
    } else {
      await updateEstimate(id!, data);
      setEditing(false);
    }
  };

  const handleStatusChange = async (newStatus: EstimateStatus) => {
    const est = getEstimateById(id!);
    if (!est) return;
    if (!isValidEstimateStatusTransition(est.status, newStatus)) {
      Alert.alert('Invalid', `Cannot change from ${STATUS_LABELS[est.status]} to ${STATUS_LABELS[newStatus]}`);
      return;
    }
    await updateEstimate(id!, { status: newStatus });
    setForm((f) => ({ ...f, status: newStatus }));
  };

  const handleConvertToJob = async () => {
    Alert.alert('Convert to Job', 'Create a new job from this estimate?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert',
        onPress: async () => {
          const job = await addJob({
            customerId: form.customerId,
            title: `Job from Estimate`,
            status: 'scheduled',
            scheduledDate: new Date().toISOString().split('T')[0],
            lineItems: form.lineItems,
            total: totals.total,
            photos: [],
            estimateId: id!,
          } as any);
          await updateEstimate(id!, { jobId: job.id });
          router.push({ pathname: '/job/[id]', params: { id: job.id } });
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Estimate', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEstimate(id!);
          router.back();
        },
      },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() : 'Select Customer';
  const title = isNew ? 'New Estimate' : editing ? 'Edit Estimate' : 'Estimate';

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

              <Field label="Expires (YYYY-MM-DD)" value={form.expiresAt} onChange={setField('expiresAt')} />
              <Field label="Notes / Terms" value={form.notes} onChange={setField('notes')} multiline placeholder="e.g. Estimate valid for 30 days" />

              <SaveButton label={isNew ? 'Create Estimate' : 'Save Changes'} onPress={handleSave} />
              <CancelButton onPress={() => isNew ? router.back() : setEditing(false)} />
            </>
          ) : (
            <>
              <StatusBadge label={STATUS_LABELS[form.status]} color={STATUS_COLORS[form.status]} />

              <InfoRow label="Customer" value={customerName} />

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

              <InfoRow label="Expires" value={form.expiresAt} />
              <InfoRow label="Notes" value={form.notes} />

              {/* Share Actions */}
              {(form.status === 'draft' || form.status === 'sent') && (
                <>
                  <SectionTitle title="Share" />
                  <ActionButton label="📤 Share Estimate" color="#7C3AED" onPress={async () => {
                    const est = getEstimateById(id!);
                    if (!est) return;
                    const message = buildShareMessage(est, customerName, appSettings.businessName || undefined);
                    try {
                      await Share.share({ message });
                      if (est.status === 'draft') {
                        await updateEstimate(id!, { status: 'sent' });
                        setForm((f) => ({ ...f, status: 'sent' }));
                      }
                    } catch {}
                  }} />
                  <ActionButton label="🔗 Copy Link" color="#6B7280" onPress={async () => {
                    const est = getEstimateById(id!);
                    if (!est) return;
                    const url = buildShareUrl(est, customerName);
                    try {
                      await Clipboard.setStringAsync(url);
                      Alert.alert('Copied', 'Estimate link copied to clipboard');
                    } catch {
                      Alert.alert('Link', url);
                    }
                  }} />
                </>
              )}

              <SectionTitle title="Actions" />
              {form.status === 'draft' && (
                <ActionButton label="✉ Mark as Sent" color="#3B82F6" onPress={() => handleStatusChange('sent')} />
              )}
              {form.status === 'sent' && (
                <>
                  <ActionButton label="✓ Mark Accepted" color="#10B981" onPress={() => handleStatusChange('accepted')} />
                  <ActionButton label="✕ Mark Declined" color="#EF4444" onPress={() => handleStatusChange('declined')} />
                </>
              )}
              {form.status === 'accepted' && !getEstimateById(id!)?.jobId && (
                <ActionButton label="🔧 Convert to Job" color="#EA580C" onPress={handleConvertToJob} />
              )}
              {form.status === 'accepted' && (
                <ActionButton label="📄 Create Invoice" color="#7C3AED" onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: 'new', fromEstimate: id } })} />
              )}
              {(form.status === 'declined' || form.status === 'expired') && (
                <ActionButton label="↻ Revert to Draft" color="#6B7280" onPress={() => handleStatusChange('draft')} />
              )}

              <DeleteButton label="Delete Estimate" onPress={handleDelete} />
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
