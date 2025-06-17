
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
// This primarily reflects the structure stored in Firestore's 'people' collection.
export interface Person {
  id: string; // Firestore document ID for this person entry
  name: string; // User-defined or AI-suggested name
  aiName?: string; // Name suggested by AI, if applicable
  notes?: string; // User-added notes for this person
  
  faceImageStoragePath: string; // Path to the cropped face image in Cloud Storage
  originalRegion: Region; // The region in the original image coordinates used for cropping this face
  
  // Fields based on PRD's 'people' collection
  addedBy: string; // UID of the user who added this person
  rosterIds: string[]; // Array of 'rosters' document IDs this person belongs to
  
  company?: string;
  hobbies?: string[];
  birthday?: string | Date | null; // Consider storing as ISO string or Firebase Timestamp
  firstMet?: string | Date | null; // Consider storing as ISO string or Firebase Timestamp
  firstMetContext?: string;
  knownAcquaintances?: string[]; // Array of other 'people' document IDs
  spouse?: string | null; // Document ID of another 'people' entry

  createdAt: any; // Firestore serverTimestamp for creation
  updatedAt: any; // Firestore serverTimestamp for last update
}

// Represents a single image upload and its associated roster.
// This corresponds to a document in Firestore's 'rosters' collection.
export interface ImageSet {
  id: string; // Firestore document ID for this roster
  ownerId: string; // UID of the user who owns this ImageSet
  rosterName: string; // User-defined name for this set (e.g., "Q1 Team Meeting")
  
  originalImageStoragePath: string; // Path to the original uploaded image in Cloud Storage
  originalImageDimensions: { width: number; height: number }; // Dimensions of the original image
  
  peopleIds: string[]; // Array of 'people' document IDs belonging to this roster
  
  createdAt: any; // Firestore serverTimestamp for creation
  updatedAt: any; // Firestore serverTimestamp for last update
}

/*
// OLD type, for local storage. This will be replaced by structures
// that manage multiple ImageSets, likely fetched from a database.
export interface StoredAppState {
  imageDataUrl?: string | null;
  originalImageSize?: { width: number; height: number } | null;
  roster?: Person[] | null; // This would be an array of the Firestore-like Person objects if used
}
*/

    