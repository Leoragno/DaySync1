import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type ScheduleItem = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  color?: string | null;
};

type Props = {
  items?: ScheduleItem[];
  dayLabel?: string;
};

export function ScheduleWidget({ items = [], dayLabel = '' }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#09090b',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent', marginBottom: 10 }}>
        <TextWidget text="Orario" style={{ color: '#60a5fa', fontSize: 15, fontWeight: 'bold' }} />
        <TextWidget text={dayLabel} style={{ color: '#a1a1aa', fontSize: 11 }} />
      </FlexWidget>

      {items.length === 0 ? (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: 'match_parent' }}>
          <TextWidget text="Nessuna attività" style={{ color: '#71717a', fontSize: 13 }} />
        </FlexWidget>
      ) : (
        items.slice(0, 4).map((it) => (
          <FlexWidget
            key={it.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#18181b',
              borderRadius: 10,
              padding: 8,
              marginBottom: 6,
              width: 'match_parent',
            }}
          >
            <FlexWidget
              style={{
                width: 4,
                height: 24,
                backgroundColor: (it.color || '#60a5fa') as any,
                borderRadius: 2,
                marginRight: 8,
              }}
            />
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <TextWidget text={it.title} style={{ color: '#fafafa', fontSize: 13, fontWeight: 'bold' }} maxLines={1} />
              <TextWidget text={`${it.start_time} – ${it.end_time}`} style={{ color: '#a1a1aa', fontSize: 11 }} />
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
