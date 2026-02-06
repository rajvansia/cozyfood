import { FormEvent, useState } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const STORAGE_KEY = 'cozyfood.pin.ok';

type PinGateProps = {
  pin: string;
  onUnlock: () => void;
};

export const PinGate = ({ pin, onUnlock }: PinGateProps) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() === pin) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      }
      setError('');
      setValue('');
      onUnlock();
      return;
    }
    setError('That PIN does not match.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <p className="font-display text-2xl text-ink">Welcome back</p>
        <p className="mt-2 text-sm text-ink/70">
          Enter the family PIN to unlock Clover Basket.
        </p>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          {error && <p className="text-sm font-semibold text-peach">{error}</p>}
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
      </Card>
    </div>
  );
};

export const isPinUnlocked = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
};
