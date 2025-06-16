export interface Region {
  x: number; // in original image coordinates
  y: number; // in original image coordinates
  width: number; // in original image coordinates
  height: number; // in original image coordinates
}

// Represents a region being drawn or displayed on the canvas
export interface DisplayRegion extends Region {
  // Coordinates and dimensions are relative to the displayed image on canvas
}

export interface Person {
  id: string;
  faceImageUrl: string; // Data URL of the cropped face
  name: string;
  aiName?: string; // Placeholder like "Person 1"
  notes?: string;
  originalRegion: Region; // The region in original image coordinates used for cropping
}

export interface StoredAppState {
  imageDataUrl?: string | null;
  originalImageSize?: { width: number; height: number } | null;
  roster?: Person[] | null;
}
