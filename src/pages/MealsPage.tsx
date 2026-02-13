import { FormEvent, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import { Meal, Ingredient } from '../lib/types';
import { generateId } from '../lib/utils';

const createIngredient = (): Ingredient => ({
  id: generateId(),
  ingredient: '',
  quantity: 1,
  unit: ''
});

type MealsPageProps = {
  meals: Meal[];
  syncingIds?: string[];
  onAdd: (meal: Omit<Meal, 'id'>) => void;
  onUpdate: (meal: Meal) => void;
  onDelete: (id: string) => void;
};

export const MealsPage = ({
  meals,
  syncingIds = [],
  onAdd,
  onUpdate,
  onDelete
}: MealsPageProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([createIngredient()]);

  const handleIngredientChange = (id: string, changes: Partial<Ingredient>) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, createIngredient()]);
  };

  const removeIngredientRow = (id: string) => {
    setIngredients((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const resetForm = () => {
    setEditingId(null);
    setMealName('');
    setNotes('');
    setIngredients([createIngredient()]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!mealName.trim()) return;

    const cleanedIngredients = ingredients
      .filter((item) => item.ingredient.trim())
      .map((item) => ({
        ...item,
        ingredient: item.ingredient.trim(),
        unit: item.unit?.trim() || undefined,
        quantity: Number.isNaN(item.quantity) ? 1 : Number(item.quantity)
      }));

    if (!cleanedIngredients.length) return;

    const payload = {
      mealName: mealName.trim(),
      notes: notes.trim() || undefined,
      ingredients: cleanedIngredients
    };

    if (editingId) {
      onUpdate({ id: editingId, ...payload });
    } else {
      onAdd(payload);
    }

    resetForm();
  };

  const handleEdit = (meal: Meal) => {
    setEditingId(meal.id);
    setMealName(meal.mealName);
    setNotes(meal.notes ?? '');
    setIngredients(
      meal.ingredients.map((ingredient) => ({
        ...ingredient,
        id: ingredient.id || generateId()
      }))
    );
  };

  return (
    <section className="space-y-6">
      <Card className="animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Meals</h2>
            <p className="text-sm text-ink/70">Save family favorites for easy planning.</p>
          </div>
          <Badge>Family recipes</Badge>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            placeholder="Meal name"
            value={mealName}
            onChange={(event) => setMealName(event.target.value)}
          />
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <div className="space-y-3">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Ingredient"
                  value={ingredient.ingredient}
                  onChange={(event) =>
                    handleIngredientChange(ingredient.id, { ingredient: event.target.value })
                  }
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Qty"
                    value={ingredient.quantity}
                    onChange={(event) =>
                      handleIngredientChange(ingredient.id, {
                        quantity: Number(event.target.value)
                      })
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={ingredient.unit ?? ''}
                    onChange={(event) =>
                      handleIngredientChange(ingredient.id, { unit: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="rounded-full p-2 text-ink/60 transition hover:bg-oatmeal hover:text-ink"
                    onClick={() => removeIngredientRow(ingredient.id)}
                    aria-label="Remove ingredient"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="soft" size="sm" onClick={addIngredientRow}>
              Add ingredient
            </Button>
            <Button type="submit" className="gap-2">
              <PlusIcon className="h-4 w-4" />
              {editingId ? 'Update meal' : 'Save meal'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {meals.length === 0 && (
          <Card className="text-center">
            <p className="text-ink/70">No meals yet. Add your first cozy recipe.</p>
          </Card>
        )}
        {meals.map((meal) => (
          <Card key={meal.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{meal.mealName}</h3>
                  {syncingIds.includes(meal.id) && (
                    <Badge className="bg-sky/60 text-ink/70 animate-pulse">
                      Syncing…
                    </Badge>
                  )}
                </div>
                {meal.notes && <p className="text-sm text-ink/70">{meal.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => handleEdit(meal)}
                  aria-label="Edit meal"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => onDelete(meal.id)}
                  aria-label="Delete meal"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {meal.ingredients.map((ingredient) => (
                <Badge key={ingredient.id}>
                  {ingredient.ingredient} · {ingredient.quantity}
                  {ingredient.unit ? ` ${ingredient.unit}` : ''}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
