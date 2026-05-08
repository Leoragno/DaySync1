import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { theme, DAYS_FULL, MONTHS } from '../../src/lib/theme';
import CategoryManagerModal from '../../src/lib/CategoryManagerModal';
import { updateDaySyncWidget, updateQuickNotesWidget, updateScheduleWidget } from '../../src/widgets/updateWidget';
import { scheduleService } from '../../src/services/scheduleService';
import { eventService } from '../../src/services/eventService';
import { quickNoteService } from '../../src/services/quickNoteService';
import { categoryService } from '../../src/services/categoryService';

export default function Home() {
  const { user, logout } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [quickNotes, setQuickNotes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [catManager, setCatManager] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e, q, c] = await Promise.all([
        scheduleService.getAll(),
        eventService.getAll(),
        quickNoteService.getAll(),
        categoryService.getAll(),
      ]);
      setSchedule(s);
      setEvents(e);
      setQuickNotes(q);
      setCategories(c);

      // Aggiorna Widget
      updateScheduleWidget(s);
      updateDaySyncWidget(e);
      updateQuickNotesWidget(q);
    } catch (err) {
      console.log('home load err', err);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date();
  const dayIdx = (today.getDay() + 6) % 7; // 0 = Monday
  const todaySchedule = schedule
    .filter((s: any) => s.day_of_week === dayIdx)
    .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const ongoing = todaySchedule.find((s: any) => nowMinutes >= toMin(s.start_time) && nowMinutes < toMin(s.end_time)) || null;
  const others = todaySchedule.filter((s: any) => s.id !== (ongoing?.id));

  const remaining = ongoing ? toMin(ongoing.end_time) - nowMinutes : 0;
  const ongoingRemaining = ongoing
    ? (remaining >= 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining}m`)
    : '';

  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = events
    .filter((ev: any) => !ev.completed && ev.date >= todayStr)
    .sort((a: any, b: any) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 5);

  const catColor = (id?: string) => categories.find((c) => c.id === id)?.color || theme.colors.textDim;

  const countdown = (ev: any) => {
    const d = new Date(ev.date);
    if (ev.time) {
      const [h, m] = ev.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    const diff = d.getTime() - Date.now();
    if (diff < 0) return 'Oggi';
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `fra ${days}g ${hrs}h`;
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `fra ${hrs}h ${mins}m`;
    return `fra ${mins}m`;
  };

  return (
    <SafeAreaView style={styles.safe} testID="home-screen" edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>Day<Text style={styles.appNameAccent}>Sync</Text></Text>
            <Text style={styles.userName}>{user?.name || 'Utente'}</Text>
            <Text style={styles.date}>{DAYS_FULL[dayIdx]} {today.getDate()} {MONTHS[today.getMonth()]}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity testID="manage-categories-btn" onPress={() => setCatManager(true)} style={[styles.iconBtn, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
              <Ionicons name="pricetags-outline" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity testID="logout-btn" onPress={logout} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Oggi - orario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orario di oggi</Text>
          {todaySchedule.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>Nessuna attività pianificata</Text></View>
          ) : (
            <>
              {ongoing ? (() => {
                const oc = ongoing.color || catColor(ongoing.category_id);
                return (
                  <View style={[styles.ongoingCard, { borderColor: oc, backgroundColor: oc + '55' }]} testID={`ongoing-schedule-${ongoing.id}`}>
                    <View style={styles.ongoingTopRow}>
                      <View style={[styles.liveDot, { backgroundColor: '#ffffff' }]} />
                      <Text style={[styles.liveLabel, { color: oc }]}>IN CORSO</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.ongoingRemaining, { color: oc }]}>resta {ongoingRemaining}</Text>
                    </View>
                    <Text style={styles.ongoingTitle}>{ongoing.title}</Text>
                    <Text style={styles.ongoingTime}>{ongoing.start_time} – {ongoing.end_time}</Text>
                  </View>
                );
              })() : null}

              {others.map((s) => {
                const isPast = nowMinutes >= toMin(s.end_time);
                const sc = s.color || catColor(s.category_id);
                return (
                  <View key={s.id} style={[styles.scheduleCard, { backgroundColor: sc + '33', borderColor: sc + '66' }, isPast && { opacity: 0.4 }]} testID={`today-schedule-${s.id}`}>
                    <View style={[styles.colorBar, { backgroundColor: sc }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleTime}>{s.start_time} – {s.end_time}</Text>
                      <Text style={styles.scheduleTitle}>{s.title}</Text>
                    </View>
                    {isPast ? <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" /> : null}
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Eventi imminenti */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eventi imminenti</Text>
          {upcoming.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>Nessun evento in arrivo</Text></View>
          ) : (
            upcoming.map((ev) => (
              <View key={ev.id} style={styles.eventCard} testID={`upcoming-event-${ev.id}`}>
                <View style={[styles.dot, { backgroundColor: ev.color || catColor(ev.category_id) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventMeta}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</Text>
                </View>
                <Text style={styles.countdown}>{countdown(ev)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Note rapide recenti */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note rapide recenti</Text>
          {quickNotes.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>Ancora nessuna nota</Text></View>
          ) : (
            <View style={styles.notesRow}>
              {quickNotes.slice(0, 4).map((qn) => (
                <View key={qn.id} style={[styles.quickNote, { backgroundColor: qn.color }]} testID={`recent-quicknote-${qn.id}`}>
                  <Text style={styles.quickNoteText} numberOfLines={4}>{qn.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CategoryManagerModal visible={catManager} onClose={() => setCatManager(false)} onChanged={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 12, paddingBottom: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: theme.colors.text, letterSpacing: -1 },
  appNameAccent: { color: theme.colors.accent },
  userName: { color: theme.colors.textMuted, fontSize: 15, marginTop: 2, fontWeight: '500' },
  date: { ...theme.font.small, color: theme.colors.textDim, marginTop: 4, textTransform: 'capitalize' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  section: { marginTop: 28 },
  sectionTitle: { ...theme.font.overline, color: theme.colors.textDim, marginBottom: 12 },
  empty: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  emptyText: { color: theme.colors.textDim, fontSize: 14 },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  ongoingCard: { borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 2, overflow: 'hidden' },
  ongoingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  ongoingRemaining: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  ongoingTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  ongoingTime: { color: theme.colors.textMuted, fontSize: 15, marginTop: 6, fontWeight: '500' },
  colorBar: { width: 4, borderRadius: 2, marginRight: 12 },
  scheduleTime: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  scheduleTitle: { color: theme.colors.text, fontSize: 16, marginTop: 2 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  eventTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  eventMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  countdown: { color: theme.colors.text, fontSize: 12, fontWeight: '600', backgroundColor: theme.colors.surface2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  notesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickNote: { width: '48%', minHeight: 100, borderRadius: 16, padding: 14 },
  quickNoteText: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
});
