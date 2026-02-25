import { View, Text, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { detailStyles as styles } from './DetailScreen';
import { theme } from '../lib/theme';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: string;
}

interface TimePickerFieldProps {
  label: string;
  value: string; // HH:MM
  onChange: (value: string) => void;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTime(timeStr: string): Date {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Select date';
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return 'Select time';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function DatePickerField({ label, value, onChange, error }: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pick ${label}`}
        style={[styles.pickerBtn, error && styles.inputError]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {formatDisplayDate(value)}
        </Text>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {show && (
        <RNDateTimePicker
          value={value ? parseDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) onChange(formatDate(selected));
          }}
          themeVariant="light"
        />
      )}
    </View>
  );
}

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pick ${label}`}
        style={styles.pickerBtn}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {formatDisplayTime(value)}
        </Text>
      </Pressable>
      {show && (
        <RNDateTimePicker
          value={parseTime(value)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={15}
          onChange={(_, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) onChange(formatTime(selected));
          }}
          themeVariant="light"
        />
      )}
    </View>
  );
}
