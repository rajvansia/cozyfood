import { BasketIcon, CalendarIcon, MealIcon } from './icons';
import { cn } from '../lib/cn';

export type TabKey = 'grocery' | 'meals' | 'week';

type BottomNavProps = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

const tabs: Array<{ key: TabKey; label: string; icon: typeof BasketIcon }> = [
  { key: 'grocery', label: 'Grocery', icon: BasketIcon },
  { key: 'meals', label: 'Meals', icon: MealIcon },
  { key: 'week', label: 'Week', icon: CalendarIcon }
];

export const BottomNav = ({ activeTab, onChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-fog/95 backdrop-blur-lg border-t border-cream/80">
      <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'bg-mint text-ink shadow-floaty'
                  : 'text-ink/60 hover:text-ink'
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
