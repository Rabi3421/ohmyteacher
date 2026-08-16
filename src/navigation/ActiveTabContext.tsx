import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { AppTabId } from '../components/layout/AppBottomTabBar';

interface ActiveTabContextValue {
  activeTab: AppTabId;
  setActiveTab: (tab: AppTabId) => void;
}

const ActiveTabContext = createContext<ActiveTabContextValue>({
  activeTab: 'home',
  setActiveTab: () => undefined,
});

export function ActiveTabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState<AppTabId>('home');

  const setActiveTab = useCallback((tab: AppTabId) => {
    setActiveTabState(tab);
  }, []);

  return (
    <ActiveTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ActiveTabContext.Provider>
  );
}

export function useActiveTab() {
  return useContext(ActiveTabContext);
}
