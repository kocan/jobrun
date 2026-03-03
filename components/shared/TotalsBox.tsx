import { View, Text } from 'react-native';
import { useDetailStyles } from '../../styles/detailScreen';

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
  const styles = useDetailStyles();
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
