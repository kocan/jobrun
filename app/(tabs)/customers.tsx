import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { useCustomers } from '../../contexts/CustomerContext';
import { filterCustomers } from '../../lib/storage/customers';

export default function CustomersScreen() {
  const { customers, loading, refreshCustomers } = useCustomers();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = useMemo(() => filterCustomers(customers, search), [customers, search]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof customers)[0] }) => (
      <Pressable style={styles.row} onPress={() => router.push(`/customer/${item.id}`)}>
        <View style={styles.rowLeft}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
          </Text>
          {item.phone ? <Text style={styles.detail}>{item.phone}</Text> : null}
          {item.email ? <Text style={styles.detail}>{item.email}</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    ),
    [router]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search customers..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onRefresh={refreshCustomers}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first customer</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/customer/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    margin: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    fontSize: 16,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: '#111' },
  detail: { fontSize: 14, color: '#666', marginTop: 2 },
  chevron: { fontSize: 22, color: '#CCC' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111' },
  emptySubtitle: { fontSize: 15, color: '#666', marginTop: 4 },
});
