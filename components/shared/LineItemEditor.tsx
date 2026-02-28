import { View, Text, TextInput, Pressable } from 'react-native';
import { LineItem } from '../../lib/types';
import { detailStyles } from '../../styles/detailScreen';

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
    <View style={detailStyles.field}>
      <Text style={detailStyles.label}>{label}{required ? ' *' : ''}</Text>
      {lineItems.map((li) => (
        <View key={li.id} style={detailStyles.lineItemRow}>
          <View style={detailStyles.lineItemInfo}>
            <Text style={detailStyles.lineItemName}>{li.name}</Text>
            <View style={detailStyles.lineItemControls}>
              <Text style={detailStyles.lineItemLabel}>Qty:</Text>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Quantity"
                style={detailStyles.lineItemQtyInput}
                value={String(li.quantity)}
                onChangeText={(v) => onUpdateItem(li.id, { quantity: parseInt(v) || 1 })}
                keyboardType="number-pad"
              />
              <Text style={detailStyles.lineItemLabel}>@ $</Text>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Unit price"
                style={detailStyles.lineItemPriceInput}
                value={String(li.unitPrice)}
                onChangeText={(v) => onUpdateItem(li.id, { unitPrice: parseFloat(v) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={detailStyles.lineItemRight}>
            <Text style={detailStyles.lineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove line item"
              style={detailStyles.lineItemRemoveButton}
              hitSlop={8}
              onPress={() => onRemoveItem(li.id)}
            >
              <Text style={detailStyles.lineItemRemove}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Add service line item" style={detailStyles.addServiceBtn} onPress={onAddService}>
        <Text style={detailStyles.addServiceBtnText}>+ Add Service</Text>
      </Pressable>
    </View>
  );
}

/** Read-only line items view for detail screens */
export function LineItemsView({ lineItems }: { lineItems: LineItem[] }) {
  return (
    <>
      {lineItems.map((li) => (
        <View key={li.id} style={detailStyles.viewLineItem}>
          <View style={detailStyles.viewLineItemLeft}>
            <Text style={detailStyles.viewLineItemName}>{li.name}</Text>
            <Text style={detailStyles.viewLineItemDetail}>{li.quantity} × ${li.unitPrice.toFixed(2)}</Text>
          </View>
          <Text style={detailStyles.viewLineItemTotal}>${(li.unitPrice * li.quantity).toFixed(2)}</Text>
        </View>
      ))}
    </>
  );
}
