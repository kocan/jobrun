import { View, Text, TextInput } from 'react-native';
import { theme } from '../../lib/theme';
import { useDetailStyles } from '../../styles/detailScreen';

export function Field({
  label,
  value,
  onChange,
  multiline,
  autoFocus,
  keyboardType,
  autoCapitalize,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  placeholder?: string;
}) {
  const styles = useDetailStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityRole="text"
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray400}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
