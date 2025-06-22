import { Timestamp } from 'firebase/firestore';

// Describes a rectangular region within an image, using original image coordinates.
export interface Region {
  id?: string; // Optional unique ID for regions
  x: number;
  y: number;
  width: number;
  height: number;
}

// Represents a region being drawn or displayed on the canvas,
// with coordinates and dimensions relative to the displayed image on canvas.
export interface DisplayRegion extends Region {
  id: string; // Required unique ID for display purposes
  personId?: string;
  personName?: string;
}

// Represents a single appearance of a person's face in a specific roster (original image).
export interface FaceAppearance {
  id: string; // Unique identifier for this face appearance
  rosterId: string; // ID of the roster (original image) this face was cropped from
  faceImageStoragePath: string; // Path to the cropped face image in Cloud Storage for this appearance
  originalRegion: Region; // The region in the original image (identified by rosterId) coordinates
  isPrimary?: boolean; // Whether this is the primary appearance for the person
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
  profileImagePath?: string; // Optional: Profile image path
  
  addedBy: string; // UID of the user who added this person
  rosterIds: string[]; // Array of 'roster' document IDs this person belongs to
  
  company?: string;
  hobbies?: string; 
  birthday?: string; 
  age?: number; // Optional: Person's age
  firstMet?: string; 
  firstMetContext?: string;

  createdAt: Timestamp | any; // Firestore serverTimestamp for creation (any for FieldValue)
  updatedAt: Timestamp | any; // Firestore serverTimestamp for last update (any for FieldValue)
}

// Represents an individual person for display and editing within the context of a specific, currently loaded roster.
export type EditablePersonInContext = Person & {
  isNew?: boolean;
  currentRosterAppearance?: {
    rosterId: string;
    faceImageStoragePath: string;
    originalRegion: Region;
  };
  aiName?: string;
  tempFaceImageDataUri?: string;
};

// Represents a single image upload and its associated roster.
// This corresponds to a document in Firestore's 'rosters' collection.
export interface ImageSet {
  id: string; // Firestore document ID for this roster
  ownerId: string; // UID of the user who owns this ImageSet
  rosterName: string; // User-defined name for this set (e.g., "Q1 Team Meeting")
  description?: string; // Optional description for this roster
  
  originalImageStoragePath: string; // Path to the original uploaded image in Cloud Storage
  originalImageSize: { width: number; height: number }; // Dimensions of the original image
  
  peopleIds: string[]; // Array of 'people' document IDs belonging to this roster
  people?: EditablePersonInContext[]; // Optional: Embedded people data for this roster
  
  createdAt: Timestamp | any; // Firestore serverTimestamp for creation
  updatedAt: Timestamp | any; // Firestore serverTimestamp for last update
  
  tags: string[];
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

// Advanced search parameters for enhanced filtering functionality
export interface AdvancedSearchParams {
    name?: string;
    company?: string;
    hobbies?: string[];
    ageRange?: { min: number | null; max: number | null };
    birthdayRange?: { start: Date; end: Date };
    firstMetRange?: { start: Date; end: Date };
    connectionTypes?: string[];
    hasConnections?: boolean;
    notes?: string;
}

// Local storage state for app persistence
export interface StoredAppState {
    people?: Person[];
    rosters?: ImageSet[];
    connections?: Connection[];
    lastSyncTimestamp?: number;
}

