import { StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { ThemeColors } from '../lib/theme';
import { useTheme } from '../contexts/ThemeContext';

export function createDetailStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: 16, paddingBottom: 40 },

    // Form section header
    formSectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 },
    formSectionLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
    formSectionText: { paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 1 },
    headerBtn: { color: colors.primary, fontSize: 17, fontWeight: '600' },

    // Fields
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.gray500, marginBottom: 6, textTransform: 'uppercase' },
    input: {
      borderWidth: 1, borderColor: colors.gray300, borderRadius: 8,
      padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.gray50,
    },
    inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
    inputError: { borderColor: '#DC2626' },
    fieldError: { color: '#DC2626', fontSize: 13, marginTop: 6 },

    // Picker button
    pickerBtn: {
      borderWidth: 1, borderColor: colors.gray300, borderRadius: 8,
      padding: 12, backgroundColor: colors.gray50,
    },
    pickerText: { fontSize: 16, color: colors.text },
    pickerPlaceholder: { color: colors.gray400 },

    // Info rows (read-only)
    infoRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray200 },
    infoLabel: { fontSize: 13, color: colors.gray500, textTransform: 'uppercase', marginBottom: 4 },
    infoValue: { fontSize: 17, color: colors.text },

    // Status badge
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
    statusBadgeText: { color: colors.white, fontSize: 14, fontWeight: '600' },

    // Section title
    sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 12 },

    // Buttons
    actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    actionBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: colors.white, fontSize: 17, fontWeight: '600' },
    cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
    cancelBtnText: { color: colors.gray500, fontSize: 17 },
    deleteBtn: { padding: 16, alignItems: 'center', marginTop: 24 },
    deleteBtnText: { color: '#EF4444', fontSize: 17, fontWeight: '600' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: colors.surface, paddingTop: 60 },
    modalContainerAndroid: { paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    searchInput: {
      marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.gray300,
      borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.gray50,
    },
    pickerRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray200 },
    pickerRowName: { fontSize: 17, color: colors.text },
    pickerRowSub: { fontSize: 14, color: colors.gray500, marginTop: 2 },
    emptyText: { textAlign: 'center', padding: 24, color: colors.gray400, fontSize: 16 },

    // Line items
    lineItemRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray200,
    },
    lineItemInfo: { flex: 1 },
    lineItemName: { fontSize: 16, color: colors.text, fontWeight: '500' },
    lineItemControls: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    lineItemLabel: { fontSize: 14, color: colors.gray500, marginRight: 4 },
    lineItemQtyInput: {
      borderWidth: 1, borderColor: colors.gray300, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 4, width: 48, fontSize: 14, textAlign: 'center', marginRight: 8,
      color: colors.text,
    },
    lineItemPriceInput: {
      borderWidth: 1, borderColor: colors.gray300, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 4, width: 72, fontSize: 14, textAlign: 'right',
      color: colors.text,
    },
    lineItemRight: { alignItems: 'flex-end', marginLeft: 12 },
    lineItemTotal: { fontSize: 16, fontWeight: '600', color: colors.text },
    lineItemRemoveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    lineItemRemove: { fontSize: 18, color: '#EF4444' },
    addServiceBtn: {
      paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.primary,
      borderRadius: 8, borderStyle: 'dashed', marginTop: 8,
    },
    addServiceBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },

    // Totals
    totalsBox: { marginTop: 12, backgroundColor: colors.gray50, borderRadius: 8, padding: 12 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    totalsLabel: { fontSize: 15, color: colors.gray500 },
    totalsValue: { fontSize: 15, color: colors.text },
    totalRowFinal: { borderTopWidth: 2, borderTopColor: colors.text, marginTop: 4, paddingTop: 8 },
    totalLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: '700', color: colors.text },

    // View line items (read-only)
    viewLineItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray200,
    },
    viewLineItemLeft: { flex: 1 },
    viewLineItemName: { fontSize: 16, color: colors.text, fontWeight: '500' },
    viewLineItemDetail: { fontSize: 14, color: colors.gray500, marginTop: 2 },
    viewLineItemTotal: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 12 },
  });
}

export function useDetailStyles() {
  const { colors } = useTheme();
  return useMemo(() => createDetailStyles(colors), [colors]);
}
