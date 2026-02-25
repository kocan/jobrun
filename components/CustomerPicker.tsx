import { View, Text, TextInput, Pressable, Modal, FlatList, Platform, Alert, KeyboardAvoidingView } from 'react-native';
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
  onAddCustomer?: (data: { firstName: string; lastName: string; phone?: string }) => Promise<Customer>;
}

export function CustomerPicker({ visible, customers, onSelect, onClose, onAddCustomer }: CustomerPickerProps) {
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (visible) {
      getRecentIds().then(setRecentIds);
    } else {
      setShowAddForm(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
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

  const handleAddCustomer = async () => {
    if (!newFirstName.trim()) {
      Alert.alert('Required', 'Please enter a first name');
      return;
    }
    if (!newLastName.trim()) {
      Alert.alert('Required', 'Please enter a last name');
      return;
    }
    if (!onAddCustomer) return;

    const customer = await onAddCustomer({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      phone: newPhone.trim() || undefined,
    });

    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setShowAddForm(false);
    setSearch('');
    addRecentId(customer.id);
    onSelect(customer);
  };

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalContainer, Platform.OS === 'android' && styles.modalContainerAndroid]}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close customer picker" onPress={handleClose}>
              <Text style={styles.headerBtn}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <View style={{ width: 50 }} />
          </View>

          {showAddForm ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 }}>
                New Customer
              </Text>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="First name"
                style={[styles.searchInput, { marginHorizontal: 0, marginBottom: 8 }]}
                placeholder="First Name *"
                value={newFirstName}
                onChangeText={setNewFirstName}
                autoFocus
                autoCapitalize="words"
              />
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Last name"
                style={[styles.searchInput, { marginHorizontal: 0, marginBottom: 8 }]}
                placeholder="Last Name *"
                value={newLastName}
                onChangeText={setNewLastName}
                autoCapitalize="words"
              />
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Phone number"
                style={[styles.searchInput, { marginHorizontal: 0, marginBottom: 12 }]}
                placeholder="Phone (optional)"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel add customer"
                  style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: theme.colors.gray200 }}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={{ fontSize: 16, color: theme.colors.gray500 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save new customer"
                  style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: theme.colors.primary }}
                  onPress={handleAddCustomer}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.white }}>Add & Select</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                accessibilityRole="text"
                accessibilityLabel="Search customers"
                style={styles.searchInput}
                placeholder="Search by name, email, or phone..."
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {onAddCustomer && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add new customer"
                  style={{ marginHorizontal: 16, marginBottom: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 8, borderStyle: 'dashed' }}
                  onPress={() => setShowAddForm(true)}
                >
                  <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>+ Add New Customer</Text>
                </Pressable>
              )}
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
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
