import { create } from 'zustand';
import { AppState, ImageGroup, ProcessedImage, TrashItem } from '../types';
import { ProcessingStatus } from '../hooks/useProcessingStatus';

interface PhotoCullStore {
  // State
  groups: ImageGroup[];
  trash: TrashItem[];
  appState: AppState;
  files: File[];
  status: ProcessingStatus | null;
  progress: { current: number; total: number } | null;

  // Actions (Hỗ trợ cả truyền giá trị trực tiếp và functional update giống useState)
  setGroups: (groups: ImageGroup[] | ((prev: ImageGroup[]) => ImageGroup[])) => void;
  setTrash: (trash: TrashItem[] | ((prev: TrashItem[]) => TrashItem[])) => void;
  setAppState: (state: AppState) => void;
  setFiles: (files: File[]) => void;
  setStatus: (status: ProcessingStatus | null | ((prev: ProcessingStatus | null) => ProcessingStatus | null)) => void;
  setProgress: (progress: { current: number; total: number } | null) => void;
}

export const useStore = create<PhotoCullStore>((set) => ({
  groups: [],
  trash: [],
  appState: AppState.UPLOAD,
  files: [],
  status: null,
  progress: null,

  setGroups: (groups) => set((state) => ({ 
    groups: typeof groups === 'function' ? groups(state.groups) : groups 
  })),
  setTrash: (trash) => set((state) => ({ 
    trash: typeof trash === 'function' ? trash(state.trash) : trash 
  })),
  setAppState: (appState) => set({ appState }),
  setFiles: (files) => set({ files }),
  setStatus: (status) => set((state) => ({ 
    status: typeof status === 'function' ? status(state.status) : status 
  })),
  setProgress: (progress) => set({ progress }),
}));
