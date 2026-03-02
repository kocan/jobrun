import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { useCustomers } from '../../contexts/CustomerContext';
import { filterCustomers } from '../../lib/db/repositories/customers';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';

export default function CustomersScreen() {
  const { customers, loading, refreshCustomers } = useCustomers();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { colors } = useTheme();

  const filtered = useMemo(() => filterCustomers(customers, search), [customers, search]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof customers)[0] }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View customer ${item.firstName} ${item.lastName}`}
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/customer/${item.id}`)}
      >
        <View style={styles.rowLeft}>
          <Text style={[styles.name, { color: colors.text }]}>
            {item.firstName} {item.lastName}
          </Text>
          {item.phone ? <Text style={[styles.detail, { color: colors.textMuted }]}>{item.phone}</Text> : null}
          {item.email ? <Text style={[styles.detail, { color: colors.textMuted }]}>{item.email}</Text> : null}
        </View>
        <Text style={[styles.chevron, { color: colors.gray300 }]}>›</Text>
      </Pressable>
    ),
    [router, colors]
  );

  if (loading) {
    return <LoadingState message="Loading customers..." accessibilityLabel="Loading customers" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TextInput
        accessibilityRole="search"
        accessibilityLabel="Search customers"
        style={[styles.search, { backgroundColor: colors.gray100, color: colors.text }]}
        placeholder="Search customers..."
        placeholderTextColor={colors.gray400}
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
              subtitle="Add your first customer — they'll appear here with their job history."
              ctaLabel="+ Add Customer"
            />
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add new customer"
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.black }]}
        onPress={() => router.push('/customer/new')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  detail: { fontSize: 14, marginTop: 2 },
  chevron: { fontSize: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  emptyContainer: { flexGrow: 1 },
});
