'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type Tone = 'success' | 'error' | 'info';
interface T {
  id: number;
  text: string;
  tone: Tone;
}

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), tone === 'error' ? 5000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop flex items-center gap-2 rounded-2xl bg-ink/90 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur"
            role="status"
          >
            <span>{t.tone === 'success' ? '✅' : t.tone === 'error' ? '⚠️' : '💡'}</span>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
