import { create } from 'zustand';
import type { CullingStatus, ImageId } from '../types/image.js';

interface SelectionStoreState {
  selectedIds: ImageId[];
  activeId?: ImageId;
  statusById: Record<ImageId, CullingStatus>;
  setActiveImage: (id?: ImageId) => void;
  toggleSelection: (id: ImageId) => void;
  setStatus: (id: ImageId, status: CullingStatus) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStoreState>((set) => ({
  selectedIds: [],
  activeId: undefined,
  statusById: {},
  setActiveImage: (id) => set({ activeId: id }),
  toggleSelection: (id) =>
    set((state) => {
      const hasId = state.selectedIds.includes(id);
      return {
        selectedIds: hasId
          ? state.selectedIds.filter((item) => item !== id)
          : [...state.selectedIds, id]
      };
    }),
  setStatus: (id, status) =>
    set((state) => ({ statusById: { ...state.statusById, [id]: status } })),
  clearSelection: () => set({ selectedIds: [], activeId: undefined })
}));
