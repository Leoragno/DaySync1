import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme, MONTHS, DAYS_SHORT, CATEGORY_COLORS } from '../../src/lib/theme';
import { requestNotifPermissions, scheduleEventReminder, cancelEventReminder } from '../../src/lib/notifications';
import { DateField, TimeField, formatItalianDate } from '../../src/lib/DateTimeFields';
import ColorPickerModal from '../../src/lib/ColorPickerModal';
import { confirmDelete, showAlert } from '../../src/lib/confirmDialog';
import SwipeableRow from '../../src/lib/SwipeableRow';
import { updateDaySyncWidget } from '../../src/widgets/updateWidget';
import { eventService, EventDoc } from '../../src/services/eventService';
import { categoryService } from '../../src/services/categoryService';

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; } // 0=Mon

export default function Agenda() {
  const [events, setEvents] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState<string>(new Date().toISOString().slice(0, 10));
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: selected, time: '', type: '', description: '', category_id: '' as string | null, color: CATEGORY_COLORS[0], reminder_minutes: 15 });

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([eventService.getAll(), categoryService.getAll()]);
      setEvents(e); setCats(c);
      updateDaySyncWidget(e);
    } catch (err) { console.log(err); }
  }, []);
  useFocusEffect(useCallback(() => { load(); requestNotifPermissions(); }, [load]));

  const ymStr = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}`;
  const monthEvents = useMemo(() => events.filter((ev: any) => ev.date.startsWith(ymStr)), [events, ymStr]);
  const eventsByDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    monthEvents.forEach((ev: any) => { (m[ev.date] = m[ev.date] || []).push(ev); });
    return m;
  }, [monthEvents]);

  const selectedEvents = useMemo(() => events.filter((ev: any) => ev.date === selected).sort((a: any, b: any) => (a.time || '').localeCompare(b.time || '')), [events, selected]);

  const prevMonth = () => setCur(cur.m === 0 ? { y: cur.y - 1, m: 11 } : { ...cur, m: cur.m - 1 });
  const nextMonth = () => setCur(cur.m === 11 ? { y: cur.y + 1, m: 0 } : { ...cur, m: cur.m + 1 });

  const openNew = () => {
    setEditing(null);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setForm({ title: '', date: selected, time: `${hh}:${mm}`, type: '', description: '', category_id: null, color: CATEGORY_COLORS[0], reminder_minutes: 15 });
    setModal(true);
  };
  const openEdit = (ev: any) => {
    setEditing(ev);
    setForm({ title: ev.title, date: ev.date, time: ev.time || '', type: ev.type || '', description: ev.description || '', category_id: ev.category_id || null, color: ev.color || CATEGORY_COLORS[0], reminder_minutes: ev.reminder_minutes ?? 15 });
    setModal(true);
  };
  const save = async () => {
    if (!form.title.trim()) { showAlert('Titolo obbligatorio'); return; }
    try {
      const payload: Partial<EventDoc> = { 
        title: form.title,
        date: form.date,
        time: form.time || undefined,
        type: form.type || undefined,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        color: form.color,
        reminder_minutes: form.reminder_minutes,
        completed: editing ? editing.completed : false,
      };
      
      if (editing) payload.id = editing.id;
      
      const ev = await eventService.save(payload);
      
      if (editing) {
        await cancelEventReminder(editing.id);
      }
      
      if (form.reminder_minutes > 0) {
        await scheduleEventReminder(ev.id, ev.title, ev.date, ev.time || undefined, form.reminder_minutes);
      }
      setModal(false);
      load();
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante il salvataggio'); }
  };
  const toggleComplete = async (id: string) => {
    try { 
      const ev = events.find(e => e.id === id);
      if (ev) {
        await eventService.patch(id, { completed: !ev.completed });
        load();
      }
    } catch (e: any) { showAlert('Errore', e.message || 'Errore durante l\'aggiornamento'); }
  };
  const del = async (id: string) => {
    try { await cancelEventReminder(id); await eventService.delete(id); load(); } catch (e: any) { showAlert('Errore', e.message || 'Errore durante l\'eliminazione'); }
  };

  const dim = daysInMonth(cur.y, cur.m);
  const fwd = firstWeekday(cur.y, cur.m);
  const cells: (number | null)[] = [];
  for (let i = 0; i < fwd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  return (
    <SafeAreaView style={styles.safe} testID="agenda-screen" edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <TouchableOpacity testID="add-event-btn" style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color={theme.colors.primaryFg} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={22} color={theme.colors.text} /></TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[cur.m]} {cur.y}</Text>
          <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={22} color={theme.colors.text} /></TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {DAYS_SHORT.map((d) => <Text key={d} style={styles.weekLabel}>{d}</Text>)}
        </View>

        <View style={styles.calGrid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.calCell} />;
            const dateStr = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const evs = eventsByDate[dateStr] || [];
            const isSel = selected === dateStr;
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            return (
              <TouchableOpacity key={i} style={[styles.calCell, isSel && styles.calCellSelected]} onPress={() => setSelected(dateStr)} testID={`calendar-day-${dateStr}`}>
                <Text style={[styles.calDay, isSel && styles.calDaySelected, isToday && !isSel && styles.calDayToday]}>{d}</Text>
                {evs.length > 0 && <View style={styles.calDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Eventi · {selected}</Text>
          {selectedEvents.length === 0 && <Text style={styles.empty}>Nessun evento</Text>}
          {selectedEvents.map((ev) => (
            <SwipeableRow key={ev.id} onDelete={() => del(ev.id)} testID={`event-swipe-${ev.id}`}>
              <TouchableOpacity onPress={() => openEdit(ev)} style={styles.eventRow} testID={`event-row-${ev.id}`} activeOpacity={0.85}>
                <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); toggleComplete(ev.id); }} testID={`event-complete-${ev.id}`}>
                  <Ionicons name={ev.completed ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={ev.completed ? theme.colors.success : theme.colors.textDim} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.eventTitle, ev.completed && styles.strike]}>{ev.title}</Text>
                  <Text style={styles.eventMeta}>{ev.time || 'Tutto il giorno'}{ev.type ? ` · ${ev.type}` : ''}</Text>
                  {ev.description ? <Text style={styles.eventDesc} numberOfLines={2}>{ev.description}</Text> : null}
                </View>
                <View style={[styles.colorPill, { backgroundColor: (ev.color || theme.colors.info) }]} />
              </TouchableOpacity>
            </SwipeableRow>
          ))}
        </View>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editing ? 'Modifica evento' : 'Nuovo evento'}</Text>
              <TextInput testID="event-title-input" style={styles.input} placeholder="Titolo" placeholderTextColor={theme.colors.textDim} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />

              <Text style={styles.label}>Data</Text>
              <DateField value={form.date} onChange={(iso) => setForm({ ...form, date: iso })} testID="event-date-field" />

              <Text style={styles.label}>Ora</Text>
              <TimeField value={form.time} onChange={(t) => setForm({ ...form, time: t })} testID="event-time-field" optional />

              <Text style={styles.label}>Tipologia</Text>
              <TextInput testID="event-type-input" style={styles.input} placeholder="es. Riunione" placeholderTextColor={theme.colors.textDim} value={form.type} onChangeText={(t) => setForm({ ...form, type: t })} />

              <Text style={styles.label}>Descrizione</Text>
              <TextInput
                testID="event-description-input"
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Aggiungi una descrizione..."
                placeholderTextColor={theme.colors.textDim}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                multiline
              />

              <Text style={styles.label}>Colore evento</Text>
              <TouchableOpacity style={styles.colorFieldRow} onPress={() => setColorPickerOpen(true)} testID="event-color-btn">
                <View style={[styles.colorPreview, { backgroundColor: form.color }]} />
                <Text style={styles.colorFieldText}>{form.color.toUpperCase()}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>Categoria</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity style={[styles.chip, !form.category_id && styles.chipActive]} onPress={() => setForm({ ...form, category_id: null })}>
                  <Text style={[styles.chipText, !form.category_id && styles.chipTextActive]}>Nessuna</Text>
                </TouchableOpacity>
                {cats.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.chip, form.category_id === c.id && { backgroundColor: c.color + '30', borderColor: c.color }]} onPress={() => setForm({ ...form, category_id: c.id, color: c.color })}>
                    <Text style={styles.chipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Promemoria (min prima)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[0, 15, 60, 1440].map((m) => (
                  <TouchableOpacity key={m} style={[styles.chip, form.reminder_minutes === m && styles.chipActive]} onPress={() => setForm({ ...form, reminder_minutes: m })}>
                    <Text style={[styles.chipText, form.reminder_minutes === m && styles.chipTextActive]}>{m === 0 ? 'No' : m === 1440 ? '1 giorno' : m === 60 ? '1 ora' : `${m} min`}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setModal(false)}><Text style={styles.btnSecondaryText}>Annulla</Text></TouchableOpacity>
                <TouchableOpacity testID="event-save-btn" style={styles.btnPrimary} onPress={save}><Text style={styles.btnPrimaryText}>Salva</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 10 },
  monthTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '500', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10 },
  weekLabel: { flex: 1, textAlign: 'center', color: theme.colors.textDim, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 6 },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  calCellSelected: {},
  calDay: { color: theme.colors.text, fontSize: 15, width: 34, height: 34, textAlign: 'center', lineHeight: 34, borderRadius: 17 },
  calDaySelected: { backgroundColor: theme.colors.primary, color: theme.colors.primaryFg, fontWeight: '700' },
  calDayToday: { borderWidth: 1, borderColor: theme.colors.textMuted },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.info, marginTop: 2 },
  eventsSection: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { ...theme.font.overline, color: theme.colors.textDim, marginBottom: 12 },
  empty: { color: theme.colors.textDim, textAlign: 'center', paddingVertical: 20 },
  eventRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  eventTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  eventMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  eventDesc: { color: theme.colors.textDim, fontSize: 12, marginTop: 6, lineHeight: 16 },
  strike: { textDecorationLine: 'line-through', color: theme.colors.textDim },
  colorPill: { width: 6, height: 30, borderRadius: 3, marginRight: 6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { ...theme.font.h2, color: theme.colors.text, marginBottom: 16 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, color: theme.colors.text, fontSize: 15 },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontSize: 13 },
  chipTextActive: { color: theme.colors.primaryFg, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface2, alignItems: 'center' },
  btnSecondaryText: { color: theme.colors.text, fontWeight: '500' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.primaryFg, fontWeight: '600' },
  colorFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14 },
  colorPreview: { width: 28, height: 28, borderRadius: 14 },
  colorFieldText: { flex: 1, color: theme.colors.text, fontSize: 15, fontFamily: 'monospace' },
});
