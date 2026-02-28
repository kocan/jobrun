import { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useCustomers } from '../contexts/CustomerContext';
import { CustomerPicker } from './CustomerPicker';
import { detailStyles as styles } from './DetailScreen';

interface CustomerPickerFieldProps {
  customerId: string;
  onSelect: (customerId: string) => void;
  error?: string;
}

/**
 * Self-contained customer picker field + modal.
 * Manages its own modal visibility and renders the picker button with label.
 */
export function CustomerPickerField({ customerId, onSelect, error }: CustomerPickerFieldProps) {
  const { customers, getCustomerById, addCustomer } = useCustomers();
  const [visible, setVisible] = useState(false);

  const selectedCustomer = useMemo(
    () => (customerId ? getCustomerById(customerId) : undefined),
    [customerId, getCustomerById],
  );

  const customerName = selectedCustomer
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
    : 'Select Customer';

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Customer *</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open customer picker"
          style={[styles.pickerBtn, error && styles.inputError]}
          onPress={() => setVisible(true)}
        >
          <Text style={[styles.pickerText, !customerId && styles.pickerPlaceholder]}>
            {customerName}
          </Text>
        </Pressable>
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>

      <CustomerPicker
        visible={visible}
        customers={customers}
        onSelect={(c) => {
          onSelect(c.id);
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
        onAddCustomer={async (data) => addCustomer(data)}
      />
    </>
  );
}

/**
 * Returns the display name for a customer id, or the fallback.
 */
export function useCustomerName(customerId: string, fallback = 'Select Customer') {
  const { getCustomerById } = useCustomers();
  return useMemo(() => {
    if (!customerId) return fallback;
    const c = getCustomerById(customerId);
    return c ? `${c.firstName} ${c.lastName}`.trim() : fallback;
  }, [customerId, getCustomerById, fallback]);
}
