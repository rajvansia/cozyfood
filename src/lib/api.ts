import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GroceryItem, Ingredient, Meal, WeeklyPlan, WeeklyPlanByWeek } from './types';
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
  updatedAt: row.updated_at,
  source: row.source ?? 'manual'
});

const mapGroceryToRow = (item: GroceryItem) => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  unit: item.unit ?? null,
  category: item.category,
  checked: item.checked,
  week_start: item.weekStart,
  updated_at: item.updatedAt,
  source: item.source ?? 'manual'
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
  getGroceryItems: (weekStart?: string) =>
    safe(async (client) => {
      let query = client
        .from('grocery_items')
        .select('*')
        .order('updated_at', { ascending: false });
      if (weekStart) {
        query = query.eq('week_start', weekStart);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapGroceryRow);
    }),
  createGroceryItem: (item: GroceryItem) =>
    safe(async (client) => {
      const unit = item.unit ?? '';
      const source = item.source ?? 'manual';
      const { data: existingRows, error: existingError } = await client
        .from('grocery_items')
        .select('*')
        .eq('week_start', item.weekStart);
      if (existingError) throw existingError;

      const match = (existingRows ?? []).find(
        (row) =>
          normalizeName(row.name) === normalizeName(item.name) &&
          (row.unit ?? '') === unit &&
          (row.source ?? 'manual') === source
      );

      if (match) {
        const { data: updated, error: updateError } = await client
          .from('grocery_items')
          .update({
            quantity: Number(match.quantity) + item.quantity,
            checked: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id)
          .select('*')
          .single();
        if (updateError) throw updateError;
        return mapGroceryRow(updated);
      }

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
  getWeeklyPlan: (weekStart: string) =>
    safe(async (client) => {
      const { data, error } = await client
        .from('weekly_plan')
        .select('*')
        .eq('week_start', weekStart);
      if (error) throw error;
      const plan: WeeklyPlan = {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: []
      };
      (data ?? []).forEach((row) => {
        if (row.day && row.day in plan) {
          plan[row.day as keyof WeeklyPlan] = Array.isArray(row.meal_ids)
            ? row.meal_ids
            : [];
        }
      });
      return plan;
    }),
  updateWeeklyPlan: (plan: WeeklyPlan, weekStart: string) =>
    safe(async (client) => {
      const payload = Object.keys(plan).map((day) => ({
        day,
        meal_ids: plan[day as keyof WeeklyPlan] ?? [],
        week_start: weekStart,
        updated_at: new Date().toISOString()
      }));
      // Ensure a single row per (week_start, day) even if the DB lacks a unique constraint.
      const { error: deleteError } = await client
        .from('weekly_plan')
        .delete()
        .eq('week_start', weekStart);
      if (deleteError) throw deleteError;

      const { error } = await client.from('weekly_plan').insert(payload);
      if (error) throw error;
      return plan;
    }),
  getWeeklyPlans: () =>
    safe(async (client) => {
      const { data, error } = await client
        .from('weekly_plan')
        .select('*')
        .order('week_start', { ascending: false });
      if (error) throw error;

      const grouped = new Map<string, WeeklyPlanByWeek>();
      (data ?? []).forEach((row) => {
        if (!grouped.has(row.week_start)) {
          grouped.set(row.week_start, {
            weekStart: row.week_start,
            days: {
              mon: [],
              tue: [],
              wed: [],
              thu: [],
              fri: [],
              sat: [],
              sun: []
            }
          });
        }
        const week = grouped.get(row.week_start);
        if (week && row.day) {
          week.days[row.day as keyof WeeklyPlan] = Array.isArray(row.meal_ids)
            ? row.meal_ids
            : [];
        }
      });

      return Array.from(grouped.values()).sort((a, b) =>
        b.weekStart.localeCompare(a.weekStart)
      );
    }),
  generateGroceryList: (ingredients: Ingredient[], weekStart?: string) =>
    safe(async (client) => {
      const targetWeek = weekStart ?? getWeekStartKey(new Date());
      const { data: existing, error } = await client
        .from('grocery_items')
        .select('*')
        .eq('week_start', targetWeek);
      if (error) throw error;

      const categoryMap = new Map<string, string>();
      (existing ?? []).forEach((row) => {
        const key = `${normalizeName(row.name)}|${row.unit ?? ''}`;
        categoryMap.set(key, row.category || 'pantry');
      });

      const inserts: Array<any> = [];
      const now = new Date().toISOString();

      const summed = new Map<string, Ingredient>();
      ingredients.forEach((ingredient) => {
        const key = `${normalizeName(ingredient.ingredient)}|${ingredient.unit ?? ''}`;
        const existingIngredient = summed.get(key);
        if (existingIngredient) {
          existingIngredient.quantity += ingredient.quantity;
        } else {
          summed.set(key, { ...ingredient });
        }
      });

      summed.forEach((ingredient, key) => {
        inserts.push({
          id: generateId(),
          name: ingredient.ingredient,
          quantity: ingredient.quantity,
          unit: ingredient.unit ?? null,
          category: categoryMap.get(key) ?? 'pantry',
          checked: false,
          week_start: targetWeek,
          updated_at: now
        });
      });

      const { error: deleteError } = await client
        .from('grocery_items')
        .delete()
        .eq('week_start', targetWeek)
        .eq('source', 'generated');
      if (deleteError) throw deleteError;

      if (inserts.length) {
        const { error: insertError } = await client
          .from('grocery_items')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      return { ok: true, added: inserts.length, replaced: true };
    })
};
