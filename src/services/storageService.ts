import { openDB } from 'idb';
import type { AnalyzeImageResult } from '../types/ai.js';
import type { ImageAsset } from '../types/image.js';

const DB_NAME = 'photocull-local';
const DB_VERSION = 1;

interface PhotoCullDB {
  images: {
    key: string;
    value: ImageAsset;
  };
  analysis: {
    key: string;
    value: AnalyzeImageResult;
  };
}

const dbPromise = openDB<PhotoCullDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('analysis')) {
      db.createObjectStore('analysis', { keyPath: 'imageId' });
    }
  }
});

export const storageService = {
  async saveImages(images: ImageAsset[]): Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction('images', 'readwrite');
    await Promise.all(images.map((image) => tx.store.put(image)));
    await tx.done;
  },

  async getImages(): Promise<ImageAsset[]> {
    const db = await dbPromise;
    const images = await db.getAll('images');
    return images.map((img) => {
      if (img.blob) {
        img.previewUrl = URL.createObjectURL(img.blob);
      }
      return img;
    });
  },

  async saveAnalysis(result: AnalyzeImageResult): Promise<void> {
    const db = await dbPromise;
    await db.put('analysis', result);
  },

  async getAnalysis(imageId: string): Promise<AnalyzeImageResult | undefined> {
    const db = await dbPromise;
    return db.get('analysis', imageId);
  }
};
