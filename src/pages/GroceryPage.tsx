import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Checkbox } from '../components/ui/Checkbox';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import {
  CATEGORY_LABELS,
  formatQuantity,
  formatWeekLabel,
  getWeekStartKey,
  sortGroceryItems
} from '../lib/utils';
import { Category, GroceryItem, WeeklyPlanSnapshot } from '../lib/types';

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
  weeklyHistory: WeeklyPlanSnapshot[];
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
  weeklyHistory,
  onAdd,
  onUpdate,
  onDelete,
  onToggle
}: GroceryPageProps) => {
  const [form, setForm] = useState<GroceryFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('current');

  const currentWeekStart = useMemo(() => getWeekStartKey(new Date()), []);
  const selectedWeekStart =
    selectedWeek === 'current' ? currentWeekStart : selectedWeek;

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

      <div className="space-y-3">
        {sortedItems.length === 0 && (
          <Card className="text-center">
            <p className="text-ink/70">Your basket is empty. Add your first item above.</p>
          </Card>
        )}
        {sortedItems.map((item) => (
          <Card
            key={item.id}
            className={`flex items-center justify-between gap-3 transition-all duration-300 ${
              item.checked ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={item.checked} onChange={() => onToggle(item.id)} />
              <div>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-sm text-ink/70">
                  {formatQuantity(item.quantity)} {item.unit ?? ''}
                </p>
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
        ))}
      </div>
    </section>
  );
};
