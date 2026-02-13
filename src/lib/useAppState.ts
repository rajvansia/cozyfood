import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  buildGroceryItemsForWeek,
  EMPTY_WEEKLY_PLAN,
  generateId,
  getWeekStartKey,
  normalizeName,
  normalizeWeeklyPlan
} from './utils';

const STORAGE_KEYS = {
  grocery: 'cozyfood.grocery',
  meals: 'cozyfood.meals',
  plans: 'cozyfood.plans',
  plannerWeek: 'cozyfood.plannerWeek',
  history: 'cozyfood.history',
  groceryWeek: 'cozyfood.groceryWeek',
  mealsTouched: 'cozyfood.mealsTouched',
  mealsDeleted: 'cozyfood.mealsDeleted',
  plansTouched: 'cozyfood.plansTouched'
};

const DAY_KEYS: Array<keyof WeeklyPlan> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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
      weekStart: item.weekStart ?? defaultWeekStart,
      source: item.source ?? 'manual'
    }));
  const normalizeHistory = (history: WeeklyPlanByWeek[]) =>
    history.map((snapshot) => ({
      ...snapshot,
      days: normalizeWeeklyPlan(snapshot.days)
    }));
  const getGroceryKey = useCallback(
    (item: GroceryItem) => {
      const week = item.weekStart ?? defaultWeekStart;
      const source = item.source ?? 'manual';
      return `${normalizeName(item.name)}|${item.unit ?? ''}|${week}|${source}`;
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
  const areMealsEqual = useCallback((left: Meal, right: Meal) => {
    if (left.mealName !== right.mealName) return false;
    if ((left.notes ?? '') !== (right.notes ?? '')) return false;
    if (left.ingredients.length !== right.ingredients.length) return false;
    for (let index = 0; index < left.ingredients.length; index += 1) {
      const a = left.ingredients[index];
      const b = right.ingredients[index];
      if (!b) return false;
      if (a.ingredient !== b.ingredient) return false;
      if (Number(a.quantity) !== Number(b.quantity)) return false;
      if ((a.unit ?? '') !== (b.unit ?? '')) return false;
    }
    return true;
  }, []);
  const arePlansEqual = useCallback((left: WeeklyPlan, right: WeeklyPlan) => {
    return DAY_KEYS.every((day) => {
      const leftIds = left[day] ?? [];
      const rightIds = right[day] ?? [];
      if (leftIds.length !== rightIds.length) return false;
      return leftIds.every((id, index) => id === rightIds[index]);
    });
  }, []);
  const mergeWeeklyHistory = useCallback(
    (localHistory: WeeklyPlanByWeek[], remoteHistory: WeeklyPlanByWeek[]) => {
      const map = new Map<string, WeeklyPlanByWeek>();
      remoteHistory.forEach((entry) => {
        map.set(entry.weekStart, {
          weekStart: entry.weekStart,
          days: normalizeWeeklyPlan(entry.days)
        });
      });
      localHistory.forEach((entry) => {
        map.set(entry.weekStart, {
          weekStart: entry.weekStart,
          days: normalizeWeeklyPlan(entry.days)
        });
      });
      return Array.from(map.values()).sort((a, b) =>
        b.weekStart.localeCompare(a.weekStart)
      );
    },
    []
  );

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    normalizeGrocery(readStorage(STORAGE_KEYS.grocery, mockGroceryItems))
  );
  const [meals, setMeals] = useState<Meal[]>(() =>
    readStorage(STORAGE_KEYS.meals, mockMeals)
  );
  const [mealsTouched, setMealsTouched] = useState<Record<string, number>>(() =>
    readStorage(STORAGE_KEYS.mealsTouched, {})
  );
  const [mealsDeleted, setMealsDeleted] = useState<Record<string, number>>(() =>
    readStorage(STORAGE_KEYS.mealsDeleted, {})
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
  const [plansTouched, setPlansTouched] = useState<Record<string, number>>(() =>
    readStorage(STORAGE_KEYS.plansTouched, {})
  );
  const weeklyPlansRef = useRef(weeklyPlans);
  const mealsTouchedRef = useRef(mealsTouched);
  const mealsDeletedRef = useRef(mealsDeleted);
  const plansTouchedRef = useRef(plansTouched);
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
    writeStorage(STORAGE_KEYS.mealsTouched, mealsTouched);
  }, [mealsTouched]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.mealsDeleted, mealsDeleted);
  }, [mealsDeleted]);

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
    writeStorage(STORAGE_KEYS.plansTouched, plansTouched);
  }, [plansTouched]);

  useEffect(() => {
    weeklyPlansRef.current = weeklyPlans;
  }, [weeklyPlans]);

  useEffect(() => {
    mealsTouchedRef.current = mealsTouched;
  }, [mealsTouched]);

  useEffect(() => {
    mealsDeletedRef.current = mealsDeleted;
  }, [mealsDeleted]);

  useEffect(() => {
    plansTouchedRef.current = plansTouched;
  }, [plansTouched]);

  const mealsSyncingIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(mealsTouched).forEach((id) => ids.add(id));
    Object.keys(mealsDeleted).forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [mealsTouched, mealsDeleted]);

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

      if (remoteMeals) {
        const touched = mealsTouchedRef.current;
        const deleted = mealsDeletedRef.current;
        const hasLocalChanges =
          Object.keys(touched).length > 0 || Object.keys(deleted).length > 0;

        if (!hasLocalChanges) {
          setMeals(remoteMeals);
        } else {
          setMeals((prev) => {
            const remoteMap = new Map(remoteMeals.map((meal) => [meal.id, meal]));
            const localMap = new Map(prev.map((meal) => [meal.id, meal]));
            const merged: Meal[] = [];

            prev.forEach((localMeal) => {
              if (deleted[localMeal.id]) return;
              const remote = remoteMap.get(localMeal.id);
              if (remote && !touched[localMeal.id]) {
                merged.push(remote);
              } else {
                merged.push(localMeal);
              }
            });

            remoteMeals.forEach((remoteMeal) => {
              if (deleted[remoteMeal.id]) return;
              if (!localMap.has(remoteMeal.id)) merged.push(remoteMeal);
            });

            const nextTouched: Record<string, number> = { ...touched };
            remoteMeals.forEach((remoteMeal) => {
              const localMeal = localMap.get(remoteMeal.id);
              if (!localMeal) return;
              if (!touched[remoteMeal.id]) return;
              if (areMealsEqual(localMeal, remoteMeal)) {
                delete nextTouched[remoteMeal.id];
              }
            });
            if (Object.keys(nextTouched).length !== Object.keys(touched).length) {
              setMealsTouched(nextTouched);
            }

            const nextDeleted: Record<string, number> = { ...deleted };
            Object.keys(deleted).forEach((id) => {
              if (!remoteMap.has(id)) {
                delete nextDeleted[id];
              }
            });
            if (Object.keys(nextDeleted).length !== Object.keys(deleted).length) {
              setMealsDeleted(nextDeleted);
            }

            return merged;
          });
        }
      }
      if (remoteHistory) {
        const normalizedRemote = normalizeHistory(remoteHistory);
        const hasPlanChanges = Object.keys(plansTouchedRef.current).length > 0;
        if (!hasPlanChanges) {
          setWeeklyHistory(normalizedRemote);
        } else {
          setWeeklyHistory((prev) => mergeWeeklyHistory(prev, normalizedRemote));
        }
      }

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
        const localPlan = weeklyPlansRef.current[plannerWeekStart];
        const touchedAt = plansTouchedRef.current[plannerWeekStart];
        let planToUse = normalizedPlan;
        if (localPlan) {
          if (touchedAt) {
            planToUse = localPlan;
            if (arePlansEqual(localPlan, normalizedPlan)) {
              setPlansTouched((prev) => {
                const next = { ...prev };
                delete next[plannerWeekStart];
                return next;
              });
              planToUse = normalizedPlan;
            }
          }
        }
        setWeeklyPlans((prev) => ({
          ...prev,
          [plannerWeekStart]: planToUse
        }));
        setWeeklyHistory((prev) => {
          const next = prev.filter((entry) => entry.weekStart !== plannerWeekStart);
          return [{ weekStart: plannerWeekStart, days: planToUse }, ...next];
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
      updatedAt: new Date().toISOString(),
      source: item.source ?? 'manual'
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
    setMealsTouched((prev) => ({ ...prev, [next.id]: Date.now() }));
    setMealsDeleted((prev) => {
      if (!prev[next.id]) return prev;
      const nextMap = { ...prev };
      delete nextMap[next.id];
      return nextMap;
    });
    void (async () => {
      const result = await syncCall(() => api.createMeal(next));
      if (!result) return;
      setMealsTouched((prev) => {
        const nextMap = { ...prev };
        delete nextMap[next.id];
        return nextMap;
      });
    })();
  }, [syncCall]);

  const updateMeal = useCallback((meal: Meal) => {
    setMeals((prev) => prev.map((item) => (item.id === meal.id ? meal : item)));
    setMealsTouched((prev) => ({ ...prev, [meal.id]: Date.now() }));
    void (async () => {
      const result = await syncCall(() => api.updateMeal(meal.id, meal));
      if (!result) return;
      setMealsTouched((prev) => {
        const nextMap = { ...prev };
        delete nextMap[meal.id];
        return nextMap;
      });
    })();
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
    setMealsDeleted((prev) => ({ ...prev, [id]: Date.now() }));
    setMealsTouched((prev) => {
      if (!prev[id]) return prev;
      const nextMap = { ...prev };
      delete nextMap[id];
      return nextMap;
    });
    void (async () => {
      const result = await syncCall(() => api.deleteMeal(id));
      if (!result) return;
      setMealsDeleted((prev) => {
        const nextMap = { ...prev };
        delete nextMap[id];
        return nextMap;
      });
    })();
  }, [syncCall]);

  const updateWeeklyPlan = useCallback(
    (day: keyof WeeklyPlan, mealIds: string[]) => {
      const current = weeklyPlansRef.current[plannerWeekStart] ?? normalizeWeeklyPlan(EMPTY_WEEKLY_PLAN);
      const nextPlan = { ...current, [day]: mealIds } as WeeklyPlan;
      setWeeklyPlans((prev) => ({ ...prev, [plannerWeekStart]: nextPlan }));
      setWeeklyHistory((history) => {
        const filtered = history.filter((entry) => entry.weekStart !== plannerWeekStart);
        return [{ weekStart: plannerWeekStart, days: nextPlan }, ...filtered];
      });
      setPlansTouched((prev) => ({ ...prev, [plannerWeekStart]: Date.now() }));
      void (async () => {
        const result = await syncCall(() => api.updateWeeklyPlan(nextPlan, plannerWeekStart));
        if (!result) return;
        setPlansTouched((prev) => {
          const nextMap = { ...prev };
          delete nextMap[plannerWeekStart];
          return nextMap;
        });
      })();
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
    setGroceryItems((prev) => {
      const filtered = prev.filter(
        (item) => (item.weekStart ?? defaultWeekStart) !== plannerWeekStart
      );
      const localWeek = prev.filter(
        (item) => (item.weekStart ?? defaultWeekStart) === plannerWeekStart
      );
      const replacement = buildGroceryItemsForWeek(localWeek, ingredients, plannerWeekStart);
      return [...filtered, ...replacement];
    });
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
    buildGroceryItemsForWeek,
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
      setPlansTouched((prev) => ({ ...prev, [snapshot.weekStart]: Date.now() }));
      void (async () => {
        const result = await syncCall(() => api.updateWeeklyPlan(normalized, snapshot.weekStart));
        if (!result) return;
        setPlansTouched((prev) => {
          const nextMap = { ...prev };
          delete nextMap[snapshot.weekStart];
          return nextMap;
        });
      })();
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
      mealsSyncingIds,
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
      mealsSyncingIds,
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
