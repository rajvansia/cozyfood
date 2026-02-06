import { SyncStatus } from '../lib/types';
import { cn } from '../lib/cn';

const statusStyles: Record<SyncStatus, string> = {
  idle: 'bg-mint text-ink',
  syncing: 'bg-sky text-ink',
  offline: 'bg-peach text-ink',
  error: 'bg-honey text-ink'
};

const statusLabels: Record<SyncStatus, string> = {
  idle: 'All cozy',
  syncing: 'Syncing…',
  offline: 'Offline mode',
  error: 'Sync paused'
};

type AppHeaderProps = {
  syncStatus: SyncStatus;
};

export const AppHeader = ({ syncStatus }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <div>
          <p className="font-display text-2xl text-ink">Clover Basket</p>
          <p className="text-sm text-ink/70">Plan meals, gather groceries, breathe easy.</p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold shadow-inner',
            statusStyles[syncStatus]
          )}
        >
          {statusLabels[syncStatus]}
        </span>
      </div>
    </header>
  );
};
