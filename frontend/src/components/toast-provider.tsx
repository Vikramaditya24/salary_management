'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DURATION_MS = { success: 5000, info: 5000, error: 9000 } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const variant = input.variant ?? 'info';
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...input, variant, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS[variant]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'bg-card text-card-foreground pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 text-sm shadow-lg',
              item.variant === 'error' && 'border-destructive/60',
              item.variant === 'success' && 'border-green-600/60',
            )}
          >
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              {item.description && <p className="text-muted-foreground mt-1">{item.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm p-0.5 outline-none focus-visible:ring-2"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
