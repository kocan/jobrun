import { View, Text, TextInput, Pressable, Modal, FlatList, Platform } from 'react-native';
import { useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '../lib/types';
import { detailStyles as styles } from './DetailScreen';
import { theme } from '../lib/theme';

const RECENT_KEY = 'customer_picker_recent';
const MAX_RECENT = 5;

async function getRecentIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function addRecentId(id: string): Promise<void> {
  const ids = await getRecentIds();
  const next = [id, ...ids.filter((i) => i !== id)].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

interface CustomerPickerProps {
  visible: boolean;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export function CustomerPicker({ visible, customers, onSelect, onClose }: CustomerPickerProps) {
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      getRecentIds().then(setRecentIds);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    const phoneDigits = q.replace(/\D/g, '');
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (phoneDigits.length > 0 && c.phone ? c.phone.replace(/\D/g, '').includes(phoneDigits) : false)
    );
  }, [customers, search]);

  const recentCustomers = useMemo(() => {
    if (search.trim()) return [];
    return recentIds
      .map((id) => customers.find((c) => c.id === id))
      .filter((c): c is Customer => c != null);
  }, [recentIds, customers, search]);

  const nonRecentFiltered = useMemo(() => {
    if (search.trim()) return filtered;
    const recentSet = new Set(recentIds);
    return filtered.filter((c) => !recentSet.has(c.id));
  }, [filtered, recentIds, search]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleSelect = useCallback((customer: Customer) => {
    setSearch('');
    addRecentId(customer.id);
    onSelect(customer);
  }, [onSelect]);

  const renderItem = useCallback(({ item }: { item: Customer }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.firstName} ${item.lastName}`}
      style={styles.pickerRow}
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.pickerRowName}>{item.firstName} {item.lastName}</Text>
      {item.phone ? <Text style={styles.pickerRowSub}>{item.phone}</Text> : null}
    </Pressable>
  ), [handleSelect]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, Platform.OS === 'android' && styles.modalContainerAndroid]}>
        <View style={styles.modalHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close customer picker" onPress={handleClose}>
            <Text style={styles.headerBtn}>Close</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Select Customer</Text>
          <View style={{ width: 50 }} />
        </View>
        <TextInput
          accessibilityRole="text"
          accessibilityLabel="Search customers"
          style={styles.searchInput}
          placeholder="Search by name, email, or phone..."
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        <FlatList
          data={nonRecentFiltered}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ListHeaderComponent={recentCustomers.length > 0 ? (
            <View>
              <Text style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, fontSize: 12, fontWeight: '700', color: theme.colors.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>
                Recently Used
              </Text>
              {recentCustomers.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${c.firstName} ${c.lastName}`}
                  style={[styles.pickerRow, { backgroundColor: theme.colors.gray50 }]}
                  onPress={() => handleSelect(c)}
                >
                  <Text style={styles.pickerRowName}>{c.firstName} {c.lastName}</Text>
                  {c.phone ? <Text style={styles.pickerRowSub}>{c.phone}</Text> : null}
                </Pressable>
              ))}
              <Text style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 12, fontWeight: '700', color: theme.colors.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>
                All Customers
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={recentCustomers.length === 0 ? <Text style={styles.emptyText}>No customers found</Text> : null}
        />
      </View>
    </Modal>
  );
}
