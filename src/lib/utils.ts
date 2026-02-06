import { DayKey, GroceryItem, Ingredient, Meal, WeeklyPlan } from './types';

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

export const FULL_DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

export const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  pantry: 'Pantry',
  frozen: 'Frozen',
  bakery: 'Bakery',
  meat: 'Meat',
  snacks: 'Snacks',
  other: 'Other'
};

export const EMPTY_WEEKLY_PLAN: WeeklyPlan = {
  mon: null,
  tue: null,
  wed: null,
  thu: null,
  fri: null,
  sat: null,
  sun: null
};

export const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeName = (name: string) => name.trim().toLowerCase();

export const normalizeWeeklyPlan = (plan: Partial<WeeklyPlan>) => ({
  ...EMPTY_WEEKLY_PLAN,
  ...plan
});

export const getWeekStartKey = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  const year = monday.getFullYear();
  const month = `${monday.getMonth() + 1}`.padStart(2, '0');
  const dayOfMonth = `${monday.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

export const formatWeekLabel = (weekStart: string) => {
  const parts = weekStart.split('-').map(Number);
  if (parts.length !== 3) return weekStart;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
};

export const formatQuantity = (qty: number) => {
  if (Number.isNaN(qty)) return '0';
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2).replace(/\.00$/, '');
};

export const sumIngredients = (ingredients: Ingredient[]) => {
  const map = new Map<string, Ingredient>();
  ingredients.forEach((ingredient) => {
    const key = `${normalizeName(ingredient.ingredient)}|${ingredient.unit ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += ingredient.quantity;
    } else {
      map.set(key, { ...ingredient });
    }
  });
  return Array.from(map.values());
};

export const aggregateIngredientsFromPlan = (
  meals: Meal[],
  plan: WeeklyPlan
): Ingredient[] => {
  const mealMap = new Map(meals.map((meal) => [meal.id, meal]));
  const aggregated: Ingredient[] = [];

  Object.values(plan).forEach((mealId) => {
    if (!mealId) return;
    const meal = mealMap.get(mealId);
    if (!meal) return;
    aggregated.push(...meal.ingredients);
  });

  return sumIngredients(aggregated);
};

export const mergeGroceryItems = (
  existing: GroceryItem[],
  additions: Ingredient[],
  weekStart = getWeekStartKey(new Date())
): GroceryItem[] => {
  const now = new Date().toISOString();
  const next = [...existing];
  const targetWeek = weekStart;

  additions.forEach((ingredient) => {
    const key = normalizeName(ingredient.ingredient);
    const unit = ingredient.unit ?? '';
    const match = next.find(
      (item) =>
        normalizeName(item.name) === key &&
        (item.unit ?? '') === unit &&
        (item.weekStart ?? targetWeek) === targetWeek
    );

    if (match) {
      match.quantity += ingredient.quantity;
      match.checked = false;
      match.updatedAt = now;
    } else {
      next.push({
        id: generateId(),
        name: ingredient.ingredient,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: 'pantry',
        checked: false,
        weekStart: targetWeek,
        updatedAt: now
      });
    }
  });

  return next;
};

export const sortGroceryItems = (items: GroceryItem[]) => {
  return [...items].sort((a, b) => {
    if (a.checked === b.checked) {
      return a.name.localeCompare(b.name);
    }
    return a.checked ? 1 : -1;
  });
};
