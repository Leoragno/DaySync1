import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme } from '../../src/lib/theme';
import { confirmDelete, showAlert } from '../../src/lib/confirmDialog';
import SwipeableRow from '../../src/lib/SwipeableRow';
import { noteService, NoteDoc } from '../../src/services/noteService';
import { categoryService } from '../../src/services/categoryService';

export default function Appunti() {
  const [notes, setNotes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category_id: '' as string | null });

  const load = useCallback(async () => {
    try {
      const [n, c] = await Promise.all([noteService.getAll(), categoryService.getAll()]);
      setNotes(n);
      setCats(c);
    } catch (e) { console.log(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filterCat && n.category_id !== filterCat) return false;
      if (search && !(n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [notes, search, filterCat]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', content: '', category_id: null });
    setModal(true);
  };
  const openEdit = (n: any) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content, category_id: n.category_id || null });
    setModal(true);
  };
  const save = async () => {
    if (!form.title.trim()) { showAlert('Titolo obbligatorio'); return; }
    try {
      const payload: Partial<NoteDoc> = {
        title: form.title,
        content: form.content,
        category_id: form.category_id || undefined,
      };
      if (editing) payload.id = editing.id;
      
      await noteService.save(payload);
      setModal(false);
      load();
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante il salvataggio'); }
  };
  const del = async (id: string) => {
    try { await noteService.delete(id); load(); } catch (e: any) { showAlert('Errore', e.message || 'Errore durante l\'eliminazione'); }
  };

  const catOf = (id?: string) => cats.find((c) => c.id === id);

  return (
    <SafeAreaView style={styles.safe} testID="appunti-screen" edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Appunti</Text>
        <TouchableOpacity testID="add-note-btn" style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color={theme.colors.primaryFg} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textDim} />
        <TextInput testID="notes-search" style={styles.searchInput} placeholder="Cerca appunti..." placeholderTextColor={theme.colors.textDim} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <TouchableOpacity style={[styles.catChip, !filterCat && styles.catChipActive]} onPress={() => setFilterCat(null)}>
          <Text style={[styles.catChipText, !filterCat && styles.catChipTextActive]}>Tutte</Text>
        </TouchableOpacity>
        {cats.map((c) => (
          <TouchableOpacity key={c.id} style={[styles.catChip, filterCat === c.id && { backgroundColor: c.color + '30', borderColor: c.color }]} onPress={() => setFilterCat(c.id)}>
            <View style={[styles.catDot, { backgroundColor: c.color }]} />
            <Text style={styles.catChipText}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {filtered.length === 0 && <Text style={styles.empty}>Nessun appunto</Text>}
        {filtered.map((n) => {
          const c = catOf(n.category_id);
          const isOpen = expanded === n.id;
          return (
            <SwipeableRow key={n.id} onDelete={() => del(n.id)} testID={`note-swipe-${n.id}`}>
              <TouchableOpacity style={styles.noteCard} onPress={() => setExpanded(isOpen ? null : n.id)} testID={`note-card-${n.id}`}>
                <View style={styles.noteHead}>
                  <Text style={styles.noteTitle}>{n.title}</Text>
                  {c && <View style={[styles.catBadge, { backgroundColor: c.color + '20' }]}><Text style={[styles.catBadgeText, { color: c.color }]}>{c.name}</Text></View>}
                </View>
                <Text style={styles.noteContent} numberOfLines={isOpen ? undefined : 2}>{n.content}</Text>
                {isOpen && (
                  <View style={styles.noteActions}>
                    <TouchableOpacity onPress={() => openEdit(n)} style={styles.noteActionBtn}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                      <Text style={styles.noteActionText}>Modifica</Text>
                    </TouchableOpacity>
                    <Text style={styles.swipeHintInline}>← Scorri per eliminare</Text>
                  </View>
                )}
              </TouchableOpacity>
            </SwipeableRow>
          );
        })}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Modifica appunto' : 'Nuovo appunto'}</Text>
            <TextInput testID="note-title-input" style={styles.input} placeholder="Titolo" placeholderTextColor={theme.colors.textDim} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
            <TextInput testID="note-content-input" style={[styles.input, { height: 160, textAlignVertical: 'top', marginTop: 10 }]} placeholder="Contenuto..." placeholderTextColor={theme.colors.textDim} value={form.content} onChangeText={(t) => setForm({ ...form, content: t })} multiline />

            <Text style={styles.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity style={[styles.catChip, !form.category_id && styles.catChipActive]} onPress={() => setForm({ ...form, category_id: null })}>
                <Text style={[styles.catChipText, !form.category_id && styles.catChipTextActive]}>Nessuna</Text>
              </TouchableOpacity>
              {cats.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.catChip, form.category_id === c.id && { backgroundColor: c.color + '30', borderColor: c.color }]} onPress={() => setForm({ ...form, category_id: c.id })}>
                  <View style={[styles.catDot, { backgroundColor: c.color }]} />
                  <Text style={styles.catChipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setModal(false)}><Text style={styles.btnSecondaryText}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity testID="note-save-btn" style={styles.btnPrimary} onPress={save}><Text style={styles.btnPrimaryText}>Salva</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { ...theme.font.h2, color: theme.colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 20, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderSubtle, gap: 8 },
  searchInput: { flex: 1, color: theme.colors.text, paddingVertical: 12, fontSize: 14 },
  catScroll: { maxHeight: 50, marginTop: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, height: 36 },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { color: theme.colors.textMuted, fontSize: 13 },
  catChipTextActive: { color: theme.colors.primaryFg, fontWeight: '600' },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { color: theme.colors.textDim, textAlign: 'center', marginTop: 40 },
  noteCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  swipeHintInline: { color: theme.colors.textDim, fontSize: 11, marginLeft: 'auto' },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  noteContent: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  noteActions: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle },
  noteActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteActionText: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { ...theme.font.h2, color: theme.colors.text, marginBottom: 16 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, color: theme.colors.text, fontSize: 15 },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface2, alignItems: 'center' },
  btnSecondaryText: { color: theme.colors.text, fontWeight: '500' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.primaryFg, fontWeight: '600' },
});
