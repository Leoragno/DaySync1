import { BaseService, BaseDocument } from './baseService';

export interface EventDoc extends BaseDocument {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type?: string;
  description?: string;
  category_id?: string;
  color?: string;
  completed: boolean;
  reminder_minutes?: number;
}

class EventService extends BaseService<EventDoc> {
  constructor() {
    super('events');
  }

  // Aggiungi qui query specifiche se necessario (es. eventi per data)
}

export const eventService = new EventService();
