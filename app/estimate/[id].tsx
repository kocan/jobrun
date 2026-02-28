import { View, Text, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useEstimates } from '../../contexts/EstimateContext';
import { useJobs } from '../../contexts/JobContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { EstimateStatus } from '../../lib/types';
import { isValidEstimateStatusTransition, calculateEstimateTotals } from '../../lib/db/repositories/estimates';
import { buildShareUrl, buildShareMessage } from '../../lib/estimateSharing';
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
  taxRate: '0',
  notes: '',
  expiresAt: defaultExpiresAt(),
};

export default function EstimateDetailScreen() {
  const { id, customerId: preselectedCustomerId } = useLocalSearchParams<{ id: string; customerId?: string }>();
  const router = useRouter();
  const { getEstimateById, addEstimate, updateEstimate, deleteEstimate } = useEstimates();
  const { addJob } = useJobs();
  const { getInvoiceByJobId } = useInvoices();
  const { settings: appSettings } = useSettings();

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
    if (!isNew && id) {
      const est = getEstimateById(id);
      if (est) {
        setForm({
          customerId: est.customerId,
          status: est.status,
          taxRate: String(est.taxRate),
          notes: est.notes || '',
          expiresAt: est.expiresAt.split('T')[0],
        });
        setLineItemsRaw(est.lineItems);
      }
    }
  }, [id, isNew, getEstimateById]);

  const taxRate = parseFloat(form.taxRate) || 0;
  const totals = useMemo(
    () => calculateEstimateTotals(lineItems, taxRate),
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
            lineItems,
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

              <FormSectionHeader title="Notes" />
              <DatePickerField label="Expires" value={form.expiresAt} onChange={setField('expiresAt')} />
              <Field label="Notes / Terms" value={form.notes} onChange={setField('notes')} multiline placeholder="e.g. Estimate valid for 30 days" />

              <SaveButton label={isNew ? 'Create Estimate' : 'Save Changes'} onPress={handleSave} />
              <CancelButton onPress={() => isNew ? router.back() : setEditing(false)} />
            </>
          ) : (
            <>
              <StatusBadge label={STATUS_LABELS[form.status]} color={STATUS_COLORS[form.status]} />

              <InfoRow label="Customer" value={customerName} />

              {lineItems.length > 0 && (
                <View style={styles.field}>
                  <SectionTitle title="Line Items" />
                  <LineItemsView lineItems={lineItems} />
                  <TotalsView subtotal={totals.subtotal} taxRate={taxRate} taxAmount={totals.taxAmount} total={totals.total} />
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

      <ServicePickerModal
        visible={li.servicePickerVisible}
        services={li.activeServices}
        onSelect={li.handleServiceSelect}
        onClose={li.closeServicePicker}
      />
    </>
  );
}
