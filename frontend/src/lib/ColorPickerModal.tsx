import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { theme } from './theme';

// Palette estesa (tipo "colori gradimento")
export const EXTENDED_PALETTE = [
  // Rossi
  '#ef4444', '#dc2626', '#b91c1c', '#f87171', '#fca5a5',
  // Arancioni
  '#f97316', '#ea580c', '#fb923c', '#fdba74',
  // Gialli
  '#f59e0b', '#eab308', '#fbbf24', '#fde047',
  // Verdi
  '#10b981', '#059669', '#22c55e', '#4ade80', '#86efac',
  // Ciano/Teal
  '#06b6d4', '#0891b2', '#14b8a6', '#2dd4bf',
  // Blu
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd',
  // Viola/Indaco
  '#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5', '#a78bfa',
  // Rosa/Magenta
  '#ec4899', '#db2777', '#f472b6', '#e879f9', '#d946ef',
  // Neutri
  '#64748b', '#475569', '#334155', '#71717a', '#3f3f46',
];

function isValidHex(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function ColorPickerModal({
  visible,
  initial,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initial?: string;
  onClose: () => void;
  onSelect: (color: string) => void;
}) {
  const [selected, setSelected] = useState(initial || EXTENDED_PALETTE[0]);
  const [hex, setHex] = useState(initial || '');

  const apply = () => {
    onSelect(selected);
    onClose();
  };

  const applyHex = () => {
    const v = hex.trim();
    const withHash = v.startsWith('#') ? v : '#' + v;
    if (isValidHex(withHash)) {
      setSelected(withHash);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.card} testID="color-picker-modal">
          <Text style={styles.title}>Scegli colore</Text>

          <View style={styles.previewRow}>
            <View style={[styles.preview, { backgroundColor: selected }]} />
            <Text style={styles.previewHex}>{selected.toUpperCase()}</Text>
          </View>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            <View style={styles.palette}>
              {EXTENDED_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dot, { backgroundColor: c }, selected === c && styles.dotActive]}
                  onPress={() => setSelected(c)}
                  testID={`color-swatch-${c}`}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Oppure inserisci codice HEX</Text>
          <View style={styles.hexRow}>
            <TextInput
              testID="hex-input"
              style={styles.hexInput}
              placeholder="#RRGGBB"
              placeholderTextColor={theme.colors.textDim}
              value={hex}
              onChangeText={setHex}
              autoCapitalize="none"
              maxLength={7}
            />
            <TouchableOpacity style={styles.hexBtn} onPress={applyHex}>
              <Text style={styles.hexBtnText}>Applica</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="color-confirm-btn" style={styles.btnPrimary} onPress={apply}>
              <Text style={styles.btnPrimaryText}>Conferma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  title: { ...theme.font.h2, color: theme.colors.text, marginBottom: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  preview: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  previewHex: { color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  dot: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
  dotActive: { borderColor: theme.colors.text },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  hexRow: { flexDirection: 'row', gap: 8 },
  hexInput: { flex: 1, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.text, fontSize: 14, fontFamily: 'monospace' },
  hexBtn: { paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.surface2, justifyContent: 'center' },
  hexBtnText: { color: theme.colors.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface2, alignItems: 'center' },
  btnSecondaryText: { color: theme.colors.text, fontWeight: '500' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.primaryFg, fontWeight: '600' },
});
