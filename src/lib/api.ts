import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GroceryItem, Ingredient, Meal, WeeklyPlan, WeeklyPlanSnapshot } from './types';
import { generateId, getWeekStartKey, normalizeName } from './utils';

const isConfigured = Boolean(supabase);

const mapGroceryRow = (row: any): GroceryItem => ({
  id: row.id,
  name: row.name,
  quantity: Number(row.quantity),
  unit: row.unit ?? undefined,
  category: row.category,
  checked: Boolean(row.checked),
  weekStart: row.week_start,
  updatedAt: row.updated_at
});

const mapGroceryToRow = (item: GroceryItem) => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  unit: item.unit ?? null,
  category: item.category,
  checked: item.checked,
  week_start: item.weekStart,
  updated_at: item.updatedAt
});

const mapMealRow = (row: any): Meal => ({
  id: row.id,
  mealName: row.meal_name,
  notes: row.notes ?? undefined,
  ingredients: []
});

const mapIngredientRow = (row: any): Ingredient => ({
  id: row.id,
  ingredient: row.ingredient,
  quantity: Number(row.quantity),
  unit: row.unit ?? undefined
});

const safe = async <T>(
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T | null> => {
  if (!supabase) return null;
  try {
    return await fn(supabase);
  } catch {
    return null;
  }
};

export const api = {
  isConfigured,
  getGroceryItems: () =>
    safe(async (client) => {
      const { data, error } = await client
        .from('grocery_items')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapGroceryRow);
    }),
  createGroceryItem: (item: GroceryItem) =>
    safe(async (client) => {
      const { data, error } = await client
        .from('grocery_items')
        .insert(mapGroceryToRow(item))
        .select('*')
        .single();
      if (error) throw error;
      return mapGroceryRow(data);
    }),
  updateGroceryItem: (id: string, item: Partial<GroceryItem>) =>
    safe(async (client) => {
      const payload: any = { ...item };
      if (payload.weekStart) {
        payload.week_start = payload.weekStart;
        delete payload.weekStart;
      }
      if (payload.updatedAt) {
        payload.updated_at = payload.updatedAt;
        delete payload.updatedAt;
      }
      const { data, error } = await client
        .from('grocery_items')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return mapGroceryRow(data);
    }),
  deleteGroceryItem: (id: string) =>
    safe(async (client) => {
      const { error } = await client.from('grocery_items').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    }),
  getMeals: () =>
    safe(async (client) => {
      const { data: mealsData, error: mealsError } = await client
        .from('meals')
        .select('*')
        .order('meal_name');
      if (mealsError) throw mealsError;

      const { data: ingredientData, error: ingredientError } = await client
        .from('meal_ingredients')
        .select('*');
      if (ingredientError) throw ingredientError;

      const mealMap = new Map<string, Meal>();
      (mealsData ?? []).forEach((row) => {
        mealMap.set(row.id, mapMealRow(row));
      });

      (ingredientData ?? []).forEach((row) => {
        const meal = mealMap.get(row.meal_id);
        if (meal) {
          meal.ingredients.push(mapIngredientRow(row));
        }
      });

      return Array.from(mealMap.values());
    }),
  createMeal: (meal: Meal) =>
    safe(async (client) => {
      const { error: mealError } = await client.from('meals').insert({
        id: meal.id,
        meal_name: meal.mealName,
        notes: meal.notes ?? null
      });
      if (mealError) throw mealError;

      if (meal.ingredients.length) {
        const { error: ingredientsError } = await client.from('meal_ingredients').insert(
          meal.ingredients.map((ingredient) => ({
            id: ingredient.id || generateId(),
            meal_id: meal.id,
            ingredient: ingredient.ingredient,
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? null
          }))
        );
        if (ingredientsError) throw ingredientsError;
      }

      return meal;
    }),
  updateMeal: (id: string, meal: Meal) =>
    safe(async (client) => {
      const { error: mealError } = await client
        .from('meals')
        .update({ meal_name: meal.mealName, notes: meal.notes ?? null })
        .eq('id', id);
      if (mealError) throw mealError;

      const { error: deleteError } = await client
        .from('meal_ingredients')
        .delete()
        .eq('meal_id', id);
      if (deleteError) throw deleteError;

      if (meal.ingredients.length) {
        const { error: ingredientsError } = await client.from('meal_ingredients').insert(
          meal.ingredients.map((ingredient) => ({
            id: ingredient.id || generateId(),
            meal_id: id,
            ingredient: ingredient.ingredient,
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? null
          }))
        );
        if (ingredientsError) throw ingredientsError;
      }

      return meal;
    }),
  deleteMeal: (id: string) =>
    safe(async (client) => {
      const { error: deleteIngredientsError } = await client
        .from('meal_ingredients')
        .delete()
        .eq('meal_id', id);
      if (deleteIngredientsError) throw deleteIngredientsError;

      const { error } = await client.from('meals').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    }),
  getWeeklyPlan: () =>
    safe(async (client) => {
      const { data, error } = await client.from('weekly_plan').select('*');
      if (error) throw error;
      const plan: WeeklyPlan = {
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      };
      (data ?? []).forEach((row) => {
        if (row.day && row.day in plan) {
          plan[row.day as keyof WeeklyPlan] = row.meal_id || null;
        }
      });
      return plan;
    }),
  updateWeeklyPlan: (plan: WeeklyPlan) =>
    safe(async (client) => {
      const payload = Object.keys(plan).map((day) => ({
        day,
        meal_id: plan[day as keyof WeeklyPlan] ?? null,
        updated_at: new Date().toISOString()
      }));
      const { error } = await client
        .from('weekly_plan')
        .upsert(payload, { onConflict: 'day' });
      if (error) throw error;
      return plan;
    }),
  getWeeklyPlanHistory: () =>
    safe(async (client) => {
      const { data, error } = await client
        .from('weekly_plan_history')
        .select('*')
        .order('week_start', { ascending: false });
      if (error) throw error;

      const grouped = new Map<string, WeeklyPlanSnapshot>();
      (data ?? []).forEach((row) => {
        const key = `${row.week_start}__${row.saved_at}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            weekStart: row.week_start,
            savedAt: row.saved_at,
            days: {
              mon: null,
              tue: null,
              wed: null,
              thu: null,
              fri: null,
              sat: null,
              sun: null
            }
          });
        }
        const snapshot = grouped.get(key);
        if (snapshot && row.day) {
          snapshot.days[row.day as keyof WeeklyPlan] = row.meal_id || null;
        }
      });

      const latestByWeek = new Map<string, WeeklyPlanSnapshot>();
      grouped.forEach((snapshot) => {
        const existing = latestByWeek.get(snapshot.weekStart);
        if (!existing || snapshot.savedAt > existing.savedAt) {
          latestByWeek.set(snapshot.weekStart, snapshot);
        }
      });

      return Array.from(latestByWeek.values()).sort((a, b) =>
        b.weekStart.localeCompare(a.weekStart)
      );
    }),
  saveWeeklyPlanHistory: (snapshot: WeeklyPlanSnapshot) =>
    safe(async (client) => {
      const { error: deleteError } = await client
        .from('weekly_plan_history')
        .delete()
        .eq('week_start', snapshot.weekStart);
      if (deleteError) throw deleteError;

      const rows = Object.keys(snapshot.days).map((day) => ({
        week_start: snapshot.weekStart,
        day,
        meal_id: snapshot.days[day as keyof WeeklyPlan] ?? null,
        saved_at: snapshot.savedAt
      }));
      const { error } = await client.from('weekly_plan_history').insert(rows);
      if (error) throw error;
      return snapshot;
    }),
  generateGroceryList: (ingredients: Ingredient[], weekStart?: string) =>
    safe(async (client) => {
      const targetWeek = weekStart ?? getWeekStartKey(new Date());
      const { data: existing, error } = await client
        .from('grocery_items')
        .select('*')
        .eq('week_start', targetWeek);
      if (error) throw error;

      const map = new Map<string, any>();
      (existing ?? []).forEach((row) => {
        const key = `${normalizeName(row.name)}|${row.unit ?? ''}`;
        map.set(key, row);
      });

      const updates: Array<{ id: string; quantity: number }> = [];
      const inserts: Array<any> = [];
      const now = new Date().toISOString();

      ingredients.forEach((ingredient) => {
        const key = `${normalizeName(ingredient.ingredient)}|${ingredient.unit ?? ''}`;
        const match = map.get(key);
        if (match) {
          updates.push({
            id: match.id,
            quantity: Number(match.quantity) + ingredient.quantity
          });
        } else {
          inserts.push({
            id: generateId(),
            name: ingredient.ingredient,
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? null,
            category: 'pantry',
            checked: false,
            week_start: targetWeek,
            updated_at: now
          });
        }
      });

      for (const update of updates) {
        const { error: updateError } = await client
          .from('grocery_items')
          .update({ quantity: update.quantity, checked: false, updated_at: now })
          .eq('id', update.id);
        if (updateError) throw updateError;
      }

      if (inserts.length) {
        const { error: insertError } = await client
          .from('grocery_items')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      return { ok: true, added: inserts.length };
    })
};
