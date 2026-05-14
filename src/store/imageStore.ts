import { create } from 'zustand';
import type { ImageAsset, ImageId } from '../types/image.js';

interface ImageStoreState {
  images: ImageAsset[];
  filteredIds: ImageId[];
  importImages: (images: ImageAsset[]) => void;
  removeImage: (imageId: ImageId) => void;
  clearImages: () => void;
  setFilteredIds: (ids: ImageId[]) => void;
}

export const useImageStore = create<ImageStoreState>((set, get) => ({
  images: [],
  filteredIds: [],
  importImages: (newImages) => {
    const currentIds = new Set(get().images.map((img) => img.id));
    const seenInBatch = new Set<string>();
    const deduped = newImages.filter((img) => {
      if (currentIds.has(img.id) || seenInBatch.has(img.id)) {
        return false;
      }
      seenInBatch.add(img.id);
      return true;
    });
    set((state) => ({
      images: [...state.images, ...deduped],
      filteredIds: [...state.filteredIds, ...deduped.map((img) => img.id)]
    }));
  },
  removeImage: (imageId) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== imageId),
      filteredIds: state.filteredIds.filter((id) => id !== imageId)
    })),
  clearImages: () => set({ images: [], filteredIds: [] }),
  setFilteredIds: (ids) => set({ filteredIds: ids })
}));
