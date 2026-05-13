import type { ImageAsset, ImageId } from './image.js';

export interface AnalyzeImageInput {
  image: ImageAsset;
  prompt: string;
  apiKey?: string;
}

export interface AnalyzeImageResult {
  imageId: ImageId;
  tags: string[];
  qualityScore: number;
  suggestion: 'keep' | 'reject';
  rationale: string;
  createdAt: number;
}
