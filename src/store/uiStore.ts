import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface UIStoreState {
  isProcessing: boolean;
  isSettingsOpen: boolean;
  theme: Theme;
  setProcessing: (value: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  isProcessing: false,
  isSettingsOpen: false,
  theme: 'system',
  setProcessing: (value) => set({ isProcessing: value }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setTheme: (theme) => set({ theme })
}));
