export interface ImageFileInfo {
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface CompressionSettings {
  format: ImageFormat;
  quality: number;
  scale: number; // 0.1 to 1.0
  maxWidth: number; // 0 for no limit
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
