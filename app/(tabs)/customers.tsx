import { View, Text, StyleSheet } from 'react-native';

export default function CustomersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customers</Text>
      <Text style={styles.subtitle}>Your customer list will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#EA580C' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
});
