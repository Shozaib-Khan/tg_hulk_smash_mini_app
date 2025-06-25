import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        close: () => void;
        expand: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export const useTelegram = () => {
  const [tg, setTg] = useState<NonNullable<Window['Telegram']>['WebApp'] | null>(null);
  const [user, setUser] = useState<NonNullable<NonNullable<Window['Telegram']>['WebApp']>['initDataUnsafe']['user'] | null>(null);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (app && typeof app === 'object' && app !== null) {
      app.ready();
      app.expand();
      setTg(app);
      setUser(app.initDataUnsafe.user || null);
    }
  }, []);

  const hapticFeedback = {
    light: () => tg?.HapticFeedback.impactOccurred('light'),
    medium: () => tg?.HapticFeedback.impactOccurred('medium'),
    heavy: () => tg?.HapticFeedback.impactOccurred('heavy'),
    success: () => tg?.HapticFeedback.notificationOccurred('success'),
    error: () => tg?.HapticFeedback.notificationOccurred('error'),
    warning: () => tg?.HapticFeedback.notificationOccurred('warning'),
  };

  return {
    tg,
    user,
    hapticFeedback,
    isInTelegram: !!window.Telegram?.WebApp,
  };
};