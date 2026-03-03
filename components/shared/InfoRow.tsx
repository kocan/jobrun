import { View, Text } from 'react-native';
import { useDetailStyles } from '../../styles/detailScreen';

export function InfoRow({ label, value }: { label: string; value?: string }) {
  const styles = useDetailStyles();
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
