import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { mockGroceryItems, mockMeals, mockPlan } from './mockData';
import {
  GroceryItem,
  Meal,
  SyncStatus,
  WeeklyPlan,
  WeeklyPlanByWeek
} from './types';
import {
  aggregateIngredientsFromPlan,
  EMPTY_WEEKLY_PLAN,
  generateId,
  getWeekStartKey,
  mergeGroceryItems,
  normalizeName,
  normalizeWeeklyPlan
} from './utils';

const STORAGE_KEYS = {
  grocery: 'cozyfood.grocery',
  meals: 'cozyfood.meals',
  plans: 'cozyfood.plans',
  plannerWeek: 'cozyfood.plannerWeek',
  history: 'cozyfood.history',
  groceryWeek: 'cozyfood.groceryWeek'
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
  const normalizeHistory = (history: WeeklyPlanByWeek[]) =>
    history.map((snapshot) => ({
      ...snapshot,
      days: normalizeWeeklyPlan(snapshot.days)
    }));
  const getGroceryKey = useCallback(
    (item: GroceryItem) => {
      const week = item.weekStart ?? defaultWeekStart;
      return `${normalizeName(item.name)}|${item.unit ?? ''}|${week}`;
    },
    [defaultWeekStart]
  );
  const mergeGroceryForWeek = useCallback(
    (localWeek: GroceryItem[], remoteWeek: GroceryItem[]) => {
      const merged = new Map<string, GroceryItem>();
      const toTimestamp = (value?: string) => {
        if (!value) return 0;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      localWeek.forEach((item) => {
        merged.set(getGroceryKey(item), item);
      });

      remoteWeek.forEach((item) => {
        const key = getGroceryKey(item);
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, item);
          return;
        }
        const localTime = toTimestamp(existing.updatedAt);
        const remoteTime = toTimestamp(item.updatedAt);
        if (remoteTime >= localTime) {
          merged.set(key, item);
        }
      });

      return Array.from(merged.values());
    },
    [getGroceryKey]
  );
  const normalizePlansMap = (plans: Record<string, WeeklyPlan>) => {
    const normalized: Record<string, WeeklyPlan> = {};
    Object.keys(plans).forEach((week) => {
      normalized[week] = normalizeWeeklyPlan(plans[week]);
    });
    return normalized;
  };

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    normalizeGrocery(readStorage(STORAGE_KEYS.grocery, mockGroceryItems))
  );
  const [meals, setMeals] = useState<Meal[]>(() =>
    readStorage(STORAGE_KEYS.meals, mockMeals)
  );
  const [plannerWeekStart, setPlannerWeekStart] = useState<string>(() =>
    readStorage(STORAGE_KEYS.plannerWeek, defaultWeekStart)
  );
  const [groceryWeekStart, setGroceryWeekStart] = useState<string>(() =>
    readStorage(STORAGE_KEYS.groceryWeek, defaultWeekStart)
  );
  const [weeklyPlans, setWeeklyPlans] = useState<Record<string, WeeklyPlan>>(() => {
    const stored = readStorage<Record<string, WeeklyPlan>>(STORAGE_KEYS.plans, {});
    const normalized = normalizePlansMap(stored);
    if (!normalized[plannerWeekStart]) {
      normalized[plannerWeekStart] = normalizeWeeklyPlan(mockPlan);
    }
    return normalized;
  });
  const weeklyPlan =
    weeklyPlans[plannerWeekStart] ?? normalizeWeeklyPlan(EMPTY_WEEKLY_PLAN);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyPlanByWeek[]>(() =>
    normalizeHistory(readStorage(STORAGE_KEYS.history, []))
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
    writeStorage(STORAGE_KEYS.plans, weeklyPlans);
  }, [weeklyPlans]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.plannerWeek, plannerWeekStart);
  }, [plannerWeekStart]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.groceryWeek, groceryWeekStart);
  }, [groceryWeekStart]);

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
      const [remoteMeals, remoteHistory] = await Promise.all([
        api.getMeals(),
        api.getWeeklyPlans()
      ]);

      if (remoteMeals) setMeals(remoteMeals);
      if (remoteHistory) setWeeklyHistory(normalizeHistory(remoteHistory));

      if (!remoteMeals && !remoteHistory) {
        setSyncStatus('error');
      } else {
        setSyncStatus('idle');
      }
    };

    loadRemote().catch(() => setSyncStatus('error'));
  }, [isOnline]);

  useEffect(() => {
    if (!api.isConfigured || !isOnline) {
      setSyncStatus('offline');
      return;
    }

    const loadGrocery = async () => {
      setSyncStatus('syncing');
      const remoteGrocery = await api.getGroceryItems(groceryWeekStart);
      if (remoteGrocery) {
        const normalizedRemote = normalizeGrocery(remoteGrocery);
        setGroceryItems((prev) => {
          const filtered = prev.filter(
            (item) => (item.weekStart ?? defaultWeekStart) !== groceryWeekStart
          );
          const localWeek = prev.filter(
            (item) => (item.weekStart ?? defaultWeekStart) === groceryWeekStart
          );
          return [...filtered, ...mergeGroceryForWeek(localWeek, normalizedRemote)];
        });
        setSyncStatus('idle');
      } else {
        setSyncStatus('error');
      }
    };

    loadGrocery().catch(() => setSyncStatus('error'));
  }, [groceryWeekStart, isOnline, defaultWeekStart, mergeGroceryForWeek]);

  useEffect(() => {
    setWeeklyPlans((prev) => {
      if (prev[plannerWeekStart]) return prev;
      return { ...prev, [plannerWeekStart]: normalizeWeeklyPlan(EMPTY_WEEKLY_PLAN) };
    });

    if (!api.isConfigured || !isOnline) {
      setSyncStatus('offline');
      return;
    }

    const loadPlan = async () => {
      setSyncStatus('syncing');
      const remotePlan = await api.getWeeklyPlan(plannerWeekStart);
      if (remotePlan) {
        const normalizedPlan = normalizeWeeklyPlan(remotePlan);
        setWeeklyPlans((prev) => ({
          ...prev,
          [plannerWeekStart]: normalizedPlan
        }));
        setWeeklyHistory((prev) => {
          const next = prev.filter((entry) => entry.weekStart !== plannerWeekStart);
          return [{ weekStart: plannerWeekStart, days: normalizedPlan }, ...next];
        });
        setSyncStatus('idle');
      } else {
        setSyncStatus('error');
      }
    };

    loadPlan().catch(() => setSyncStatus('error'));
  }, [plannerWeekStart, isOnline]);

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
    void (async () => {
      const remote = await syncCall(() => api.createGroceryItem(next));
      if (!remote) return;
      setGroceryItems((prev) => {
        const key = getGroceryKey(remote);
        const filtered = prev.filter((existing) => getGroceryKey(existing) !== key);
        return [remote, ...filtered];
      });
    })();
  }, [syncCall, defaultWeekStart, getGroceryKey]);

  const updateGroceryItem = useCallback((id: string, update: Partial<GroceryItem>) => {
    const updatedAt = new Date().toISOString();
    setGroceryItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...update, updatedAt }
          : item
      )
    );
    void syncCall(() => api.updateGroceryItem(id, { ...update, updatedAt }));
  }, [syncCall]);

  const deleteGroceryItem = useCallback((id: string) => {
    setGroceryItems((prev) => prev.filter((item) => item.id !== id));
    void syncCall(() => api.deleteGroceryItem(id));
  }, [syncCall]);

  const toggleGroceryItem = useCallback(
    (id: string, nextChecked?: boolean) => {
      let resolved: boolean | undefined = nextChecked;
      const updatedAt = new Date().toISOString();
      setGroceryItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = nextChecked ?? !item.checked;
          resolved = updated;
          return {
            ...item,
            checked: updated,
            updatedAt
          };
        })
      );
      if (resolved !== undefined) {
        void syncCall(() => api.updateGroceryItem(id, { checked: resolved, updatedAt }));
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
    setWeeklyPlans((prev) => {
      const next: Record<string, WeeklyPlan> = {};
      Object.keys(prev).forEach((week) => {
        const plan = { ...prev[week] };
        (Object.keys(plan) as Array<keyof WeeklyPlan>).forEach((day) => {
          plan[day] = plan[day].filter((mealId) => mealId !== id);
        });
        next[week] = plan;
      });
      return next;
    });
    void syncCall(() => api.deleteMeal(id));
  }, [syncCall]);

  const updateWeeklyPlan = useCallback(
    (day: keyof WeeklyPlan, mealIds: string[]) => {
      setWeeklyPlans((prev) => {
        const current = prev[plannerWeekStart] ?? normalizeWeeklyPlan(EMPTY_WEEKLY_PLAN);
        const nextPlan = { ...current, [day]: mealIds } as WeeklyPlan;
        const next = { ...prev, [plannerWeekStart]: nextPlan };
        setWeeklyHistory((history) => {
          const filtered = history.filter((entry) => entry.weekStart !== plannerWeekStart);
          return [{ weekStart: plannerWeekStart, days: nextPlan }, ...filtered];
        });
        void syncCall(() => api.updateWeeklyPlan(nextPlan, plannerWeekStart));
        return next;
      });
    },
    [plannerWeekStart, syncCall]
  );

  const saveWeeklySnapshot = useCallback(() => {
    const snapshot: WeeklyPlanByWeek = {
      weekStart: plannerWeekStart,
      days: weeklyPlan
    };
    setWeeklyHistory((prev) => {
      const next = [snapshot, ...prev.filter((entry) => entry.weekStart !== snapshot.weekStart)];
      return next.slice(0, 12);
    });
  }, [weeklyPlan, plannerWeekStart]);

  const generateGroceryList = useCallback(() => {
    const ingredients = aggregateIngredientsFromPlan(meals, weeklyPlan);
    setGroceryItems((prev) => mergeGroceryItems(prev, ingredients, plannerWeekStart));
    void (async () => {
      const result = await syncCall(() =>
        api.generateGroceryList(ingredients, plannerWeekStart)
      );
      if (!result) return;
      const refreshed = await syncCall(() => api.getGroceryItems(plannerWeekStart));
      if (refreshed) {
        const normalizedRefreshed = normalizeGrocery(refreshed);
        setGroceryItems((prev) => {
          const filtered = prev.filter(
            (item) => (item.weekStart ?? defaultWeekStart) !== plannerWeekStart
          );
          const localWeek = prev.filter(
            (item) => (item.weekStart ?? defaultWeekStart) === plannerWeekStart
          );
          return [...filtered, ...mergeGroceryForWeek(localWeek, normalizedRefreshed)];
        });
      }
    })();
    saveWeeklySnapshot();
  }, [
    meals,
    weeklyPlan,
    syncCall,
    saveWeeklySnapshot,
    plannerWeekStart,
    mergeGroceryForWeek,
    defaultWeekStart
  ]);

  const loadWeeklySnapshot = useCallback(
    (snapshot: WeeklyPlanByWeek) => {
      const normalized = normalizeWeeklyPlan(snapshot.days);
      setPlannerWeekStart(snapshot.weekStart);
      setWeeklyPlans((prev) => ({
        ...prev,
        [snapshot.weekStart]: normalized
      }));
      void syncCall(() => api.updateWeeklyPlan(normalized, snapshot.weekStart));
    },
    [syncCall]
  );

  const value = useMemo(
    () => ({
      groceryItems,
      meals,
      plannerWeekStart,
      groceryWeekStart,
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
      setPlannerWeekStart,
      setGroceryWeekStart,
      updateWeeklyPlan,
      generateGroceryList,
      loadWeeklySnapshot
    }),
    [
      groceryItems,
      meals,
      plannerWeekStart,
      groceryWeekStart,
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
      setPlannerWeekStart,
      setGroceryWeekStart,
      updateWeeklyPlan,
      generateGroceryList,
      loadWeeklySnapshot
    ]
  );

  return value;
};
