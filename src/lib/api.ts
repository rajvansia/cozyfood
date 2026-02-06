import { GroceryItem, Meal, WeeklyPlan, WeeklyPlanSnapshot } from './types';

const RAW_API_BASE = import.meta.env.VITE_API_BASE as string | undefined;
const API_BASE = import.meta.env.DEV
  ? '/api'
  : RAW_API_BASE
    ? RAW_API_BASE.replace(/\/+$/, '')
    : undefined;
const METHOD_OVERRIDE = import.meta.env.VITE_API_METHOD_OVERRIDE === 'true';

type FetchOptions = RequestInit & { json?: unknown };

const buildUrl = (path: string, method: string) => {
  const params = new URLSearchParams();
  if (METHOD_OVERRIDE && method !== 'GET' && method !== 'POST') {
    params.set('method', method);
  }
  const query = params.toString();
  if (!query) return `${API_BASE}${path}`;
  const joiner = path.includes('?') ? '&' : '?';
  return `${API_BASE}${path}${joiner}${query}`;
};

const fetchJson = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  if (!API_BASE) {
    throw new Error('API base URL not configured');
  }
  const method = (options.method ?? 'GET').toUpperCase();
  const useOverride = METHOD_OVERRIDE && method !== 'GET' && method !== 'POST';
  const body = options.json ? JSON.stringify(options.json) : options.body;
  const response = await fetch(buildUrl(path, method), {
    ...options,
    method: useOverride ? 'POST' : method,
    headers: {
      ...(options.headers ?? {})
    },
    body
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
};

const safeFetch = async <T>(path: string, options?: FetchOptions): Promise<T | null> => {
  try {
    return await fetchJson<T>(path, options);
  } catch {
    return null;
  }
};

export const api = {
  isConfigured: Boolean(API_BASE),
  getGroceryItems: () => safeFetch<GroceryItem[]>('/grocery-items'),
  createGroceryItem: (item: GroceryItem) =>
    safeFetch<GroceryItem>('/grocery-items', { method: 'POST', json: item }),
  updateGroceryItem: (id: string, item: Partial<GroceryItem>) =>
    safeFetch<GroceryItem>(`/grocery-items/${id}`, { method: 'PATCH', json: item }),
  deleteGroceryItem: (id: string) =>
    safeFetch<{ ok: boolean }>(`/grocery-items/${id}`, { method: 'DELETE' }),
  getMeals: () => safeFetch<Meal[]>('/meals'),
  createMeal: (meal: Meal) =>
    safeFetch<Meal>('/meals', { method: 'POST', json: meal }),
  updateMeal: (id: string, meal: Meal) =>
    safeFetch<Meal>(`/meals/${id}`, { method: 'PUT', json: meal }),
  deleteMeal: (id: string) =>
    safeFetch<{ ok: boolean }>(`/meals/${id}`, { method: 'DELETE' }),
  getWeeklyPlan: () => safeFetch<WeeklyPlan>('/weekly-plan'),
  updateWeeklyPlan: (plan: WeeklyPlan) =>
    safeFetch<WeeklyPlan>('/weekly-plan', { method: 'PUT', json: plan }),
  getWeeklyPlanHistory: () => safeFetch<WeeklyPlanSnapshot[]>('/weekly-plan-history'),
  saveWeeklyPlanHistory: (snapshot: WeeklyPlanSnapshot) =>
    safeFetch<WeeklyPlanSnapshot>('/weekly-plan-history', {
      method: 'POST',
      json: snapshot
    }),
  generateGroceryList: (plan: WeeklyPlan) =>
    safeFetch<{ ok: boolean; added?: number }>('/generate-grocery-list', {
      method: 'POST',
      json: plan
    })
};
