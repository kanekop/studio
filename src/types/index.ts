
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

// Represents a single appearance of a person's face in a specific roster (original image).
export interface FaceAppearance {
  rosterId: string; // ID of the roster (original image) this face was cropped from
  faceImageStoragePath: string; // Path to the cropped face image in Cloud Storage for this appearance
  originalRegion: Region; // The region in the original image (identified by rosterId) coordinates
}

// Represents an individual person identified in the app.
// This primarily reflects the structure stored in Firestore's 'people' collection.
export interface Person {
  id: string; // Firestore document ID for this person entry
  name: string; // User-defined or AI-suggested name
  aiName?: string; // Name suggested by AI, if applicable
  notes?: string; // User-added notes for this person
  
  faceAppearances: FaceAppearance[]; // Array of all instances where this person's face was identified
  
  addedBy: string; // UID of the user who added this person
  rosterIds: string[]; // Array of 'rosters' document IDs this person belongs to (for quick querying)
  
  company?: string;
  hobbies?: string; 
  birthday?: string; 
  firstMet?: string; 
  firstMetContext?: string;
  knownAcquaintances?: string[]; 
  spouse?: string | null; 

  createdAt: any; // Firestore serverTimestamp for creation
  updatedAt: any; // Firestore serverTimestamp for last update
}

// Represents an individual person for display and editing within the context of a specific, currently loaded roster.
export interface EditablePersonInContext {
  id: string; // Firestore document ID of the person
  faceImageUrl: string; // Cloud Storage Download URL for the cropped face specific to the current roster
  name: string;
  aiName?: string;
  notes?: string;
  
  // These fields are specific to the person's appearance in the *current* roster
  currentRosterAppearance?: {
    rosterId: string;
    faceImageStoragePath: string; 
    originalRegion: Region; 
  };

  company?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;
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
  
  createdAt: any; // Firestore serverTimestamp for creation (can be Timestamp object or Date for display)
  updatedAt: any; // Firestore serverTimestamp for last update
}

