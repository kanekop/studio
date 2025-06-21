# Face Recognition Implementation Plan

## Current Architecture Analysis

### Existing Infrastructure
1. **Face Detection & Cropping**: Already implemented via manual region selection in `ImageCanvas.tsx`
2. **Face Storage**: Face images are stored as `FaceAppearance` with cropped images in Firebase Storage
3. **AI Integration**: Google Genkit with Gemini 2.0 Flash model configured
4. **People Merge Suggestions**: Already uses visual similarity via face images in `suggest-people-merges-flow.ts`

### Key Components
- **Person Type**: Contains `faceAppearances` array with face images and regions
- **ImageSet/Roster**: Links to people with their face appearances
- **FaceRosterContext**: Central state management with Firebase integration

## Face Recognition Architecture Design

### 1. Face Embedding Generation
- Create a new Genkit flow to generate face embeddings using Gemini's multimodal capabilities
- Store embeddings in Firestore alongside `FaceAppearance` data
- Use vector similarity for face matching

### 2. Database Schema Updates
```typescript
// Add to FaceAppearance interface
export interface FaceAppearance {
  // ... existing fields
  faceEmbedding?: number[]; // Face vector embedding
  embeddingModel?: string; // Model version used
  embeddingGeneratedAt?: Timestamp;
}
```

### 3. New AI Flows

#### a. Generate Face Embedding Flow
```typescript
// src/ai/flows/generate-face-embedding-flow.ts
- Input: Face image data URI
- Output: Vector embedding array
- Uses Gemini's image understanding capabilities
```

#### b. Find Similar Faces Flow
```typescript
// src/ai/flows/find-similar-faces-flow.ts
- Input: Face embedding + threshold
- Output: Array of similar faces with confidence scores
- Implements cosine similarity for vector comparison
```

#### c. Auto-Identify Faces in Roster Flow
```typescript
// src/ai/flows/auto-identify-roster-faces-flow.ts
- Input: Array of unidentified face regions from a roster
- Output: Suggested person matches for each face
- Combines embedding comparison with contextual clues
```

### 4. UI Components

#### a. Face Recognition Toggle
- Add to `ImageWorkspace.tsx` or `RosterPanel.tsx`
- Enable/disable automatic face recognition
- Show confidence thresholds

#### b. Face Match Suggestions UI
- Display suggested matches when creating roster
- Allow acceptance/rejection of suggestions
- Show confidence scores

#### c. Bulk Face Processing
- Progress indicator for batch processing
- Queue management for large rosters

### 5. Implementation Phases

#### Phase 1: Face Embedding Infrastructure
1. Create embedding generation flow
2. Update FaceAppearance type
3. Add embedding storage to person creation
4. Create migration script for existing faces

#### Phase 2: Face Matching Core
1. Implement similarity search flow
2. Add vector comparison utilities
3. Create face matching service
4. Test with sample data

#### Phase 3: Auto-Recognition UI
1. Add recognition toggle to UI
2. Create suggestion interface
3. Implement accept/reject workflow
4. Add confidence visualization

#### Phase 4: Performance & Optimization
1. Implement embedding caching
2. Add batch processing
3. Optimize for large datasets
4. Add background processing

### 6. Technical Considerations

#### Performance
- Cache embeddings locally for quick comparison
- Batch process faces to reduce API calls
- Use IndexedDB for client-side embedding storage

#### Privacy & Security
- Embeddings stored per user (isolated)
- Option to disable face recognition
- Clear consent UI for face processing

#### Error Handling
- Graceful degradation if AI unavailable
- Manual fallback always available
- Clear error messages for users

### 7. API Design

```typescript
// Context API additions
interface FaceRosterContextType {
  // ... existing methods
  
  // Face recognition methods
  enableFaceRecognition: (enabled: boolean) => void;
  generateFaceEmbedding: (faceImageUri: string) => Promise<number[]>;
  findSimilarFaces: (embedding: number[], threshold?: number) => Promise<SimilarFaceMatch[]>;
  autoIdentifyRosterFaces: (rosterId: string) => Promise<FaceIdentificationSuggestion[]>;
  acceptFaceMatch: (regionId: string, personId: string) => Promise<void>;
  rejectFaceMatch: (regionId: string) => Promise<void>;
}

interface SimilarFaceMatch {
  personId: string;
  faceAppearanceId: string;
  confidence: number;
  person?: Person;
}

interface FaceIdentificationSuggestion {
  regionId: string;
  suggestedMatches: SimilarFaceMatch[];
}
```

### 8. User Flow

1. User uploads roster image
2. System detects faces (manual or auto)
3. If face recognition enabled:
   - Generate embeddings for new faces
   - Compare with existing person embeddings
   - Show suggestions with confidence
4. User reviews and accepts/rejects matches
5. Unmatched faces can be created as new people
6. System learns from user decisions

### 9. Testing Strategy

1. Unit tests for embedding generation
2. Integration tests for face matching
3. E2E tests for full recognition flow
4. Performance benchmarks
5. Accuracy metrics tracking

### 10. Future Enhancements

1. Face clustering for automatic grouping
2. Temporal face tracking across rosters
3. Age progression handling
4. Expression-invariant matching
5. Real-time recognition during upload