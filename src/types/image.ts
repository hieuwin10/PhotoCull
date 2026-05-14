export type ImageId = string;

export interface ImageAsset {
  id: ImageId;
  fileName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  previewUrl: string;
  blob?: Blob;
  createdAt: number;
}

export type CullingStatus = 'keep' | 'reject' | 'unrated';

export interface ImageSelectionState {
  selectedIds: ImageId[];
  activeId?: ImageId;
  statusById: Record<ImageId, CullingStatus>;
}
