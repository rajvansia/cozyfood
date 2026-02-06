import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { mockGroceryItems, mockHistory, mockMeals, mockPlan } from './mockData';
import {
  GroceryItem,
  Meal,
  SyncStatus,
  WeeklyPlan,
  WeeklyPlanSnapshot
} from './types';
import {
  aggregateIngredientsFromPlan,
  generateId,
  getWeekStartKey,
  mergeGroceryItems
} from './utils';

const STORAGE_KEYS = {
  grocery: 'cozyfood.grocery',
  meals: 'cozyfood.meals',
  plan: 'cozyfood.plan',
  history: 'cozyfood.history'
};

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const useAppState = () => {
  const defaultWeekStart = getWeekStartKey(new Date());
  const normalizeGrocery = (items: GroceryItem[]) =>
    items.map((item) => ({
      ...item,
      weekStart: item.weekStart ?? defaultWeekStart
    }));

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    normalizeGrocery(readStorage(STORAGE_KEYS.grocery, mockGroceryItems))
  );
  const [meals, setMeals] = useState<Meal[]>(() =>
    readStorage(STORAGE_KEYS.meals, mockMeals)
  );
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() =>
    readStorage(STORAGE_KEYS.plan, mockPlan)
  );
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyPlanSnapshot[]>(() =>
    readStorage(STORAGE_KEYS.history, mockHistory)
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.grocery, groceryItems);
  }, [groceryItems]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.meals, meals);
  }, [meals]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.plan, weeklyPlan);
  }, [weeklyPlan]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.history, weeklyHistory);
  }, [weeklyHistory]);

  useEffect(() => {
    if (!api.isConfigured || !isOnline) {
      setSyncStatus('offline');
      return;
    }

    const loadRemote = async () => {
      setSyncStatus('syncing');
      const [remoteGrocery, remoteMeals, remotePlan, remoteHistory] = await Promise.all([
        api.getGroceryItems(),
        api.getMeals(),
        api.getWeeklyPlan(),
        api.getWeeklyPlanHistory()
      ]);

      if (remoteGrocery) setGroceryItems(normalizeGrocery(remoteGrocery));
      if (remoteMeals) setMeals(remoteMeals);
      if (remotePlan) setWeeklyPlan(remotePlan);
      if (remoteHistory) setWeeklyHistory(remoteHistory);

      if (!remoteGrocery && !remoteMeals && !remotePlan && !remoteHistory) {
        setSyncStatus('error');
      } else {
        setSyncStatus('idle');
      }
    };

    loadRemote().catch(() => setSyncStatus('error'));
  }, [isOnline]);

  const syncCall = useCallback(async <T,>(fn: () => Promise<T | null>) => {
    if (!api.isConfigured || !isOnline) {
      setSyncStatus('offline');
      return null;
    }
    const result = await fn();
    if (!result) {
      setSyncStatus('error');
    } else {
      setSyncStatus('idle');
    }
    return result;
  }, [isOnline]);

  const addGroceryItem = useCallback((item: Omit<GroceryItem, 'id' | 'updatedAt'>) => {
    const next: GroceryItem = {
      ...item,
      id: generateId(),
      weekStart: item.weekStart ?? defaultWeekStart,
      updatedAt: new Date().toISOString()
    };
    setGroceryItems((prev) => [next, ...prev]);
    void syncCall(() => api.createGroceryItem(next));
  }, [syncCall, defaultWeekStart]);

  const updateGroceryItem = useCallback((id: string, update: Partial<GroceryItem>) => {
    setGroceryItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...update, updatedAt: new Date().toISOString() }
          : item
      )
    );
    void syncCall(() => api.updateGroceryItem(id, update));
  }, [syncCall]);

  const deleteGroceryItem = useCallback((id: string) => {
    setGroceryItems((prev) => prev.filter((item) => item.id !== id));
    void syncCall(() => api.deleteGroceryItem(id));
  }, [syncCall]);

  const toggleGroceryItem = useCallback(
    (id: string) => {
      let nextChecked: boolean | null = null;
      setGroceryItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          nextChecked = !item.checked;
          return {
            ...item,
            checked: nextChecked,
            updatedAt: new Date().toISOString()
          };
        })
      );
      if (nextChecked !== null) {
        void syncCall(() => api.updateGroceryItem(id, { checked: nextChecked }));
      }
    },
    [syncCall]
  );

  const addMeal = useCallback((meal: Omit<Meal, 'id'>) => {
    const next: Meal = { ...meal, id: generateId() };
    setMeals((prev) => [next, ...prev]);
    void syncCall(() => api.createMeal(next));
  }, [syncCall]);

  const updateMeal = useCallback((meal: Meal) => {
    setMeals((prev) => prev.map((item) => (item.id === meal.id ? meal : item)));
    void syncCall(() => api.updateMeal(meal.id, meal));
  }, [syncCall]);

  const deleteMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((item) => item.id !== id));
    setWeeklyPlan((prev) => {
      const next = { ...prev };
      (Object.keys(next) as Array<keyof WeeklyPlan>).forEach((day) => {
        if (next[day] === id) next[day] = null;
      });
      return next;
    });
    void syncCall(() => api.deleteMeal(id));
  }, [syncCall]);

  const updateWeeklyPlan = useCallback(
    (day: keyof WeeklyPlan, mealId: string | null) => {
      setWeeklyPlan((prev) => {
        const next = { ...prev, [day]: mealId } as WeeklyPlan;
        void syncCall(() => api.updateWeeklyPlan(next));
        return next;
      });
    },
    [syncCall]
  );

  const saveWeeklySnapshot = useCallback(() => {
    const snapshot: WeeklyPlanSnapshot = {
      weekStart: getWeekStartKey(new Date()),
      savedAt: new Date().toISOString(),
      days: weeklyPlan
    };
    setWeeklyHistory((prev) => {
      const next = [snapshot, ...prev.filter((entry) => entry.weekStart !== snapshot.weekStart)];
      return next.slice(0, 12);
    });
    void syncCall(() => api.saveWeeklyPlanHistory(snapshot));
  }, [weeklyPlan, syncCall]);

  const generateGroceryList = useCallback(() => {
    const ingredients = aggregateIngredientsFromPlan(meals, weeklyPlan);
    setGroceryItems((prev) => mergeGroceryItems(prev, ingredients, defaultWeekStart));
    void syncCall(() => api.generateGroceryList(weeklyPlan));
    saveWeeklySnapshot();
  }, [meals, weeklyPlan, syncCall, saveWeeklySnapshot, defaultWeekStart]);

  const loadWeeklySnapshot = useCallback(
    (snapshot: WeeklyPlanSnapshot) => {
      setWeeklyPlan(snapshot.days);
      void syncCall(() => api.updateWeeklyPlan(snapshot.days));
    },
    [syncCall]
  );

  const value = useMemo(
    () => ({
      groceryItems,
      meals,
      weeklyPlan,
      weeklyHistory,
      syncStatus,
      isOnline,
      addGroceryItem,
      updateGroceryItem,
      deleteGroceryItem,
      toggleGroceryItem,
      addMeal,
      updateMeal,
      deleteMeal,
      updateWeeklyPlan,
      generateGroceryList,
      loadWeeklySnapshot
    }),
    [
      groceryItems,
      meals,
      weeklyPlan,
      weeklyHistory,
      syncStatus,
      isOnline,
      addGroceryItem,
      updateGroceryItem,
      deleteGroceryItem,
      toggleGroceryItem,
      addMeal,
      updateMeal,
      deleteMeal,
      updateWeeklyPlan,
      generateGroceryList,
      loadWeeklySnapshot
    ]
  );

  return value;
};
