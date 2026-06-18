export async function compressImage(file: File, maxSize = 1280, quality = 0.78): Promise<Blob> {
  try {
    const dataUrl = await readFile(file);
    const image = await loadImage(dataUrl);
    const { width, height } = fitWithin(image.width, image.height, maxSize);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(image, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))), 'image/webp', quality);
    });
  } catch (error) {
    console.error('Image compression failed, using original file:', error);
    return file;
  }
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

function fitWithin(width: number, height: number, maxSize: number): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) return { width, height };
  const ratio = width > height ? maxSize / width : maxSize / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image load failed'));
    image.src = src;
  });
}
