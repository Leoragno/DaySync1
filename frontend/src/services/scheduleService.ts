import { BaseService, BaseDocument } from './baseService';

export interface ScheduleDoc extends BaseDocument {
  title: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:MM
  end_time: string;
  category_id?: string;
  color?: string;
}

class ScheduleService extends BaseService<ScheduleDoc> {
  constructor() {
    super('schedule');
  }
}

export const scheduleService = new ScheduleService();
