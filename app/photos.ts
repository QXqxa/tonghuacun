export function scaledDimensions(width: number, height: number, maxEdge = 2560) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function compressPhoto(file: File) {
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const size = scaledDimensions(bitmap.width, bitmap.height);
  const resized = size.width !== bitmap.width || size.height !== bitmap.height;
  if (file.size <= 1.5 * 1024 * 1024 && !resized) { bitmap.close(); return file; }
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .86));
  if (!blob || (!resized && blob.size >= file.size)) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: file.lastModified });
}
