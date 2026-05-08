import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme, DAYS_SHORT, CATEGORY_COLORS } from '../../src/lib/theme';
import { TimeField } from '../../src/lib/DateTimeFields';
import ColorPickerModal from '../../src/lib/ColorPickerModal';
import { confirmDelete, showAlert } from '../../src/lib/confirmDialog';
import { updateScheduleWidget } from '../../src/widgets/updateWidget';
import { scheduleService, ScheduleDoc } from '../../src/services/scheduleService';
import { categoryService } from '../../src/services/categoryService';

const START_HOUR = 7;
const END_HOUR = 22; // 22:00 end
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const HOUR_HEIGHT = 60;
const CELL_W = 96;

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Orario() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [form, setForm] = useState({ title: '', day_of_week: 0, start_time: '08:00', end_time: '09:00', color: CATEGORY_COLORS[0], category_id: '' as string | null });

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([scheduleService.getAll(), categoryService.getAll()]);
      setItems(s);
      setCategories(c);
      updateScheduleWidget(s);
    } catch (e) { console.log(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', day_of_week: 0, start_time: '08:00', end_time: '09:00', color: CATEGORY_COLORS[0], category_id: null });
    setModal(true);
  };
  const openEdit = (it: any) => {
    setEditing(it);
    setForm({
      title: it.title,
      day_of_week: it.day_of_week,
      start_time: it.start_time,
      end_time: it.end_time,
      color: it.color || CATEGORY_COLORS[0],
      category_id: it.category_id || null,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) { showAlert('Titolo obbligatorio'); return; }
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      showAlert('Orario non valido', 'L\'ora di fine deve essere dopo l\'ora di inizio');
      return;
    }
    try {
      const payload: Partial<ScheduleDoc> = {
        title: form.title,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        color: form.color,
        category_id: form.category_id || undefined,
      };
      if (editing) payload.id = editing.id;
      
      await scheduleService.save(payload);
      setModal(false);
      load();
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante il salvataggio'); }
  };

  const del = async () => {
    if (!editing) return;
    try {
      await scheduleService.delete(editing.id);
      setModal(false);
      load();
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante l\'eliminazione'); }
  };

  return (
    <SafeAreaView style={styles.safe} testID="orario-screen" edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orario</Text>
        <TouchableOpacity testID="add-schedule-btn" style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color={theme.colors.primaryFg} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.grid}>
          {/* Header giorni */}
          <View style={styles.headerRow}>
            <View style={styles.hourCol} />
            {DAYS_SHORT.map((d, i) => (
              <View key={i} style={[styles.dayHeader, { width: CELL_W }]}>
                <Text style={styles.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', height: HOURS.length * HOUR_HEIGHT }}>
              {/* Colonna ore */}
              <View style={[styles.hourCol, { height: HOURS.length * HOUR_HEIGHT }]}>
                {HOURS.map((h) => (
                  <View key={h} style={{ height: HOUR_HEIGHT, alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2, paddingRight: 6 }}>
                    <Text style={styles.hourText}>{String(h).padStart(2, '0')}:00</Text>
                  </View>
                ))}
              </View>

              {/* Colonne giorni */}
              {DAYS_SHORT.map((_, dIdx) => {
                const dayItems = items.filter((it) => it.day_of_week === dIdx);
                return (
                  <View key={dIdx} style={[styles.dayCol, { width: CELL_W }]}>
                    {/* Linee orarie di sfondo */}
                    {HOURS.map((h) => (
                      <View key={h} style={[styles.hourLine, { top: (h - START_HOUR) * HOUR_HEIGHT }]} />
                    ))}

                    {/* Attività posizionate */}
                    {dayItems.map((it) => {
                      const sMin = timeToMinutes(it.start_time);
                      const eMin = timeToMinutes(it.end_time);
                      const topMin = sMin - START_HOUR * 60;
                      const heightMin = eMin - sMin;
                      if (topMin < 0 || topMin >= HOURS.length * 60) return null;
                      const top = (topMin / 60) * HOUR_HEIGHT;
                      const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 28);
                      const color = it.color || theme.colors.info;
                      return (
                        <TouchableOpacity
                          key={it.id}
                          onPress={() => openEdit(it)}
                          activeOpacity={0.75}
                          style={[styles.cellItem, { top, height, backgroundColor: color + '28', borderLeftColor: color }]}
                          testID={`schedule-${it.id}`}
                        >
                          <Text style={styles.cellTitle} numberOfLines={2}>{it.title}</Text>
                          <Text style={styles.cellTime}>{it.start_time}–{it.end_time}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Modifica attività' : 'Nuova attività'}</Text>
                <TouchableOpacity onPress={() => setModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Titolo</Text>
              <TextInput testID="schedule-title-input" style={styles.input} placeholder="es. Matematica" placeholderTextColor={theme.colors.textDim} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />

              <Text style={styles.label}>Giorno</Text>
              <View style={styles.row}>
                {DAYS_SHORT.map((d, i) => (
                  <TouchableOpacity key={i} onPress={() => setForm({ ...form, day_of_week: i })} style={[styles.chip, form.day_of_week === i && styles.chipActive]}>
                    <Text style={[styles.chipText, form.day_of_week === i && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Inizio</Text>
                  <TimeField value={form.start_time} onChange={(t) => setForm({ ...form, start_time: t })} testID="schedule-start-field" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fine</Text>
                  <TimeField value={form.end_time} onChange={(t) => setForm({ ...form, end_time: t })} testID="schedule-end-field" />
                </View>
              </View>

              <Text style={styles.label}>Colore</Text>
              <TouchableOpacity style={styles.colorFieldRow} onPress={() => setColorPickerOpen(true)} testID="schedule-color-btn">
                <View style={[styles.colorPreview, { backgroundColor: form.color }]} />
                <Text style={styles.colorFieldText}>{form.color.toUpperCase()}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {categories.length > 0 && (
                <>
                  <Text style={styles.label}>Categoria (opz)</Text>
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => setForm({ ...form, category_id: null })} style={[styles.chip, !form.category_id && styles.chipActive]}>
                      <Text style={[styles.chipText, !form.category_id && styles.chipTextActive]}>Nessuna</Text>
                    </TouchableOpacity>
                    {categories.map((c) => (
                      <TouchableOpacity key={c.id} onPress={() => setForm({ ...form, category_id: c.id, color: c.color })} style={[styles.chip, form.category_id === c.id && { backgroundColor: c.color + '30', borderColor: c.color }]}>
                        <Text style={styles.chipText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                {editing ? (
                  <TouchableOpacity testID="schedule-delete-btn" style={styles.btnDanger} onPress={del}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    <Text style={styles.btnDangerText}>Elimina</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity testID="schedule-save-btn" style={styles.btnPrimary} onPress={save}>
                  <Text style={styles.btnPrimaryText}>{editing ? 'Aggiorna' : 'Salva'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ColorPickerModal
        visible={colorPickerOpen}
        initial={form.color}
        onClose={() => setColorPickerOpen(false)}
        onSelect={(c) => setForm({ ...form, color: c })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { ...theme.font.h2, color: theme.colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: 12 },
  headerRow: { flexDirection: 'row' },
  hourCol: { width: 48, paddingRight: 6 },
  hourText: { color: theme.colors.textDim, fontSize: 10 },
  dayHeader: { paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  dayHeaderText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  dayCol: { borderLeftWidth: 1, borderLeftColor: theme.colors.borderSubtle, position: 'relative' },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: theme.colors.borderSubtle },
  cellItem: { position: 'absolute', left: 3, right: 3, borderRadius: 8, borderLeftWidth: 3, padding: 6, overflow: 'hidden' },
  cellTitle: { color: theme.colors.text, fontSize: 11, fontWeight: '600' },
  cellTime: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { ...theme.font.h2, color: theme.colors.text },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, color: theme.colors.text, fontSize: 15 },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontSize: 13 },
  chipTextActive: { color: theme.colors.primaryFg, fontWeight: '600' },
  timeRow: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  btnDangerText: { color: theme.colors.danger, fontWeight: '600' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.primaryFg, fontWeight: '600' },
  colorFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14 },
  colorPreview: { width: 28, height: 28, borderRadius: 14 },
  colorFieldText: { flex: 1, color: theme.colors.text, fontSize: 15, fontFamily: 'monospace' },
});
