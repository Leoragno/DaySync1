import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type TodayEvent = {
  id: string;
  title: string;
  time?: string | null;
  color?: string | null;
  completed?: boolean;
};

type Props = {
  events?: TodayEvent[];
  dateLabel?: string;
};

export function DaySyncWidget({ events = [], dateLabel = '' }: Props) {
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
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent', marginBottom: 10 }}>
        <TextWidget
          text="DaySync"
          style={{ color: '#a78bfa', fontSize: 16, fontWeight: 'bold' }}
        />
        <TextWidget
          text={dateLabel}
          style={{ color: '#a1a1aa', fontSize: 11 }}
        />
      </FlexWidget>

      {/* Events list */}
      {events.length === 0 ? (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: 'match_parent' }}>
          <TextWidget
            text="Nessun evento oggi"
            style={{ color: '#71717a', fontSize: 13 }}
          />
        </FlexWidget>
      ) : (
        events.slice(0, 4).map((ev) => (
          <FlexWidget
            key={ev.id}
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
                backgroundColor: (ev.color || '#a78bfa') as any,
                borderRadius: 2,
                marginRight: 8,
              }}
            />
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <TextWidget
                text={ev.title}
                style={{ color: '#fafafa', fontSize: 13, fontWeight: 'bold' }}
                maxLines={1}
              />
              {ev.time ? (
                <TextWidget
                  text={ev.time}
                  style={{ color: '#a1a1aa', fontSize: 11 }}
                />
              ) : null}
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
