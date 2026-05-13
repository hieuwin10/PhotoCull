# Reference: Mô Hình Dữ Liệu

## ImageRecord

```ts
export interface ImageRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  previewUrl: string;
  importedAt: string;
  groupId?: string;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  decision: 'unreviewed' | 'picked' | 'rejected';
  tags: string[];
  aiResultId?: string;
}
```

## ImageGroup

```ts
export interface ImageGroup {
  id: string;
  imageIds: string[];
  reason: 'similarity' | 'manual' | 'time-window';
  representativeImageId?: string;
}
```

## AIAnalysisResult

```ts
export interface AIAnalysisResult {
  id: string;
  imageId: string;
  provider: 'gemini' | 'local' | 'mock';
  status: 'queued' | 'running' | 'completed' | 'failed';
  sharpnessScore?: number;
  expressionScore?: number;
  compositionScore?: number;
  suggestedDecision?: 'picked' | 'rejected' | 'unreviewed';
  tags: string[];
  reason?: string;
  error?: string;
  createdAt: string;
}
```

## Session

```ts
export interface CullingSession {
  id: string;
  name: string;
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  aiProvider?: string;
}
```
