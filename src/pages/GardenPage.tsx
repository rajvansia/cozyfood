import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import { LightLevel, Plant, PlantStatus } from '../lib/types';

type PlantFormState = {
  name: string;
  variety: string;
  location: string;
  light: LightLevel;
  wateringEvery: string;
  lastWatered: string;
  notes: string;
  status: PlantStatus;
};

const dayMs = 24 * 60 * 60 * 1000;

const todayKey = () => new Date().toISOString().slice(0, 10);
const parseDateKey = (value?: string) => (value ? new Date(`${value}T00:00:00`) : null);
const formatDateLabel = (value?: string) => {
  if (!value) return 'Not yet';
  const date = parseDateKey(value);
  return date
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : value;
};

const locationOptions = [
  'Kitchen window',
  'Living room',
  'Balcony',
  'Backyard',
  'Front porch',
  'Greenhouse'
];

const lightOptions: Array<{ value: LightLevel; label: string }> = [
  { value: 'low', label: 'Low light' },
  { value: 'medium', label: 'Medium light' },
  { value: 'bright', label: 'Bright light' }
];

const statusOptions: Array<{ value: PlantStatus; label: string }> = [
  { value: 'seedling', label: 'Seedling' },
  { value: 'growing', label: 'Growing' },
  { value: 'blooming', label: 'Blooming' },
  { value: 'harvest', label: 'Harvest' },
  { value: 'resting', label: 'Resting' }
];

const defaultForm: PlantFormState = {
  name: '',
  variety: '',
  location: locationOptions[0],
  light: 'medium',
  wateringEvery: '5',
  lastWatered: todayKey(),
  notes: '',
  status: 'growing'
};

type GardenPageProps = {
  plants: Plant[];
  onAdd: (plant: Omit<Plant, 'id' | 'updatedAt'>) => void;
  onUpdate: (plant: Plant) => void;
  onDelete: (id: string) => void;
};

export const GardenPage = ({ plants, onAdd, onUpdate, onDelete }: GardenPageProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlantFormState>(defaultForm);

  const plantMeta = useMemo(() => {
    const today = new Date();
    return plants.map((plant) => {
      const last = parseDateKey(plant.lastWatered);
      const next = last ? new Date(last.getTime() + plant.wateringEvery * dayMs) : null;
      const daysSince = last ? Math.floor((today.getTime() - last.getTime()) / dayMs) : null;
      const needsWater = !last || (daysSince !== null && daysSince >= plant.wateringEvery);
      return { plant, next, needsWater, daysSince };
    });
  }, [plants]);

  const dueCount = plantMeta.filter((entry) => entry.needsWater).length;
  const nextWaterDate = useMemo(() => {
    const upcoming = plantMeta
      .map((entry) => entry.next)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());
    return upcoming[0];
  }, [plantMeta]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const wateringEvery = Number.parseInt(form.wateringEvery, 10);
    const payload: Omit<Plant, 'id' | 'updatedAt'> = {
      name: form.name.trim(),
      variety: form.variety.trim() || undefined,
      location: form.location,
      light: form.light,
      wateringEvery: Number.isNaN(wateringEvery) ? 5 : Math.max(1, wateringEvery),
      lastWatered: form.lastWatered || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status
    };

    if (editingId) {
      onUpdate({ id: editingId, updatedAt: new Date().toISOString(), ...payload });
    } else {
      onAdd(payload);
    }

    setEditingId(null);
    setForm(defaultForm);
  };

  const handleEdit = (plant: Plant) => {
    setEditingId(plant.id);
    setForm({
      name: plant.name,
      variety: plant.variety ?? '',
      location: plant.location,
      light: plant.light,
      wateringEvery: plant.wateringEvery.toString(),
      lastWatered: plant.lastWatered ?? todayKey(),
      notes: plant.notes ?? '',
      status: plant.status
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleWatered = (id: string) => {
    const wateredAt = todayKey();
    const plant = plants.find((item) => item.id === id);
    if (!plant) return;
    onUpdate({ ...plant, lastWatered: wateredAt });
  };

  return (
    <section className="space-y-6">
      <Card className="animate-fadeIn">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Garden</h2>
            <p className="text-sm text-ink/70">Keep your plants happy and hydrated.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{plants.length} plants</Badge>
            <Badge className={dueCount ? 'bg-peach/70 text-ink' : ''}>
              {dueCount} need water
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink/70">
          <span>
            Next water day:{' '}
            <strong className="text-ink">
              {nextWaterDate
                ? nextWaterDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })
                : 'No schedule yet'}
            </strong>
          </span>
          <span>Tip: Tap “Watered today” to reset the timer.</span>
        </div>
      </Card>

      <Card className="animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-ink">
              {editingId ? 'Update plant' : 'Add a plant'}
            </h3>
            <p className="text-sm text-ink/70">
              Track light, water rhythm, and little notes.
            </p>
          </div>
        </div>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Plant name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Variety (optional)"
              value={form.variety}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, variety: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
            >
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </Select>
            <Select
              value={form.light}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, light: event.target.value as LightLevel }))
              }
            >
              {lightOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="Water every (days)"
              value={form.wateringEvery}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, wateringEvery: event.target.value }))
              }
            />
            <Input
              type="date"
              value={form.lastWatered}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, lastWatered: event.target.value }))
              }
            />
            <Select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as PlantStatus }))
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="gap-2">
              <PlusIcon className="h-4 w-4" />
              {editingId ? 'Update plant' : 'Add plant'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {plantMeta.length === 0 && (
          <Card className="text-center">
            <p className="text-ink/70">No plants yet. Add your first leafy friend.</p>
          </Card>
        )}
        {plantMeta.map(({ plant, next, needsWater, daysSince }) => (
          <Card key={plant.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">
                    {plant.name}
                    {plant.variety ? ` · ${plant.variety}` : ''}
                  </h3>
                  <Badge>{plant.status}</Badge>
                  {needsWater && <Badge className="bg-peach/70 text-ink">Needs water</Badge>}
                </div>
                <p className="text-sm text-ink/70">
                  {plant.location} · {plant.light} light
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => handleEdit(plant)}
                  aria-label="Edit plant"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink/70 transition hover:bg-oatmeal hover:text-ink"
                  onClick={() => onDelete(plant.id)}
                  aria-label="Delete plant"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-ink/70">
              Water every <strong className="text-ink">{plant.wateringEvery} days</strong> ·
              Last: <strong className="text-ink">{formatDateLabel(plant.lastWatered)}</strong> ·
              Next:{' '}
              <strong className="text-ink">
                {next
                  ? next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : 'TBD'}
              </strong>
              {daysSince !== null && (
                <span className="text-ink/60"> · {daysSince} days ago</span>
              )}
            </div>
            {plant.notes && <p className="text-sm text-ink/70">{plant.notes}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => handleWatered(plant.id)}
              >
                Watered today
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
