import { BaseService, BaseDocument } from './baseService';

export interface QuickNoteDoc extends BaseDocument {
  text: string;
  color: string;
}

class QuickNoteService extends BaseService<QuickNoteDoc> {
  constructor() {
    super('quicknotes');
  }
}

export const quickNoteService = new QuickNoteService();
