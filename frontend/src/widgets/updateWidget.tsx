import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const WIDGET_EVENTS_KEY = 'daysync_widget_data';
export const WIDGET_NOTES_KEY = 'daysync_widget_notes';
export const WIDGET_SCHEDULE_KEY = 'daysync_widget_schedule';

const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DAYS_FULL_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

function tryRequestUpdate(widgetName: string, render: () => any) {
  if (Platform.OS !== 'android' || isExpoGo) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requestWidgetUpdate } = require('react-native-android-widget');
    requestWidgetUpdate({
      widgetName,
      renderWidget: render,
      widgetNotFound: () => {},
    });
  } catch {
    // Library not available (Expo Go / web)
  }
}

export async function updateDaySyncWidget(allEvents: any[]) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dateLabel = `${today.getDate()} ${MONTHS_IT[today.getMonth()]}`;

    const todayEvents = allEvents
      .filter((ev: any) => ev.date === todayStr && !ev.completed)
      .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))
      .slice(0, 5)
      .map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        time: ev.time || null,
        color: ev.color || null,
        completed: ev.completed || false,
      }));

    await AsyncStorage.setItem(WIDGET_EVENTS_KEY, JSON.stringify({ events: todayEvents, dateLabel }));

    tryRequestUpdate('DaySyncWidget', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DaySyncWidget } = require('./DaySyncWidget');
      return <DaySyncWidget events={todayEvents} dateLabel={dateLabel} />;
    });
  } catch (e) { console.log('events widget update failed', e); }
}

export async function updateQuickNotesWidget(allNotes: any[]) {
  try {
    const notes = allNotes.slice(0, 5).map((n: any) => ({
      id: n.id,
      text: n.text || '',
      color: n.color || '#3f3f46',
    }));

    await AsyncStorage.setItem(WIDGET_NOTES_KEY, JSON.stringify({ notes }));

    tryRequestUpdate('QuickNotesWidget', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { QuickNotesWidget } = require('./QuickNotesWidget');
      return <QuickNotesWidget notes={notes} />;
    });
  } catch (e) { console.log('notes widget update failed', e); }
}

export async function updateScheduleWidget(allItems: any[]) {
  try {
    const dIdx = (new Date().getDay() + 6) % 7;
    const dayLabel = DAYS_FULL_IT[dIdx];

    const items = allItems
      .filter((it: any) => it.day_of_week === dIdx)
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
      .slice(0, 5)
      .map((it: any) => ({
        id: it.id,
        title: it.title,
        start_time: it.start_time,
        end_time: it.end_time,
        color: it.color || null,
      }));

    await AsyncStorage.setItem(WIDGET_SCHEDULE_KEY, JSON.stringify({ items, dayLabel }));

    tryRequestUpdate('ScheduleWidget', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ScheduleWidget } = require('./ScheduleWidget');
      return <ScheduleWidget items={items} dayLabel={dayLabel} />;
    });
  } catch (e) { console.log('schedule widget update failed', e); }
}
