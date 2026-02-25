import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

/**
 * Shared components for Job / Estimate / Invoice detail screens.
 * Extracted to reduce duplication across the three detail views.
 */

/* ── InfoRow (read-only detail) ────────────────────────── */

export function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={detailStyles.infoRow}>
      <Text style={detailStyles.infoLabel}>{label}</Text>
      <Text style={detailStyles.infoValue}>{value}</Text>
    </View>
  );
}

/* ── Field (editable text input) ───────────────────────── */

export function Field({
  label,
  value,
  onChange,
  multiline,
  autoFocus,
  keyboardType,
  autoCapitalize,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  placeholder?: string;
}) {
  return (
    <View style={detailStyles.field}>
      <Text style={detailStyles.label}>{label}</Text>
      <TextInput
        accessibilityRole="text"
        accessibilityLabel="Text input"
        style={[detailStyles.input, multiline && detailStyles.inputMultiline, error && detailStyles.inputError]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray400}
      />
      {error ? <Text style={detailStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ── StatusBadge ───────────────────────────────────────── */

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[detailStyles.statusBadge, { backgroundColor: color }]}>
      <Text style={detailStyles.statusBadgeText}>{label}</Text>
    </View>
  );
}

/* ── ActionButton ──────────────────────────────────────── */

export function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={[detailStyles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={detailStyles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ── SectionTitle ──────────────────────────────────────── */

export function SectionTitle({ title }: { title: string }) {
  return <Text style={detailStyles.sectionTitle}>{title}</Text>;
}

/* ── SaveButton / CancelButton ─────────────────────────── */

export function SaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={detailStyles.saveBtn} onPress={onPress}>
      <Text style={detailStyles.saveBtnText}>{label}</Text>
    </Pressable>
  );
}

export function CancelButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" style={detailStyles.cancelBtn} onPress={onPress}>
      <Text style={detailStyles.cancelBtnText}>Cancel</Text>
    </Pressable>
  );
}

export function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete record" style={detailStyles.deleteBtn} onPress={onPress}>
      <Text style={detailStyles.deleteBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ── Shared styles ─────────────────────────────────────── */

export const detailStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.white },
  content: { padding: 16, paddingBottom: 40 },
  headerBtn: { color: theme.colors.primary, fontSize: 17, fontWeight: '600' },

  // Fields
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.gray500, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: theme.colors.gray300, borderRadius: 8,
    padding: 12, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.gray50,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#DC2626' },
  fieldError: { color: '#DC2626', fontSize: 13, marginTop: 6 },

  // Picker button
  pickerBtn: {
    borderWidth: 1, borderColor: theme.colors.gray300, borderRadius: 8,
    padding: 12, backgroundColor: theme.colors.gray50,
  },
  pickerText: { fontSize: 16, color: theme.colors.text },
  pickerPlaceholder: { color: theme.colors.gray400 },

  // Info rows (read-only)
  infoRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.gray200 },
  infoLabel: { fontSize: 13, color: theme.colors.gray500, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 17, color: theme.colors.text },

  // Status badge
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusBadgeText: { color: theme.colors.white, fontSize: 14, fontWeight: '600' },

  // Section title
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 24, marginBottom: 12 },

  // Buttons
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: theme.colors.white, fontSize: 17, fontWeight: '600' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: theme.colors.gray500, fontSize: 17 },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 24 },
  deleteBtnText: { color: '#EF4444', fontSize: 17, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: theme.colors.white, paddingTop: 60 },
  modalContainerAndroid: { paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  searchInput: {
    marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.gray300,
    borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: theme.colors.gray50,
  },
  pickerRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.gray200 },
  pickerRowName: { fontSize: 17, color: theme.colors.text },
  pickerRowSub: { fontSize: 14, color: theme.colors.gray500, marginTop: 2 },
  emptyText: { textAlign: 'center', padding: 24, color: theme.colors.gray400, fontSize: 16 },

  // Line items
  lineItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.gray200,
  },
  lineItemInfo: { flex: 1 },
  lineItemName: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  lineItemControls: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  lineItemLabel: { fontSize: 14, color: theme.colors.gray500, marginRight: 4 },
  lineItemQtyInput: {
    borderWidth: 1, borderColor: theme.colors.gray300, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, width: 48, fontSize: 14, textAlign: 'center', marginRight: 8,
  },
  lineItemPriceInput: {
    borderWidth: 1, borderColor: theme.colors.gray300, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, width: 72, fontSize: 14, textAlign: 'right',
  },
  lineItemRight: { alignItems: 'flex-end', marginLeft: 12 },
  lineItemTotal: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  lineItemRemoveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lineItemRemove: { fontSize: 18, color: '#EF4444' },
  addServiceBtn: {
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary,
    borderRadius: 8, borderStyle: 'dashed', marginTop: 8,
  },
  addServiceBtnText: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },

  // Totals
  totalsBox: { marginTop: 12, backgroundColor: theme.colors.gray50, borderRadius: 8, padding: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 15, color: theme.colors.gray500 },
  totalsValue: { fontSize: 15, color: theme.colors.text },
  totalRowFinal: { borderTopWidth: 2, borderTopColor: theme.colors.text, marginTop: 4, paddingTop: 8 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  totalValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

  // View line items (read-only)
  viewLineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.gray200,
  },
  viewLineItemLeft: { flex: 1 },
  viewLineItemName: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  viewLineItemDetail: { fontSize: 14, color: theme.colors.gray500, marginTop: 2 },
  viewLineItemTotal: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginLeft: 12 },
});
