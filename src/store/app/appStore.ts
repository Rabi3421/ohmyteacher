import { create } from 'zustand';

import { STORAGE_KEYS } from '../../constants/storageKeys';
import { secureStorage } from '../../services/storage/secureStorage';
import type { ThemeMode } from '../../theme';

interface AppState {
  themeMode: ThemeMode;
  isInitialized: boolean;
  selectedSchoolId: string | null;
  selectedBranchId: string | null;
  selectedAcademicSessionId: string | null;
  initialize: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setInitialized: (initialized: boolean) => void;
  setSelectedSchoolId: (id: string | null) => void;
  setSelectedBranchId: (id: string | null) => void;
  setSelectedAcademicSessionId: (id: string | null) => void;
  resetSelections: () => void;
}

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

export const useAppStore = create<AppState>((set, get) => ({
  themeMode: 'light',
  isInitialized: false,
  selectedSchoolId: null,
  selectedBranchId: null,
  selectedAcademicSessionId: null,

  async initialize() {
    if (get().isInitialized) {
      return;
    }

    try {
      const savedTheme = await secureStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (isThemeMode(savedTheme)) {
        set({ themeMode: savedTheme });
      }
    } finally {
      set({ isInitialized: true });
    }
  },

  setThemeMode(mode) {
    set({ themeMode: mode });
    secureStorage.setItem(STORAGE_KEYS.THEME_MODE, mode).catch(() => {
      // Theme persistence failure should never prevent in-session changes.
    });
  },
  setInitialized: isInitialized => set({ isInitialized }),
  setSelectedSchoolId: selectedSchoolId =>
    set({
      selectedSchoolId,
      selectedBranchId: null,
      selectedAcademicSessionId: null,
    }),
  setSelectedBranchId: selectedBranchId => set({ selectedBranchId }),
  setSelectedAcademicSessionId: selectedAcademicSessionId =>
    set({ selectedAcademicSessionId }),
  resetSelections: () =>
    set({
      selectedSchoolId: null,
      selectedBranchId: null,
      selectedAcademicSessionId: null,
    }),
}));
