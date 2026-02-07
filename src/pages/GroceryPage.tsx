import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Checkbox } from '../components/ui/Checkbox';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import {
  CATEGORY_LABELS,
  EMPTY_WEEKLY_PLAN,
  formatQuantity,
  formatWeekLabel,
  getWeekStartKey,
  normalizeName,
  sortGroceryItems
} from '../lib/utils';
import { Category, GroceryItem, Meal, WeeklyPlan, WeeklyPlanByWeek } from '../lib/types';

const categoryOptions: Category[] = [
  'produce',
  'dairy',
  'pantry',
  'frozen',
  'bakery',
  'meat',
  'snacks',
  'other'
];

type GroceryPageProps = {
  groceryItems: GroceryItem[];
  meals: Meal[];
  weeklyHistory: WeeklyPlanByWeek[];
  onAdd: (item: Omit<GroceryItem, 'id' | 'updatedAt'>) => void;
  onUpdate: (id: string, update: Partial<GroceryItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
};

type GroceryFormState = {
  name: string;
  quantity: string;
  unit: string;
  category: Category;
};

const defaultForm: GroceryFormState = {
  name: '',
  quantity: '1',
  unit: '',
  category: 'produce'
};

export const GroceryPage = ({
  groceryItems,
  meals,
  weeklyHistory,
  onAdd,
  onUpdate,
  onDelete,
  onToggle
}: GroceryPageProps) => {
  const [form, setForm] = useState<GroceryFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [pulseId, setPulseId] = useState<string | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const itemPositions = useRef(new Map<string, DOMRect>());

  const currentWeekStart = useMemo(() => getWeekStartKey(new Date()), []);
  const selectedWeekStart =
    selectedWeek === 'current' ? currentWeekStart : selectedWeek;
  const dayKeys: Array<keyof WeeklyPlan> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const sortedItems = useMemo(() => {
    const filtered = groceryItems.filter(
      (item) => (item.weekStart ?? currentWeekStart) === selectedWeekStart
    );
    return sortGroceryItems(filtered);
  }, [groceryItems, currentWeekStart, selectedWeekStart]);

  const weekOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [
      { id: 'current', label: `This week (${formatWeekLabel(currentWeekStart)})` }
    ];
    weeklyHistory.forEach((snapshot) => {
      if (snapshot.weekStart === currentWeekStart) return;
      options.push({
        id: snapshot.weekStart,
        label: `Week of ${formatWeekLabel(snapshot.weekStart)}`
      });
    });
    return options;
  }, [currentWeekStart, weeklyHistory]);

  const selectedWeekPlan = useMemo(() => {
    const match = weeklyHistory.find((entry) => entry.weekStart === selectedWeekStart);
    return match?.days ?? EMPTY_WEEKLY_PLAN;
  }, [selectedWeekStart, weeklyHistory]);

  const mealsForWeek = useMemo(() => {
    const seen = new Set<string>();
    const orderedIds: string[] = [];
    dayKeys.forEach((day) => {
      selectedWeekPlan[day].forEach((mealId) => {
        if (!seen.has(mealId)) {
          seen.add(mealId);
          orderedIds.push(mealId);
        }
      });
    });
    return orderedIds
      .map((id) => meals.find((meal) => meal.id === id))
      .filter((meal): meal is Meal => Boolean(meal));
  }, [dayKeys, meals, selectedWeekPlan]);

  const ingredientToMeals = useMemo(() => {
    const map = new Map<string, string[]>();
    mealsForWeek.forEach((meal) => {
      meal.ingredients.forEach((ingredient) => {
        const key = normalizeName(ingredient.ingredient);
        const existing = map.get(key) ?? [];
        if (!existing.includes(meal.mealName)) {
          existing.push(meal.mealName);
        }
        map.set(key, existing);
      });
    });
    return map;
  }, [mealsForWeek]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const supportsTranslate = useMemo(() => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
    return CSS.supports('translate', '1px 1px');
  }, []);

  useLayoutEffect(() => {
    const newPositions = new Map<string, DOMRect>();
    itemRefs.current.forEach((node, id) => {
      newPositions.set(id, node.getBoundingClientRect());
    });

    const prevPositions = itemPositions.current;
    itemPositions.current = newPositions;

    if (prevPositions.size === 0 || prefersReducedMotion || !supportsTranslate) {
      return;
    }

    newPositions.forEach((rect, id) => {
      const prev = prevPositions.get(id);
      if (!prev) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (dx === 0 && dy === 0) return;
      const node = itemRefs.current.get(id);
      if (!node) return;
      node.style.transition = 'translate 0s';
      node.style.translate = `${dx}px ${dy}px`;
      window.requestAnimationFrame(() => {
        const currentNode = itemRefs.current.get(id);
        if (!currentNode) return;
        currentNode.style.transition = 'translate 560ms cubic-bezier(0.22, 0.61, 0.36, 1)';
        currentNode.style.translate = '0px 0px';
      });
    });
  }, [sortedItems, prefersReducedMotion, supportsTranslate]);



  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number.parseFloat(form.quantity);
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      quantity: Number.isNaN(quantity) ? 1 : quantity,
      unit: form.unit.trim() || undefined,
      category: form.category,
      weekStart: selectedWeekStart
    };

    if (editingId) {
      onUpdate(editingId, payload);
      setEditingId(null);
    } else {
      onAdd({ ...payload, checked: false });
    }

    setForm(defaultForm);
  };

  const handleEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit ?? '',
      category: item.category
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleToggle = (id: string) => {
    onToggle(id);
    setPulseId(id);
    if (pulseTimer.current) {
      window.clearTimeout(pulseTimer.current);
    }
    pulseTimer.current = window.setTimeout(() => {
      setPulseId(null);
      pulseTimer.current = null;
    }, 500);
  };

  return (
    <section className="space-y-6">
      <Card className="animate-fadeIn">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Grocery List</h2>
            <p className="text-sm text-ink/70">Tap to check items off your basket.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Week of {formatWeekLabel(selectedWeekStart)}</Badge>
            <Select
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
              className="max-w-[240px]"
            >
              {weekOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {mealsForWeek.length === 0 && (
            <p className="text-sm text-ink/60">No meals planned for this week.</p>
          )}
          {mealsForWeek.map((meal) => (
            <Badge key={meal.id}>{meal.mealName}</Badge>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {sortedItems.length === 0 && (
          <Card className="text-center">
            <p className="text-ink/70">Your basket is empty. Add your first item below.</p>
          </Card>
        )}
        {sortedItems.map((item) => (
          <div
            key={item.id}
            ref={(node) => {
              if (node) {
                itemRefs.current.set(item.id, node);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
            className="will-change-transform"
          >
            <Card
              className={`flex items-center justify-between gap-3 transition-all duration-300 ${
                item.checked ? 'opacity-60 bg-mint/30 border-leaf/30' : ''
              } ${pulseId === item.id ? 'animate-pulseOnce' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={item.checked} onChange={() => handleToggle(item.id)} />
                <div>
                  <p className={`font-semibold text-ink ${item.checked ? 'line-through' : ''}`}>
                    {item.name}
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatQuantity(item.quantity)} {item.unit ?? ''}
                  </p>
                  {ingredientToMeals.has(normalizeName(item.name)) && (
                    <p className="text-xs text-ink/60">
                      Used in: {ingredientToMeals.get(normalizeName(item.name))?.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{CATEGORY_LABELS[item.category]}</Badge>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => handleEdit(item)}
                  aria-label="Edit item"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete item"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <Card className="animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-ink">
              {editingId ? 'Edit item' : 'Add item'}
            </h3>
            <p className="text-sm text-ink/70">
              Add new items to the selected week’s list.
            </p>
          </div>
          <Badge>Week of {formatWeekLabel(selectedWeekStart)}</Badge>
        </div>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Item name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="Qty"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
              />
              <Input
                placeholder="Unit"
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value as Category }))
              }
              className="max-w-[220px]"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
            <Button type="submit" className="gap-2">
              <PlusIcon className="h-4 w-4" />
              {editingId ? 'Update item' : 'Add item'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
};
