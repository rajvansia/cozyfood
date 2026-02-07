import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav, TabKey } from './components/BottomNav';
import { GroceryPage } from './pages/GroceryPage';
import { MealsPage } from './pages/MealsPage';
import { WeekPlannerPage } from './pages/WeekPlannerPage';
import { useAppState } from './lib/useAppState';
import { PinGate, isPinUnlocked } from './components/PinGate';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('grocery');
  const appState = useAppState();
  const pin = (import.meta.env.VITE_APP_PIN as string | undefined)?.trim();
  const pinEnabled = Boolean(pin);
  const [unlocked, setUnlocked] = useState(() => !pinEnabled || isPinUnlocked());

  if (pinEnabled && !unlocked && pin) {
    return <PinGate pin={pin} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader syncStatus={appState.syncStatus} />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-10">
        {activeTab === 'grocery' && (
          <GroceryPage
            groceryItems={appState.groceryItems}
            meals={appState.meals}
            weeklyHistory={appState.weeklyHistory}
            onAdd={appState.addGroceryItem}
            onUpdate={appState.updateGroceryItem}
            onDelete={appState.deleteGroceryItem}
            onToggle={appState.toggleGroceryItem}
          />
        )}
        {activeTab === 'meals' && (
          <MealsPage
            meals={appState.meals}
            onAdd={appState.addMeal}
            onUpdate={appState.updateMeal}
            onDelete={appState.deleteMeal}
          />
        )}
        {activeTab === 'week' && (
          <WeekPlannerPage
            meals={appState.meals}
            weeklyPlan={appState.weeklyPlan}
            weeklyHistory={appState.weeklyHistory}
            selectedWeekStart={appState.plannerWeekStart}
            onWeekChange={appState.setPlannerWeekStart}
            onPlanChange={appState.updateWeeklyPlan}
            onGenerate={appState.generateGroceryList}
            onLoadHistory={appState.loadWeeklySnapshot}
          />
        )}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default App;
