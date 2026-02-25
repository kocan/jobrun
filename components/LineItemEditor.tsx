import { View, Text, TextInput, Pressable } from 'react-native';
import { LineItem } from '../lib/types';
import { detailStyles as styles } from './DetailScreen';

interface LineItemEditorProps {
  lineItems: LineItem[];
  onUpdateItem: (id: string, updates: Partial<LineItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddService: () => void;
  label?: string;
  required?: boolean;
}

export function LineItemEditor({
  lineItems,
  onUpdateItem,
  onRemoveItem,
  onAddService,
  label = 'Line Items',
  required,
}: LineItemEditorProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      {lineItems.map((li) => (
        <View key={li.id} style={styles.lineItemRow}>
          <View style={styles.lineItemInfo}>
            <Text style={styles.lineItemName}>{li.name}</Text>
            <View style={styles.lineItemControls}>
              <Text style={styles.lineItemLabel}>Qty:</Text>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Quantity"
                style={styles.lineItemQtyInput}
                value={String(li.quantity)}
                onChangeText={(v) => onUpdateItem(li.id, { quantity: parseInt(v) || 1 })}
                keyboardType="number-pad"
              />
              <Text style={styles.lineItemLabel}>@ $</Text>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Unit price"
                style={styles.lineItemPriceInput}
                value={String(li.unitPrice)}
                onChangeText={(v) => onUpdateItem(li.id, { unitPrice: parseFloat(v) || 0 })}
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
              onPress={() => onRemoveItem(li.id)}
            >
              <Text style={styles.lineItemRemove}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Add service line item" style={styles.addServiceBtn} onPress={onAddService}>
        <Text style={styles.addServiceBtnText}>+ Add Service</Text>
      </Pressable>
    </View>
  );
}

/** Read-only line items view for detail screens */
export function LineItemsView({ lineItems }: { lineItems: LineItem[] }) {
  return (
    <>
      {lineItems.map((li) => (
        <View key={li.id} style={styles.viewLineItem}>
          <View style={styles.viewLineItemLeft}>
            <Text style={styles.viewLineItemName}>{li.name}</Text>
            <Text style={styles.viewLineItemDetail}>{li.quantity} × ${li.unitPrice.toFixed(2)}</Text>
          </View>
          <Text style={styles.viewLineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
        </View>
      ))}
    </>
  );
}

/** Totals display box */
export function TotalsView({
  subtotal,
  taxRate,
  taxAmount,
  total,
}: {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}) {
  return (
    <View style={styles.totalsBox}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>${subtotal.toFixed(2)}</Text>
      </View>
      {taxRate > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Tax ({taxRate}%)</Text>
          <Text style={styles.totalsValue}>${taxAmount.toFixed(2)}</Text>
        </View>
      )}
      <View style={[styles.totalsRow, styles.totalRowFinal]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
      </View>
    </View>
  );
}
