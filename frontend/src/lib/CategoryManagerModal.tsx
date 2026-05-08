import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';
import ColorPickerModal, { EXTENDED_PALETTE } from './ColorPickerModal';
import { confirmDelete, showAlert } from './confirmDialog';
import { categoryService, CategoryDoc } from '../services/categoryService';

export default function CategoryManagerModal({ visible, onClose, onChanged }: { visible: boolean; onClose: () => void; onChanged: () => void }) {
  const [cats, setCats] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(EXTENDED_PALETTE[15]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    try { const data = await categoryService.getAll(); setCats(data); } catch (e) { console.log(e); }
  };
  useEffect(() => { if (visible) load(); }, [visible]);

  const add = async () => {
    if (!name.trim()) { showAlert('Nome categoria obbligatorio'); return; }
    try {
      await categoryService.save({ name: name.trim(), color });
      setName('');
      await load();
      onChanged();
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante il salvataggio'); }
  };

  const del = (id: string, n: string) => {
    confirmDelete('Elimina categoria?', n, async () => {
      try { await categoryService.delete(id); await load(); onChanged(); }
      catch (e: any) { showAlert('Errore', e.message || 'Errore durante l\'eliminazione'); }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.card} testID="category-manager-modal">
          <View style={styles.header}>
            <Text style={styles.title}>Gestione categorie</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.addRow}>
            <TextInput
              testID="category-name-input"
              style={styles.input}
              placeholder="Nome nuova categoria"
              placeholderTextColor={theme.colors.textDim}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity style={[styles.colorBtn, { backgroundColor: color }]} onPress={() => setPickerOpen(true)} testID="category-color-btn" />
            <TouchableOpacity style={styles.addBtn} onPress={add} testID="category-add-btn">
              <Ionicons name="add" size={22} color={theme.colors.primaryFg} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingTop: 12 }}>
            {cats.length === 0 && <Text style={styles.empty}>Nessuna categoria</Text>}
            {cats.map((c) => (
              <View key={c.id} style={styles.catRow} testID={`category-row-${c.id}`}>
                <View style={[styles.catDot, { backgroundColor: c.color }]} />
                <Text style={styles.catName}>{c.name}</Text>
                <TouchableOpacity onPress={() => del(c.id, c.name)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <ColorPickerModal
        visible={pickerOpen}
        initial={color}
        onClose={() => setPickerOpen(false)}
        onSelect={setColor}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  card: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { ...theme.font.h2, color: theme.colors.text },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.text, fontSize: 14 },
  colorBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: theme.colors.border },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.colors.textDim, textAlign: 'center', marginTop: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle, gap: 12 },
  catDot: { width: 14, height: 14, borderRadius: 7 },
  catName: { flex: 1, color: theme.colors.text, fontSize: 15 },
  delBtn: { padding: 6 },
});
