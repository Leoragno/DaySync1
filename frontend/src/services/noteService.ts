import { BaseService, BaseDocument } from './baseService';

export interface NoteDoc extends BaseDocument {
  title: string;
  content: string;
  category_id?: string;
}

class NoteService extends BaseService<NoteDoc> {
  constructor() {
    super('notes');
  }
}

export const noteService = new NoteService();
