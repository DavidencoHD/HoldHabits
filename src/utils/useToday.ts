import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from './storage';

export function useToday(): string {
  const [today, setToday] = useState(todayStr);
  const todayRef = useRef(today);
  todayRef.current = today;

  useEffect(() => {
    const check = () => {
      const now = todayStr();
      if (now !== todayRef.current) {
        todayRef.current = now;
        setToday(now);
      }
    };
    const interval = setInterval(check, 30000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    check();
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return today;
}

export function previousDateStr(dateString: string): string {
  const d = new Date(dateString + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
