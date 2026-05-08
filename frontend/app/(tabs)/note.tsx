import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme, NOTE_COLORS } from '../../src/lib/theme';
import ColorPickerModal from '../../src/lib/ColorPickerModal';
import { updateQuickNotesWidget } from '../../src/widgets/updateWidget';
import SwipeableRow from '../../src/lib/SwipeableRow';
import { quickNoteService, QuickNoteDoc } from '../../src/services/quickNoteService';

export default function Note() {
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [text, setText] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await quickNoteService.getAll();
      setItems(data);
      updateQuickNotesWidget(data);
    } catch (e) { console.log(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditing(null);
    setText('');
    setColor(NOTE_COLORS[0]);
    setModal(true);
  };
  const openEdit = (note: any) => {
    setEditing(note);
    setText(note.text);
    setColor(note.color || NOTE_COLORS[0]);
    setModal(true);
  };

  const save = async () => {
    if (!text.trim()) return;
    try {
      const payload: Partial<QuickNoteDoc> = { text, color };
      if (editing) payload.id = editing.id;
      
      await quickNoteService.save(payload);
      setText(''); setColor(NOTE_COLORS[0]); setEditing(null); setModal(false);
      load();
    } catch (e: any) { Alert.alert('Errore', e.message || 'Errore durante il salvataggio'); }
  };
  const del = async (id: string) => {
    try { await quickNoteService.delete(id); load(); } catch (e: any) { Alert.alert('Errore', e.message || 'Errore durante l\'eliminazione'); load(); }
  };

  return (
    <SafeAreaView style={styles.safe} testID="note-screen" edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Note rapide</Text>
          <Text style={styles.hint}>Scorri a sinistra per eliminare</Text>
        </View>
        <TouchableOpacity testID="add-quicknote-btn" style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color={theme.colors.primaryFg} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {items.length === 0 && <Text style={styles.empty}>Nessuna nota. Tocca + per crearne una.</Text>}
        {items.map((n) => (
          <SwipeableRow key={n.id} onDelete={() => del(n.id)} testID={`quicknote-swipe-${n.id}`}>
            <TouchableOpacity onPress={() => openEdit(n)} style={[styles.quickNote, { backgroundColor: n.color }]} testID={`quicknote-${n.id}`} activeOpacity={0.85}>
              <Text style={styles.quickText}>{n.text}</Text>
            </TouchableOpacity>
          </SwipeableRow>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Modifica nota' : 'Nuova nota'}</Text>
            <TextInput testID="quicknote-text-input" style={[styles.input, { height: 140, textAlignVertical: 'top' }]} placeholder="Scrivi qui..." placeholderTextColor={theme.colors.textDim} value={text} onChangeText={setText} multiline />

            <Text style={styles.label}>Colore</Text>
            <View style={styles.colorRow}>
              {NOTE_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} />
              ))}
              <TouchableOpacity onPress={() => setColorPickerOpen(true)} style={[styles.colorDot, styles.colorDotCustom]} testID="quicknote-custom-color-btn">
                <Ionicons name="color-palette-outline" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setModal(false)}><Text style={styles.btnSecondaryText}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity testID="quicknote-save-btn" style={styles.btnPrimary} onPress={save}><Text style={styles.btnPrimaryText}>Salva</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ColorPickerModal
        visible={colorPickerOpen}
        initial={color}
        onClose={() => setColorPickerOpen(false)}
        onSelect={setColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { ...theme.font.h2, color: theme.colors.text },
  hint: { color: theme.colors.textDim, fontSize: 12, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.colors.textDim, textAlign: 'center', marginTop: 40 },
  swipeWrap: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  swipeBg: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 140, backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  swipeText: { color: '#fff', fontWeight: '600' },
  quickNote: { borderRadius: 16, padding: 18, minHeight: 80 },
  quickText: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { ...theme.font.h2, color: theme.colors.text, marginBottom: 16 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, color: theme.colors.text, fontSize: 15 },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: theme.colors.text },
  colorDotCustom: { backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center', borderColor: theme.colors.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface2, alignItems: 'center' },
  btnSecondaryText: { color: theme.colors.text, fontWeight: '500' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.primaryFg, fontWeight: '600' },
});
