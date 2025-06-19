
import type { Timestamp } from 'firebase/firestore';

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
  primaryFaceAppearancePath?: string | null; // Optional: Storage path of the selected primary face image from faceAppearances
  
  addedBy: string; // UID of the user who added this person
  rosterIds: string[]; // Array of 'roster' document IDs this person belongs to
  
  company?: string;
  hobbies?: string; 
  birthday?: string; 
  firstMet?: string; 
  firstMetContext?: string;
  knownAcquaintances?: string[]; // DEPRECATED: Use connections collection
  spouse?: string | null; // DEPRECATED: Use connections collection

  createdAt: Timestamp | any; // Firestore serverTimestamp for creation (any for FieldValue)
  updatedAt: Timestamp | any; // Firestore serverTimestamp for last update (any for FieldValue)
}

// Represents an individual person for display and editing within the context of a specific, currently loaded roster.
export interface EditablePersonInContext {
  id: string; // Firestore document ID of the person, OR a temporary ID for new, unsaved persons
  faceImageUrl: string; // Cloud Storage Download URL or local data URI for the cropped face specific to the current roster/state
  name: string;
  aiName?: string;
  notes?: string;
  
  // These fields are specific to the person's appearance in the *current* roster
  currentRosterAppearance?: {
    rosterId: string; // Will be the currentRosterDocId when saved
    faceImageStoragePath: string; 
    originalRegion: Region; 
  };

  company?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;

  // Fields for temporary, unsaved persons
  isNew?: boolean; // Flag to indicate if this person is new and not yet saved to Firestore
  tempFaceImageDataUri?: string; // To store the raw data URI before upload for new persons
  tempOriginalRegion?: Region; // To store the original region for new persons before they are linked to a FaceAppearance
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
  
  createdAt: Timestamp | any; // Firestore serverTimestamp for creation
  updatedAt: Timestamp | any; // Firestore serverTimestamp for last update
}

// Defines the user's choices for merging conflicting fields between two Person objects.
// 'person1' means the value from the first selected person (target) is chosen.
// 'person2' means the value from the second selected person (source) is chosen.
export interface FieldMergeChoices {
  name: 'person1' | 'person2';
  company: 'person1' | 'person2';
  hobbies: 'person1' | 'person2';
  birthday: 'person1' | 'person2';
  firstMet: 'person1' | 'person2';
  firstMetContext: 'person1' | 'person2';
}

// Represents a pair of people suggested for merging by the AI.
export interface SuggestedMergePair {
  person1Id: string;
  person1Name: string; // For display purposes
  person2Id: string;
  person2Name: string; // For display purposes
  reason: string; // Why this pair is suggested
  confidence?: 'high' | 'medium' | 'low'; // Optional confidence level
}

// Represents a connection between two people.
// Corresponds to a document in Firestore's 'connections' collection.
export interface Connection {
  id: string; // Firestore document ID for this connection
  fromPersonId: string; // Document ID of the person initiating or viewed as the source
  toPersonId: string; // Document ID of the person connected to
  types: string[]; // e.g., ["colleague", "friend", "manager"]
  reasons: string[]; // e.g., ["Worked at Globex Corp", "University hiking club"]
  strength?: number | null; // Optional, e.g., 1-5. Use null for Firestore if not set.
  notes?: string; // Optional, private notes about this connection
  createdAt: Timestamp | any; // Firestore serverTimestamp
  updatedAt: Timestamp | any; // Firestore serverTimestamp
}

// This interface represents the data structure that the CreateConnectionDialog
// prepares and sends to its onSave callback.
export interface ProcessedConnectionFormData {
    types: string[];
    reasons: string[];
    strength?: number; // Optional, as slider might not be touched
    notes?: string;   // Optional
}

