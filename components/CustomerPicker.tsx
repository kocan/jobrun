import { View, Text, TextInput, Pressable, Modal, FlatList, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { Customer } from '../lib/types';
import { detailStyles as styles } from './DetailScreen';

interface CustomerPickerProps {
  visible: boolean;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export function CustomerPicker({ visible, customers, onSelect, onClose }: CustomerPickerProps) {
  const [search, setSearch] = useState('');

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

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleSelect = (customer: Customer) => {
    setSearch('');
    onSelect(customer);
  };

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
          placeholder="Search customers..."
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.firstName} ${item.lastName}`}
              style={styles.pickerRow}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.pickerRowName}>{item.firstName} {item.lastName}</Text>
              {item.phone ? <Text style={styles.pickerRowSub}>{item.phone}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
        />
      </View>
    </Modal>
  );
}
