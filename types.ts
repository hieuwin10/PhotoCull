
export interface ProcessedImage {
  id: string;
  file: File;
  previewUrl: string; // Original High-Res URL (for Zoom & Download)
  thumbnailUrl: string; // Low-Res Optimized URL (for Grid Display)
  hash: string; // Perceptual hash
  isBest?: boolean; // AI selected as one of the best
  score?: number; // Optional score given by AI
  reason?: string; // AI reasoning specific to this image (mapped from group reasons)
  
  // New Editing Fields
  editSuggestions?: string[]; // List of AI suggestions (e.g., "Increase contrast", "Warm up tone")
  improvementDetails?: string; // New: Detailed AI explanation of the changes made
  cssFilters?: {
      brightness: number;
      contrast: number;
      saturation: number;
      warmth: number; // simulated via sepia/hue-rotate
  };
  editedImageUrl?: string; // URL of the AI generated enhanced version
  variations?: string[]; // List of AI generated variations
  selectedVariationIndices?: number[]; // New: Indices of variations selected by user for export
}

export interface ImageGroup {
  id: string;
  images: ProcessedImage[];
  status: 'pending' | 'analyzing' | 'done';
  bestImageIds: string[]; // IDs of the best images
  title?: string; // Short description of the group content
  tags?: string[]; // AI Classification tags (e.g., "Portrait", "Landscape")
  selectionReason?: string; // Why the best were chosen
  rejectionReason?: string; // Why others were rejected
  isRefining?: boolean; // New: Is the group currently being re-organized by AI?
  isBatchEditing?: boolean; // New: Is the group currently being batch enhanced?
  batchAction?: 'MAGIC' | 'VARIATIONS'; // New: What specific action is running?
  analyzedTimestamp?: number; // Timestamp when analysis was completed
}

export interface ImageInsight {
    index: number;
    suggestions: string[];
}

export interface AnalysisResult {
  bestIndices: number[];
  selectionReason: string;
  rejectionReason: string;
  title: string;
  tags: string[];
  imageInsights?: ImageInsight[]; // New: Specific suggestions per image
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  GROUPING = 'GROUPING',
  REVIEW = 'REVIEW'
}

// For Saving/Loading Projects
export interface SavedImageMeta {
    fileName: string;
    fileSize: number;
    id: string;
    hash: string;
    isBest?: boolean;
    reason?: string;
    editSuggestions?: string[];
    improvementDetails?: string; // New: Save the explanation
    editedImageUrl?: string; // New: Save the actual AI result
    variations?: string[]; // New: Save variations list
    selectedVariationIndices?: number[]; // New: Save selected variations
    // We cannot save cssFilters or Blob URLs persistently across sessions easily without re-processing, 
    // but we can save the metadata to re-apply if logic exists.
}

export interface SavedGroup {
    id: string;
    images: SavedImageMeta[];
    status: 'pending' | 'analyzing' | 'done';
    bestImageIds: string[];
    title?: string;
    tags?: string[];
    selectionReason?: string;
    rejectionReason?: string;
    analyzedTimestamp?: number;
}

// Runtime Trash Item
export interface TrashItem {
    id: string; // ID of the deletion event
    type: 'image' | 'group';
    originalGroupId?: string; // If it's an image, where did it come from?
    data: ProcessedImage | ImageGroup;
    deletedAt: number;
}

// Persisted Trash Item
export interface SavedTrashItem {
    id: string;
    type: 'image' | 'group';
    originalGroupId?: string;
    // We store simplified data for persistence
    data: SavedImageMeta | SavedGroup; 
    deletedAt: number;
}

export interface ProjectFile {
    version: string;
    timestamp: number;
    groups: SavedGroup[];
    trash?: SavedTrashItem[]; // New: Persist trash
}