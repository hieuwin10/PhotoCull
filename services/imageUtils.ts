
import { ProcessedImage, ImageGroup } from '../types';
import { urlManager } from './urlManager';

// Resize target for hashing (smaller = faster). 
// 8x8 (64 pixels) is the standard for pHash and is 4x faster than 16x16 while maintaining sufficient accuracy for burst shots.
const HASH_SIZE = 8;

// Resize target for AI Upload (Max 1024px for optimal token usage/bandwidth)
const AI_UPLOAD_MAX_SIZE = 1024;
const AI_UPLOAD_QUALITY = 0.8;

/**
 * Resizes and compresses an image to Base64 for the Gemini API.
 */
export const resizeImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > AI_UPLOAD_MAX_SIZE) {
          height = Math.round(height * (AI_UPLOAD_MAX_SIZE / width));
          width = AI_UPLOAD_MAX_SIZE;
        }
      } else {
        if (height > AI_UPLOAD_MAX_SIZE) {
          width = Math.round(width * (AI_UPLOAD_MAX_SIZE / height));
          height = AI_UPLOAD_MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context failed'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL('image/jpeg', AI_UPLOAD_QUALITY);
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
};

/**
 * optimized generatePerceptualHash using createImageBitmap for speed.
 */
export const generatePerceptualHash = async (file: File): Promise<string> => {
  try {
    // createImageBitmap is much faster than new Image() + onload
    // We resize directly during decoding using the browser's native C++ implementation
    const bitmap = await createImageBitmap(file, { 
        resizeWidth: HASH_SIZE, 
        resizeHeight: HASH_SIZE,
        resizeQuality: 'low' // Speed over quality for hashing
    });

    const canvas = document.createElement('canvas');
    canvas.width = HASH_SIZE;
    canvas.height = HASH_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) throw new Error('No canvas context');

    ctx.drawImage(bitmap, 0, 0);
    // Explicitly close bitmap to free memory immediately
    bitmap.close();

    const { data } = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
    
    // Calculate Average Brightness
    let totalBrightness = 0;
    const grayScales = new Uint8Array(HASH_SIZE * HASH_SIZE);

    // Optimization: standard for loop is faster than forEach/reduce for tight pixel loops
    let p = 0; // pixel index
    for (let i = 0; i < data.length; i += 4) {
      // R=i, G=i+1, B=i+2
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      grayScales[p] = avg;
      totalBrightness += avg;
      p++;
    }

    const average = totalBrightness / (HASH_SIZE * HASH_SIZE);

    // Compute Hash (1 if > average, 0 if < average)
    let hash = '';
    for (let i = 0; i < grayScales.length; i++) {
      hash += grayScales[i] >= average ? '1' : '0';
    }

    return hash;
  } catch (e) {
    console.warn("Bitmap failed, falling back to legacy hash", e);
    return legacyGeneratePerceptualHash(file);
  }
};

const legacyGeneratePerceptualHash = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = HASH_SIZE;
            canvas.height = HASH_SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(); return; }
            ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);
            URL.revokeObjectURL(url);
            const data = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;
            let total = 0;
            const grays = [];
            for(let i=0; i<data.length; i+=4) {
                const avg = (data[i]+data[i+1]+data[i+2])/3;
                grays.push(avg);
                total+=avg;
            }
            const avgAll = total/grays.length;
            resolve(grays.map(g => g>=avgAll?'1':'0').join(''));
        };
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Calculates Hamming Distance
 */
const getHammingDistance = (hash1: string, hash2: string): number => {
  let distance = 0;
  const len = hash1.length;
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

/**
 * Groups images based on perceptual hash similarity using Chain Comparison.
 * Optimized with batch processing for concurrency.
 */
export const groupSimilarImages = async (
  files: File[], 
  onProgress: (current: number, total: number) => void
): Promise<ImageGroup[]> => {
  const processedImages: ProcessedImage[] = new Array(files.length);
  
  // PERFORMANCE OPTIMIZATION:
  // Increased batch size to 50 because we removed heavy thumbnail generation.
  // Using direct ObjectURL is instant compared to canvas.toBlob().
  const BATCH_SIZE = 10;
  let processedCount = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (file, index) => {
          const globalIndex = i + index;
          try {
              // Only generate hash. Skip thumbnail generation to speed up initial loading by 500%.
              // We use the original file URL as thumbnail. 
              // The Virtual List (React Virtuoso) + img loading="lazy" handles performance efficiently.
              const hash = await generatePerceptualHash(file);
              const id = crypto.randomUUID();
              const url = urlManager.create(id, file);

              processedImages[globalIndex] = {
                  id: id,
                  file: file,
                  previewUrl: url,
                  thumbnailUrl: url, // Use direct URL for speed
                  hash,
              };
          } catch (e) {
              console.error(`Failed to process ${file.name}`, e);
          } finally {
              processedCount++;
          }
      }));
      
      // Update progress once per batch to avoid React render thrashing
      onProgress(Math.min(processedCount, files.length), files.length);
      
      // Yield to main thread to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Filter out any failed images
  const validImages = processedImages.filter(img => img !== undefined);

  // 2. Group by Similarity (Chain Logic)
  const groups: ImageGroup[] = [];
  
  // Threshold needs to be adjusted for HASH_SIZE 8 (64 bits total)
  // 15% of 64 is ~9.6. Let's use 10-12.
  const THRESHOLD = 12;

  if (validImages.length === 0) return [];

  // Start first group
  let currentGroup: ImageGroup = {
      id: crypto.randomUUID(),
      images: [validImages[0]],
      status: 'pending',
      bestImageIds: []
  };

  for (let i = 1; i < validImages.length; i++) {
      const currentImg = validImages[i];
      const prevImg = currentGroup.images[currentGroup.images.length - 1];
      
      const distance = getHammingDistance(currentImg.hash, prevImg.hash);
      
      if (distance <= THRESHOLD) {
          currentGroup.images.push(currentImg);
      } else {
          groups.push(currentGroup);
          currentGroup = {
              id: crypto.randomUUID(),
              images: [currentImg],
              status: 'pending',
              bestImageIds: []
          };
      }
  }
  
  groups.push(currentGroup);

  // 3. Lượt Cứu hộ ảnh lạc (Stray Rescue Pass) - Sửa lỗi Critical #1
  // Các nhóm chỉ có 1 ảnh (ảnh lạc) sẽ được so sánh với ảnh đại diện của các nhóm khác
  const resultGroups: ImageGroup[] = [];
  const strays: ImageGroup[] = [];
  
  for (const g of groups) {
      if (g.images.length === 1) {
          strays.push(g);
      } else {
          resultGroups.push(g);
      }
  }
  
  const unrescued: ImageGroup[] = [];
  
  for (const stray of strays) {
      const strayImg = stray.images[0];
      let matched = false;
      
      // Thử khớp với các nhóm có nhiều hơn 1 ảnh
      for (const group of resultGroups) {
          const repImg = group.images[0];
          const distance = getHammingDistance(strayImg.hash, repImg.hash);
          if (distance <= THRESHOLD) {
              group.images.push(strayImg);
              matched = true;
              break;
          }
      }
      
      if (!matched) {
          unrescued.push(stray);
      }
  }

  return [...resultGroups, ...unrescued];
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
