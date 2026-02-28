import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { useCustomers } from '../../contexts/CustomerContext';
import { filterCustomers } from '../../lib/db/repositories/customers';
import { theme } from '../../lib/theme';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';

export default function CustomersScreen() {
  const { customers, loading, refreshCustomers } = useCustomers();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = useMemo(() => filterCustomers(customers, search), [customers, search]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof customers)[0] }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={`View customer ${item.name}`} style={styles.row} onPress={() => router.push(`/customer/${item.id}`)}>
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
    return <LoadingState message="Loading customers..." accessibilityLabel="Loading customers" />;
  }

  return (
    <View style={styles.container}>
      <TextInput accessibilityRole="text" accessibilityLabel="Text input"
        style={styles.search}
        placeholder="Search customers..."
        placeholderTextColor={theme.colors.gray400}
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
            <EmptyState
              icon="👥"
              title="No customers yet"
              subtitle="Tap + to add your first customer"
            />
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Add new item" style={styles.fab} onPress={() => router.push('/customer/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    margin: 16,
    padding: 12,
    backgroundColor: theme.colors.gray100,
    borderRadius: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  detail: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: theme.colors.gray300 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: theme.colors.white, fontSize: 28, lineHeight: 30 },
  emptyContainer: { flexGrow: 1 },
});
