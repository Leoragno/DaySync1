import { BaseService, BaseDocument } from './baseService';

export interface CategoryDoc extends BaseDocument {
  name: string;
  color: string;
}

class CategoryService extends BaseService<CategoryDoc> {
  constructor() {
    super('categories');
  }
}

export const categoryService = new CategoryService();
