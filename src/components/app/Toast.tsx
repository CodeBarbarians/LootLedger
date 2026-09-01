import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface ToastContextValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message ? (
        <View className="absolute left-5 right-5 bottom-24 items-center" pointerEvents="none">
          <View className="w-full rounded-2xl bg-foreground px-4 py-3.5">
            <Text
              variant="mono"
              className="font-mono-bold text-center text-background"
            >
              {message}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
