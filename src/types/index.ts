
// Describes a rectangular region within an image, using original image coordinates.
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Represents a region being drawn or displayed on the canvas,
// with coordinates and dimensions relative to the displayed image on canvas.
export interface DisplayRegion extends Region {
  // id?: string; // Potentially, if display regions need temporary unique IDs before becoming Persons
}

// Represents an individual person identified in an ImageSet.
export interface Person {
  id: string; // Unique identifier for this person entry
  // faceImageUrl: string; // OLD: Data URL of the cropped face
  faceImageStoragePath: string; // NEW: Path/URL to the cropped face image in cloud storage
  name: string; // User-defined or AI-suggested name
  aiName?: string; // Name suggested by AI, if applicable
  notes?: string; // User-added notes for this person
  originalRegion: Region; // The region in the original image coordinates used for cropping this face
}

// Represents a single image upload and its associated roster.
// This would typically correspond to a document in a NoSQL database (e.g., Firestore)
// or a row in a SQL table.
export interface ImageSet {
  id: string; // Unique identifier for this ImageSet (e.g., document ID)
  userId?: string; // Identifier of the user who owns this ImageSet (for multi-user systems)
  name: string; // User-defined name for this set (e.g., "Q1 Team Meeting")
  
  // Information about the original uploaded image
  originalImageStoragePath: string; // Path/URL to the original uploaded image in cloud storage
  originalImageFilename?: string; // Optional: Original filename of the uploaded image for display
  originalImageSize: { width: number; height: number }; // Dimensions of the original image
  
  roster: Person[]; // Array of Person objects belonging to this ImageSet
  
  createdAt: Date | string; // Timestamp of creation (consider string for DB compatibility e.g., ISO format)
  updatedAt: Date | string; // Timestamp of last update (consider string for DB compatibility)
}

/*
// OLD type, for local storage. This will be replaced by structures
// that manage multiple ImageSets, likely fetched from a database.
export interface StoredAppState {
  imageDataUrl?: string | null;
  originalImageSize?: { width: number; height: number } | null;
  roster?: Person[] | null;
}
*/
