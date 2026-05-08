import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type QuickNoteItem = {
  id: string;
  text: string;
  color: string;
};

type Props = {
  notes?: QuickNoteItem[];
};

export function QuickNotesWidget({ notes = [] }: Props) {
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
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: 10 }}>
        <TextWidget text="Note rapide" style={{ color: '#f472b6', fontSize: 15, fontWeight: 'bold' }} />
      </FlexWidget>

      {notes.length === 0 ? (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: 'match_parent' }}>
          <TextWidget text="Nessuna nota" style={{ color: '#71717a', fontSize: 13 }} />
        </FlexWidget>
      ) : (
        notes.slice(0, 3).map((n) => (
          <FlexWidget
            key={n.id}
            style={{
              backgroundColor: (n.color || '#3f3f46') as any,
              borderRadius: 10,
              padding: 8,
              marginBottom: 6,
              width: 'match_parent',
            }}
          >
            <TextWidget text={n.text} style={{ color: '#fafafa', fontSize: 12 }} maxLines={3} />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
