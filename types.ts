export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string; // Blob URL for display
  file: File;  // Original file object
  thumbnailUrl?: string; // For videos
  name: string;
  timestamp: number;
  aiDescription?: string; // Result from video analysis
  isGenerated?: boolean; // If true, it was created by AI
  folder: string; // Folder name
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}
