export type Category =
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'meat'
  | 'snacks'
  | 'other';

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: Category;
  checked: boolean;
  weekStart: string;
  updatedAt: string;
  source?: 'manual' | 'generated';
};

export type Ingredient = {
  id: string;
  ingredient: string;
  quantity: number;
  unit?: string;
};

export type Meal = {
  id: string;
  mealName: string;
  notes?: string;
  ingredients: Ingredient[];
};

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeeklyPlan = Record<DayKey, string[]>;

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export type WeeklyPlanByWeek = {
  weekStart: string;
  days: WeeklyPlan;
};
