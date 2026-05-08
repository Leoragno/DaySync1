import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

// Native picker import only on native to avoid web bundling issues
// react-native-web is fine with conditional require at runtime

function pad(n: number) { return String(n).padStart(2, '0'); }

export function formatItalianDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${pad(d)}/${pad(m)}/${y}`;
}

// ---------- DATE ----------
export function DateField({ value, onChange, testID }: { value: string; onChange: (iso: string) => void; testID?: string }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    // Use native HTML input on web
    return (
      <View style={styles.webWrap}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} style={styles.webIcon} />
        {/* @ts-ignore react-native-web renders DOM elements for intrinsic tags */}
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID || 'date-field'}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.colors.text,
            fontSize: 15,
            padding: '14px 0',
            colorScheme: 'dark',
            fontFamily: 'inherit',
          }}
        />
      </View>
    );
  }

  const date = value ? new Date(value + 'T00:00:00') : new Date();
  const handleChange = (_event: any, selected?: Date) => {
    setShow(false);
    if (selected) {
      const iso = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`;
      onChange(iso);
    }
  };

  // Lazy load native picker
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} testID={testID || 'date-field'}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
        <Text style={styles.fieldText}>{value ? formatItalianDate(value) : 'Seleziona data'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
          themeVariant="dark"
        />
      )}
    </>
  );
}

// ---------- TIME ----------
export function TimeField({ value, onChange, testID, optional }: { value: string; onChange: (hhmm: string) => void; testID?: string; optional?: boolean }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrap}>
        <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} style={styles.webIcon} />
        {/* @ts-ignore */}
        <input
          type="time"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID || 'time-field'}
          step={60}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.colors.text,
            fontSize: 15,
            padding: '14px 0',
            colorScheme: 'dark',
            fontFamily: 'inherit',
          }}
        />
        {optional && value ? (
          <TouchableOpacity onPress={() => onChange('')} style={styles.webClear}>
            <Ionicons name="close" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const d = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }

  const handleChange = (_event: any, selected?: Date) => {
    setShow(false);
    if (selected) onChange(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <>
      <View style={styles.timeRow}>
        <TouchableOpacity style={[styles.field, { flex: 1 }]} onPress={() => setShow(true)} testID={testID || 'time-field'}>
          <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.fieldText}>{value || (optional ? 'Tutto il giorno' : 'Seleziona ora')}</Text>
        </TouchableOpacity>
        {optional && value ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChange('')}>
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {show && (
        <DateTimePicker
          value={d}
          mode="time"
          is24Hour
          display="default"
          onChange={handleChange}
          themeVariant="dark"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  fieldText: { color: theme.colors.text, fontSize: 15 },
  timeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  clearBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' },
  webWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14 },
  webIcon: {},
  webClear: { padding: 8 },
});
