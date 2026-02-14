import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useCustomers } from '../../contexts/CustomerContext';
import { Customer } from '../../lib/types';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
};

function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-\+\(\)\.]{7,}$/.test(phone);
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCustomerById, addCustomer, updateCustomer, deleteCustomer } = useCustomers();

  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (!isNew && id) {
      const customer = getCustomerById(id);
      if (customer) {
        setForm({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          zip: customer.zip || '',
          notes: customer.notes || '',
        });
      }
    }
  }, [id, isNew, getCustomerById]);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!validateEmail(form.email)) e.email = 'Invalid email format';
    if (!validatePhone(form.phone)) e.phone = 'Invalid phone format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const data = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zip: form.zip.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (isNew) {
      await addCustomer(data);
      router.back();
    } else {
      await updateCustomer(id!, data);
      setEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Customer', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomer(id!);
          router.back();
        },
      },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const title = isNew ? 'New Customer' : editing ? 'Edit Customer' : `${form.firstName} ${form.lastName}`;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            !isNew && !editing ? (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.headerBtn}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {editing ? (
            <>
              <Field label="First Name *" value={form.firstName} onChange={setField('firstName')} error={errors.firstName} autoFocus={isNew} />
              <Field label="Last Name" value={form.lastName} onChange={setField('lastName')} />
              <Field label="Email" value={form.email} onChange={setField('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Phone" value={form.phone} onChange={setField('phone')} error={errors.phone} keyboardType="phone-pad" />
              <Field label="Address" value={form.address} onChange={setField('address')} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Field label="City" value={form.city} onChange={setField('city')} />
                </View>
                <View style={{ width: 80, marginLeft: 12 }}>
                  <Field label="State" value={form.state} onChange={setField('state')} autoCapitalize="characters" />
                </View>
                <View style={{ width: 90, marginLeft: 12 }}>
                  <Field label="ZIP" value={form.zip} onChange={setField('zip')} keyboardType="number-pad" />
                </View>
              </View>
              <Field label="Notes" value={form.notes} onChange={setField('notes')} multiline />

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isNew ? 'Add Customer' : 'Save Changes'}</Text>
              </Pressable>
              {!isNew && (
                <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <InfoRow label="Name" value={`${form.firstName} ${form.lastName}`.trim()} />
              <InfoRow label="Email" value={form.email} />
              <InfoRow label="Phone" value={form.phone} />
              <InfoRow label="Address" value={[form.address, form.city, form.state, form.zip].filter(Boolean).join(', ')} />
              <InfoRow label="Notes" value={form.notes} />

              <Text style={styles.sectionTitle}>Recent Jobs</Text>
              <Text style={styles.placeholder}>No jobs yet</Text>

              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Customer</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  multiline,
  autoFocus,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  headerBtn: { color: '#EA580C', fontSize: 17, fontWeight: '600' },
  row: { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444' },
  error: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  saveBtn: {
    backgroundColor: '#EA580C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#666', fontSize: 17 },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 24 },
  deleteBtnText: { color: '#EF4444', fontSize: 17, fontWeight: '600' },
  infoRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  infoLabel: { fontSize: 13, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 17, color: '#111' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 24, marginBottom: 12 },
  placeholder: { fontSize: 15, color: '#999', fontStyle: 'italic' },
});
