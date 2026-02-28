import { View, Text } from 'react-native';
import { detailStyles } from '../../styles/detailScreen';

export function TotalsBox({
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
    <View style={detailStyles.totalsBox}>
      <View style={detailStyles.totalsRow}>
        <Text style={detailStyles.totalsLabel}>Subtotal</Text>
        <Text style={detailStyles.totalsValue}>${subtotal.toFixed(2)}</Text>
      </View>
      {taxRate > 0 && (
        <View style={detailStyles.totalsRow}>
          <Text style={detailStyles.totalsLabel}>Tax ({taxRate}%)</Text>
          <Text style={detailStyles.totalsValue}>${taxAmount.toFixed(2)}</Text>
        </View>
      )}
      <View style={[detailStyles.totalsRow, detailStyles.totalRowFinal]}>
        <Text style={detailStyles.totalLabel}>Total</Text>
        <Text style={detailStyles.totalValue}>${total.toFixed(2)}</Text>
      </View>
    </View>
  );
}
