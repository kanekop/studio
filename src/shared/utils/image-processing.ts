import exifr from 'exifr';

export async function generateThumbnail(
  file: File | Blob,
  maxSize: number = 200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate scale to fit within maxSize while maintaining aspect ratio
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      
      // Draw the scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to WebP format
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    if (file instanceof File) {
      img.src = URL.createObjectURL(file);
    } else {
      img.src = URL.createObjectURL(file);
    }
  });
}

export async function generateThumbnailFromDataUrl(
  dataUrl: string,
  maxSize: number = 200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate scale to fit within maxSize while maintaining aspect ratio
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      
      // Draw the scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to WebP format
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = dataUrl;
  });
}

export interface ImageMetadata {
  capturedAt?: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  cameraInfo?: {
    make?: string;
    model?: string;
  };
}

export async function extractExifData(file: File): Promise<ImageMetadata | null> {
  try {
    const exifData = await exifr.parse(file, {
      // Extract specific tags we need
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model'],
    });

    if (!exifData) return null;

    const metadata: ImageMetadata = {};

    // Extract date
    if (exifData.DateTimeOriginal || exifData.CreateDate) {
      metadata.capturedAt = exifData.DateTimeOriginal || exifData.CreateDate;
    }

    // Extract GPS location
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      metadata.location = {
        latitude: exifData.GPSLatitude,
        longitude: exifData.GPSLongitude,
      };
    }

    // Extract camera info
    if (exifData.Make || exifData.Model) {
      metadata.cameraInfo = {
        make: exifData.Make,
        model: exifData.Model,
      };
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch (error) {
    console.warn('Failed to extract EXIF data:', error);
    return null;
  }
}