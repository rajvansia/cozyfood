import { GroceryItem, Meal, WeeklyPlan } from './types';
import { getWeekStartKey } from './utils';

const currentWeekStart = getWeekStartKey(new Date());

export const mockGroceryItems: GroceryItem[] = [
  {
    id: 'g-1',
    name: 'Strawberries',
    quantity: 2,
    unit: 'pints',
    category: 'produce',
    checked: false,
    weekStart: currentWeekStart,
    updatedAt: new Date().toISOString(),
    source: 'manual'
  },
  {
    id: 'g-2',
    name: 'Oat milk',
    quantity: 1,
    unit: 'carton',
    category: 'dairy',
    checked: false,
    weekStart: currentWeekStart,
    updatedAt: new Date().toISOString(),
    source: 'manual'
  },
  {
    id: 'g-3',
    name: 'Sourdough loaf',
    quantity: 1,
    unit: 'loaf',
    category: 'bakery',
    checked: true,
    weekStart: currentWeekStart,
    updatedAt: new Date().toISOString(),
    source: 'manual'
  }
];

export const mockMeals: Meal[] = [
  {
    id: 'm-1',
    mealName: 'Creamy Veggie Pasta',
    notes: 'Use the herb butter from the freezer.',
    ingredients: [
      { id: 'i-1', ingredient: 'Pasta', quantity: 1, unit: 'box' },
      { id: 'i-2', ingredient: 'Zucchini', quantity: 2, unit: 'pcs' },
      { id: 'i-3', ingredient: 'Parmesan', quantity: 0.5, unit: 'cup' }
    ]
  },
  {
    id: 'm-2',
    mealName: 'Toasty Chickpea Bowls',
    notes: 'Top with crunchy sunflower seeds.',
    ingredients: [
      { id: 'i-4', ingredient: 'Chickpeas', quantity: 2, unit: 'cans' },
      { id: 'i-5', ingredient: 'Baby spinach', quantity: 1, unit: 'bag' },
      { id: 'i-6', ingredient: 'Tahini', quantity: 0.25, unit: 'cup' }
    ]
  },
  {
    id: 'm-3',
    mealName: 'Berry Pancake Night',
    notes: 'Serve with honey butter.',
    ingredients: [
      { id: 'i-7', ingredient: 'Pancake mix', quantity: 1, unit: 'box' },
      { id: 'i-8', ingredient: 'Eggs', quantity: 6, unit: 'pcs' },
      { id: 'i-9', ingredient: 'Mixed berries', quantity: 2, unit: 'cups' }
    ]
  }
];

export const mockPlan: WeeklyPlan = {
  mon: ['m-1'],
  tue: ['m-2'],
  wed: [],
  thu: ['m-3'],
  fri: [],
  sat: [],
  sun: []
};
