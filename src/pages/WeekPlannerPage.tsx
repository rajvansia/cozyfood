import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SparkleIcon } from '../components/icons';
import { DayKey, Meal, WeeklyPlan, WeeklyPlanSnapshot } from '../lib/types';
import {
  FULL_DAY_LABELS,
  aggregateIngredientsFromPlan,
  formatWeekLabel
} from '../lib/utils';

const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type WeekPlannerPageProps = {
  meals: Meal[];
  weeklyPlan: WeeklyPlan;
  weeklyHistory: WeeklyPlanSnapshot[];
  onPlanChange: (day: DayKey, mealId: string | null) => void;
  onGenerate: () => void;
  onLoadHistory: (snapshot: WeeklyPlanSnapshot) => void;
};

export const WeekPlannerPage = ({
  meals,
  weeklyPlan,
  weeklyHistory,
  onPlanChange,
  onGenerate,
  onLoadHistory
}: WeekPlannerPageProps) => {
  const [celebrate, setCelebrate] = useState(false);

  const ingredientCount = useMemo(() => {
    return aggregateIngredientsFromPlan(meals, weeklyPlan).length;
  }, [meals, weeklyPlan]);

  const mealMap = useMemo(() => {
    return new Map(meals.map((meal) => [meal.id, meal.mealName]));
  }, [meals]);

  const handleGenerate = () => {
    onGenerate();
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1200);
  };

  return (
    <section className="space-y-6">
      <Card className="animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Weekly Planner</h2>
            <p className="text-sm text-ink/70">Assign meals, then grow your grocery list.</p>
          </div>
          <Badge>{ingredientCount} ingredients</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {days.map((day) => (
            <div key={day} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-24 text-sm font-semibold text-ink/80">{FULL_DAY_LABELS[day]}</span>
              <Select
                value={weeklyPlan[day] ?? ''}
                onChange={(event) =>
                  onPlanChange(day, event.target.value ? event.target.value : null)
                }
              >
                <option value="">No meal</option>
                {meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.mealName}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} className="gap-2">
            <SparkleIcon className={celebrate ? 'h-4 w-4 animate-breathe' : 'h-4 w-4'} />
            Generate Grocery List
          </Button>
          {celebrate && (
            <span className="text-sm font-semibold text-leaf">
              Leaves flutter... grocery list updated!
            </span>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-ink">Meal peek</h3>
        <p className="text-sm text-ink/70">
          Tap a day to remind the family what’s on the menu. Ingredient totals will blend
          together when you generate the list.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {days.map((day) => {
            const meal = meals.find((entry) => entry.id === weeklyPlan[day]);
            return (
              <div key={day} className="rounded-cozy border border-cream/70 bg-cream p-3">
                <p className="text-sm font-semibold text-ink/80">{FULL_DAY_LABELS[day]}</p>
                <p className="font-semibold text-ink">
                  {meal ? meal.mealName : 'Free evening'}
                </p>
                {meal && (
                  <p className="text-xs text-ink/60">
                    {meal.ingredients.length} ingredients
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-ink">Weekly history</h3>
            <p className="text-sm text-ink/70">
              Revisit past weeks and reload a plan anytime.
            </p>
          </div>
          <Badge>{weeklyHistory.length} saved</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {weeklyHistory.length === 0 && (
            <div className="rounded-cozy border border-cream/70 bg-cream p-4 text-center text-sm text-ink/70">
              No history yet. Generate a grocery list to save this week.
            </div>
          )}
          {weeklyHistory.map((snapshot) => (
            <div
              key={snapshot.weekStart}
              className="rounded-cozy border border-cream/70 bg-cream p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink/70">
                    Week of {formatWeekLabel(snapshot.weekStart)}
                  </p>
                  <p className="text-xs text-ink/60">
                    Saved {new Date(snapshot.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => onLoadHistory(snapshot)}
                >
                  Load week
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {days.map((day) => {
                  const mealId = snapshot.days[day];
                  return (
                    <div
                      key={`${snapshot.weekStart}-${day}`}
                      className="rounded-full bg-fog px-3 py-2 text-xs font-semibold text-ink/70"
                    >
                      {FULL_DAY_LABELS[day]} · {mealId ? mealMap.get(mealId) ?? 'Meal' : 'Off'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
};
