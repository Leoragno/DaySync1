import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DaySyncWidget, TodayEvent } from './DaySyncWidget';
import { QuickNotesWidget, QuickNoteItem } from './QuickNotesWidget';
import { ScheduleWidget, ScheduleItem } from './ScheduleWidget';

const WIDGET_EVENTS_KEY = 'daysync_widget_data';
const WIDGET_NOTES_KEY = 'daysync_widget_notes';
const WIDGET_SCHEDULE_KEY = 'daysync_widget_schedule';

const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DAYS_FULL_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

async function loadEvents(): Promise<{ events: TodayEvent[]; dateLabel: string }> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_EVENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const now = new Date();
  return { events: [], dateLabel: `${now.getDate()} ${MONTHS_IT[now.getMonth()]}` };
}

async function loadNotes(): Promise<{ notes: QuickNoteItem[] }> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_NOTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { notes: [] };
}

async function loadSchedule(): Promise<{ items: ScheduleItem[]; dayLabel: string }> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SCHEDULE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const dIdx = (new Date().getDay() + 6) % 7;
  return { items: [], dayLabel: DAYS_FULL_IT[dIdx] };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const name = widgetInfo.widgetName;

  const render = async () => {
    if (name === 'QuickNotesWidget') {
      const { notes } = await loadNotes();
      props.renderWidget(<QuickNotesWidget notes={notes} />);
    } else if (name === 'ScheduleWidget') {
      const { items, dayLabel } = await loadSchedule();
      props.renderWidget(<ScheduleWidget items={items} dayLabel={dayLabel} />);
    } else {
      const { events, dateLabel } = await loadEvents();
      props.renderWidget(<DaySyncWidget events={events} dateLabel={dateLabel} />);
    }
  };

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await render();
      break;
    default:
      break;
  }
}
