import { StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

export const detailStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.white },
  content: { padding: 16, paddingBottom: 40 },

  // Form section header
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  formSectionLine: { flex: 1, height: 1, backgroundColor: theme.colors.gray200 },
  formSectionText: { paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: theme.colors.gray400, textTransform: 'uppercase', letterSpacing: 1 },
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
