import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SparkleIcon } from '../components/icons';
import { DayKey, Meal, WeeklyPlan, WeeklyPlanByWeek } from '../lib/types';
import {
  FULL_DAY_LABELS,
  aggregateIngredientsFromPlan,
  formatWeekLabel,
  getWeekStartByOffset
} from '../lib/utils';

const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type WeekPlannerPageProps = {
  meals: Meal[];
  weeklyPlan: WeeklyPlan;
  weeklyHistory: WeeklyPlanByWeek[];
  selectedWeekStart: string;
  onWeekChange: (weekStart: string) => void;
  onPlanChange: (day: DayKey, mealIds: string[]) => void;
  onGenerate: () => void;
  onLoadHistory: (snapshot: WeeklyPlanByWeek) => void;
};

export const WeekPlannerPage = ({
  meals,
  weeklyPlan,
  weeklyHistory,
  selectedWeekStart,
  onWeekChange,
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

  const weekOptions = useMemo(() => {
    const options = Array.from({ length: 6 }, (_, index) => {
      const weekStart = getWeekStartByOffset(index);
      return {
        weekStart,
        label: index === 0 ? `This week (${formatWeekLabel(weekStart)})` : `Week of ${formatWeekLabel(weekStart)}`
      };
    });
    if (!options.find((option) => option.weekStart === selectedWeekStart)) {
      options.unshift({
        weekStart: selectedWeekStart,
        label: `Week of ${formatWeekLabel(selectedWeekStart)}`
      });
    }
    return options;
  }, [selectedWeekStart]);

  const addMealToDay = (day: DayKey, mealId: string) => {
    if (!mealId) return;
    const existing = weeklyPlan[day];
    if (existing.includes(mealId)) return;
    onPlanChange(day, [...existing, mealId]);
  };

  const removeMealFromDay = (day: DayKey, mealId: string) => {
    onPlanChange(
      day,
      weeklyPlan[day].filter((id) => id !== mealId)
    );
  };

  const handleGenerate = () => {
    onGenerate();
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1200);
  };

  return (
    <section className="space-y-6">
      <Card className="animate-fadeIn">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Weekly Planner</h2>
            <p className="text-sm text-ink/70">Assign meals, then grow your grocery list.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{ingredientCount} ingredients</Badge>
            <Select value={selectedWeekStart} onChange={(event) => onWeekChange(event.target.value)}>
              {weekOptions.map((option) => (
                <option key={option.weekStart} value={option.weekStart}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {days.map((day) => (
            <div key={day} className="rounded-cozy border border-cream/70 bg-cream p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-ink/80">
                  {FULL_DAY_LABELS[day]}
                </span>
                <Select
                  value=""
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) addMealToDay(day, value);
                  }}
                >
                  <option value="">Add a meal…</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.mealName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {weeklyPlan[day].length === 0 && (
                  <span className="text-xs text-ink/60">No meals planned</span>
                )}
                {weeklyPlan[day].map((mealId) => (
                  <button
                    key={`${day}-${mealId}`}
                    type="button"
                    className="flex items-center gap-2 rounded-full bg-fog px-3 py-1 text-xs font-semibold text-ink/70"
                    onClick={() => removeMealFromDay(day, mealId)}
                  >
                    {mealMap.get(mealId) ?? 'Meal'}
                    <span className="text-ink/40">×</span>
                  </button>
                ))}
              </div>
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
            const mealsForDay = weeklyPlan[day]
              .map((id) => meals.find((entry) => entry.id === id))
              .filter((meal): meal is Meal => Boolean(meal));
            return (
              <div key={day} className="rounded-cozy border border-cream/70 bg-cream p-3">
                <p className="text-sm font-semibold text-ink/80">{FULL_DAY_LABELS[day]}</p>
                {mealsForDay.length === 0 && (
                  <p className="font-semibold text-ink">Free evening</p>
                )}
                {mealsForDay.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {mealsForDay.map((meal) => (
                      <Badge key={meal.id}>{meal.mealName}</Badge>
                    ))}
                  </div>
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
          <Badge>{weeklyHistory.length} weeks</Badge>
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
                    <p className="text-xs text-ink/60">Stored in weekly plan</p>
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
                  const mealIds = snapshot.days[day] ?? [];
                  const label = mealIds.length
                    ? mealIds
                        .map((id) => mealMap.get(id) ?? 'Meal')
                        .join(', ')
                    : 'Off';
                  return (
                    <div
                      key={`${snapshot.weekStart}-${day}`}
                      className="rounded-full bg-fog px-3 py-2 text-xs font-semibold text-ink/70"
                    >
                      {FULL_DAY_LABELS[day]} · {label}
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
