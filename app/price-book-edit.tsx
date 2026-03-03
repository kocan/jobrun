import { View, Text, TextInput, ScrollView, Pressable, Switch, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { usePriceBook } from '../contexts/PriceBookContext';

type FormData = {
  name: string;
  description: string;
  price: string;
  estimatedDuration: string;
  category: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  price: '',
  estimatedDuration: '60',
  category: 'General',
  isActive: true,
};

export default function PriceBookEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { services, addService, updateService, deleteService } = usePriceBook();
  const isNew = id === 'new';

  const [form, setForm] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (!isNew && id) {
      const service = services.find((s) => s.id === id);
      if (service) {
        setForm({
          name: service.name,
          description: service.description || '',
          price: String(service.price),
          estimatedDuration: String(service.estimatedDuration),
          category: service.category,
          isActive: service.isActive,
        });
      }
    }
  }, [id, isNew, services]);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) return 'Price must be 0 or greater';
    const dur = parseInt(form.estimatedDuration);
    if (isNaN(dur) || dur <= 0) return 'Duration must be greater than 0';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Validation Error', err); return; }

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      estimatedDuration: parseInt(form.estimatedDuration),
      category: form.category.trim() || 'General',
      isActive: form.isActive,
      sortOrder: isNew ? services.length : (services.find((s) => s.id === id)?.sortOrder ?? 0),
    };

    if (isNew) {
      await addService(data);
    } else {
      await updateService(id!, data);
    }
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete Service', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteService(id!); router.back(); } },
    ]);
  };

  const setField = (key: keyof FormData) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New Service' : 'Edit Service' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Field label="Name *" value={form.name} onChange={setField('name')} autoFocus={isNew} />
          <Field label="Description" value={form.description} onChange={setField('description')} multiline />
          <Field label="Price ($) *" value={form.price} onChange={setField('price')} keyboardType="numeric" />
          <Field label="Duration (minutes) *" value={form.estimatedDuration} onChange={setField('estimatedDuration')} keyboardType="number-pad" />
          <Field label="Category" value={form.category} onChange={setField('category')} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch accessibilityRole="switch" accessibilityLabel="Toggle" value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} trackColor={{ true: '#EA580C' }} />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{isNew ? 'Add Service' : 'Save Changes'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          {!isNew && (
            <Pressable accessibilityRole="button" accessibilityLabel="Delete record" style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete Service</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label, value, onChange, multiline, autoFocus, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; autoFocus?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityRole="text" accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, fontSize: 16, color: '#111', backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  saveBtn: { backgroundColor: '#EA580C', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#666', fontSize: 17 },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#EF4444', fontSize: 17, fontWeight: '600' },
});
