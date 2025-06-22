# CLAUDE.md

> **Note for AI Assistants:** Before starting any work, please read this document carefully to understand the project's current state, architecture, and conventions.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FaceRoster is a Next.js 15.3.3 web application for visual people management. It allows users to upload images, identify faces, create visual rosters, and manage relationships between people.

## Development Commands

```bash
# Install dependencies
npm install

# Development server (port 9002 with Turbopack)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck

# AI development with Google Genkit
npm run genkit:dev       # Start Genkit
npm run genkit:watch     # Start with hot reload
```

## Debugging & Testing

### System Status Check
Visit `/test` in development to verify:
- Firebase service initialization (Auth, Firestore, Storage)
- Context provider hierarchy
- Basic system health

### Debugging Endpoints (Added by Gemini)

*   **/logout**: Forcefully triggers the Firebase sign-out process. Useful for testing login/logout flows when the standard UI is not functioning correctly.
*   **/firestore-test**: A simple page to test direct write operations to the Firestore database, isolating it from the main application logic.

### Debug Logging
```typescript
import { debugLog } from '@/shared/utils/debug-logger';

// Use in components for systematic error tracking
debugLog.error('ComponentName', error);
debugLog.warn('ComponentName', 'Warning message', data);
debugLog.info('ComponentName', 'Info message', data);
```

### Error Handling
```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

// Wrap components to catch unexpected errors
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript 5
- **UI**: Radix UI + ShadCN UI components, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Google Genkit with Gemini 2.0 Flash model
- **State**: React Context API (Unified FaceRosterContext - central state management)

For future plans on face recognition capabilities, please refer to a separate detailed document: `FACE_RECOGNITION_PLAN.md`.

### Current Architecture (Updated 2025/01/22)
The project has been successfully refactored to follow a **Layered Architecture** (Presentation, Domain, Infrastructure, Application). Business logic is now clearly separated from the UI layer.

#### Architecture Layers:
- **Presentation Layer** (`src/presentation/`): UI components and React-specific code
- **Domain Layer** (`src/domain/`): Business logic, entities, and domain services
- **Infrastructure Layer** (`src/infrastructure/`): External service integrations (Firebase)
- **Application Layer** (`src/application/`): Application services and context providers
- **Shared Resources** (`src/shared/`): Common types, constants, utilities, and errors

For the detailed architecture documentation, see:
[faceroster-architecture-refactoring.md](./docs/architecture/faceroster-architecture-refactoring.md)

### Directory Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/      # Login, signup pages
│   ├── (main)/      # Main app pages (people, network, rosters)
│   └── test/        # System status and debugging page
├── presentation/     # 🎨 Presentation Layer
│   ├── components/  # UI components (will be migrated from src/components)
│   └── hooks/       # React hooks that bridge domain services
├── domain/          # 💼 Domain Layer (Business Logic)
│   ├── entities/    # Domain entities (Person, Connection, Roster)
│   ├── repositories/# Repository interfaces
│   └── services/    # Domain services (ConnectionAnalyzer, PeopleService, etc.)
├── infrastructure/  # 🔧 Infrastructure Layer
│   └── firebase/    # Firebase implementations
│       ├── config.ts
│       └── repositories/
├── application/     # 🔄 Application Layer
│   ├── contexts/    # React contexts (will be migrated)
│   └── providers/   # Context providers
├── shared/          # 📦 Shared Resources
│   ├── types/       # Common type definitions
│   ├── constants/   # Application constants
│   ├── utils/       # Utility functions
│   └── errors/      # Error classes and handling
├── components/      # (Legacy - being migrated to presentation/)
├── contexts/        # (Legacy - being migrated to application/)
├── hooks/           # (Legacy - being migrated to presentation/)
├── lib/             # (Legacy - being migrated to appropriate layers)
├── types/           # (Legacy - migrated to shared/)
└── ai/              # Genkit AI integration
```

### Key Files
- `src/infrastructure/firebase/config.ts`: Firebase configuration (hardcoded, no env vars)
- `src/shared/types/index.ts`: Core type definitions including ImageSet with description
- `src/shared/utils/debug-logger.ts`: Systematic error logging utilities
- `src/shared/constants/index.ts`: Application-wide constants and configurations
- `src/domain/services/`: Business logic services (ConnectionAnalyzer, PeopleService, etc.)
- `src/presentation/hooks/`: React hooks that bridge domain services with UI
- `src/contexts/index.tsx`: Unified Context exports and AppProviders (legacy, to be migrated)
- `src/contexts/FaceRosterContext.tsx`: Central state management (legacy, to be migrated)
- `src/components/ErrorBoundary.tsx`: React error boundary component
- `src/app/test/page.tsx`: System status verification page

## Core Features & Implementation

### 1. People Management
- CRUD operations on people data
- Search and filter functionality with debounce
- Company-based filtering
- Stored in Firestore: `/people/{personId}`

### 2. Roster Management
- Image upload and face region selection
- Manual face identification via drag-and-drop
- **Face region extraction**: `createRosterFromRegions` method for automatic face cropping
- Canvas-based image processing for face region isolation  
- Stored in Firestore: `/rosters/{rosterId}`
- Images in Cloud Storage: `/users/{userId}/rosters/`

### 3. Network (Connection Management)
- Bidirectional relationships between people
- Connection types: colleague, friend, family, other
- Stored in Firestore: `/connections/{connectionId}`

### 4. AI Features (In Development)
- People merge suggestions using Genkit
- Face recognition capabilities planned

## Important Conventions

### Component Pattern
```typescript
// Use function components with typed props
interface Props {
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  // Implementation
};
```

### State Updates
```typescript
// Use unified context exports from @/contexts
const { 
  roster, 
  createRosterFromRegions, 
  selectPerson, 
  updatePersonDetails,
  currentUser,
  isProcessing,
  imageDataUrl,
  originalImageSize,
  drawnRegions,
  handleImageUpload,
  addDrawnRegion,
  clearDrawnRegions,
  getScaledRegionForDisplay
} = useFaceRoster();

// Handle async operations with proper error handling
const handleSubmit = async (data: FormData) => {
  try {
    await updatePersonDetails(personId, data);
    toast({ title: 'Success', description: 'Person updated' });
  } catch (error) {
    debugLog.error('ComponentName', error);
    toast({ title: 'Error', description: 'Failed to update person', variant: 'destructive' });
  }
};

// Create roster from selected face regions
const handleRegionSelection = async (regions: Region[], imageDataUrl: string) => {
  await createRosterFromRegions(regions, imageDataUrl, storagePath, imageSize);
};
```

### Defensive Programming
```typescript
// Always use null-safe access patterns
const safePeople = people || [];
const person = people?.find(p => p.id === id);
const name = person?.name || 'Unknown';

// Validate objects before use
if (!person?.id) {
  console.warn('Person object missing id:', person);
  return null;
}

// Use optional chaining for function calls
onClick={() => selectPerson?.(person.id)}
```

### Styling with Tailwind
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/shared/utils/utils';

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  isDisabled && "disabled-styles"
)} />
```

### Firebase Security
- User data is isolated by UID
- All queries must include proper auth checks
- Storage paths follow: `/users/{userId}/...`

## Common Development Tasks

### Adding a New Feature Component
1. Create component in `src/presentation/components/features/`
2. Add types to `src/shared/types/index.ts` if needed
3. Create or update domain services in `src/domain/services/`
4. Create presentation hooks in `src/presentation/hooks/` to bridge domain and UI
5. Implement Firebase operations through repository pattern in `src/infrastructure/firebase/repositories/`

### Working with Dialogs
```typescript
// Use the dialog manager hook
const { openDialog, closeDialog } = useDialogManager();

// Open with props
openDialog('editPerson', { personId: '123' });
```

### Image Upload Pattern
```typescript
// Always validate file size and type
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Upload to Firebase Storage
const storageRef = ref(storage, `users/${userId}/images/${filename}`);
await uploadBytes(storageRef, file);
const downloadURL = await getDownloadURL(storageRef);
```

### Face Region Processing
```typescript
// Create roster from selected face regions
const { createRosterFromRegions } = useFaceRoster();

// Process face regions from image
const handleFaceRegions = async (
  regions: Region[],
  imageDataUrl: string,
  originalImageStoragePath: string,
  originalImageSize: { width: number; height: number }
) => {
  await createRosterFromRegions(
    regions, 
    imageDataUrl, 
    originalImageStoragePath, 
    originalImageSize
  );
};

// Canvas-based face extraction
// - Automatically crops each selected region
// - Creates temporary person entries
// - Uses Canvas API for image processing
```

## Testing & Quality Checks

Before committing:
1. Run `npm run typecheck` - Must pass with no errors
2. Run `npm run lint` - Fix any linting issues
3. Test core flows: image upload, person creation, connection management
4. Verify Firebase security rules work correctly

## Error Handling & Code Robustness Policy

### Critical Development Principles

**ALL CODE MUST BE DEFENSIVE AND NULL-SAFE**

1. **Never assume data exists**:
   ```typescript
   // ❌ WRONG - Will crash if people is undefined
   const person = people.find(p => p.id === id);
   
   // ✅ CORRECT - Safe access with fallback
   const person = people?.find(p => p.id === id) || null;
   ```

2. **Always check loading states**:
   ```typescript
   // ❌ WRONG - Shows content before data loads
   if (connections.length === 0) return <EmptyState />;
   
   // ✅ CORRECT - Consider loading state
   if (isLoading) return <LoadingState />;
   if (!connections || connections.length === 0) return <EmptyState />;
   ```

3. **Validate all external data**:
   ```typescript
   // ❌ WRONG - Direct access to nested properties
   const name = user.profile.name;
   
   // ✅ CORRECT - Safe nested access
   const name = user?.profile?.name || 'Unknown';
   ```

4. **Use strict TypeScript**:
   - Enable `strict: true` in tsconfig.json
   - Use `?` for optional properties
   - Define union types for possible null/undefined states
   - Use type guards for runtime validation

5. **Handle async operations properly**:
   ```typescript
   // ✅ CORRECT - Always wrap in try-catch
   const handleAction = async () => {
     try {
       setLoading(true);
       await performOperation();
       toast.success('Success');
     } catch (error) {
       console.error('Operation failed:', error);
       toast.error('Operation failed');
     } finally {
       setLoading(false);
     }
   };
   ```

6. **Implement proper error boundaries**:
   - Use React Error Boundaries for component-level errors
   - Provide meaningful fallback UIs
   - Log errors for debugging

### Code Review Checklist

Before committing any code, verify:
- [ ] All array access uses optional chaining (`?.`)
- [ ] All object property access is null-safe
- [ ] Loading states are properly handled
- [ ] Error boundaries are in place for critical components
- [ ] TypeScript strict mode warnings are resolved
- [ ] All async operations have try-catch blocks
- [ ] User feedback is provided for error states

## Documentation Maintenance

**Critical: Keep documentation current with code changes**

- **After completing any development work**: Update relevant documentation immediately
- **Before committing to Git**: Always verify documentation reflects current implementation
- **For code reviews**: Ensure documentation changes are included to prevent inconsistencies
- **Architecture changes**: Update CLAUDE.md, component documentation, and type definitions
- **New features**: Document usage patterns, conventions, and integration points

Common documentation to update:
- CLAUDE.md (architecture, conventions, commands)
- Component README files (if any)
- TypeScript type definitions in comments
- API documentation for context hooks
- Installation and setup instructions

This prevents confusion during code reviews and ensures team members have accurate information.

## Notes

- Firebase config is hardcoded (no .env file needed)
- Authentication is required for all main features
- Images are limited to 10MB
- The app uses localStorage for temporary data persistence
- Z-index hierarchy is managed via CSS variables for proper layering
- All Context hooks are unified and exported from `@/contexts`
- Defensive programming is applied to prevent null/undefined errors
- Debug logging and error boundaries are implemented for better error tracking
- `/test` page available for system health checks during development

## Decision Log

- **2025/06/22:** `RosterContext` was deprecated and its functionality was fully merged into `FaceRosterContext` to unify state management. The old `RosterContext.tsx` file has been deleted.
- **2025/01/22:** Successfully implemented Phase 1-4 of the layered architecture refactoring:
  - Phase 1: Created new directory structure and moved shared resources
  - Phase 2: Built domain layer with entities and services
  - Phase 3: Cleaned up presentation layer by extracting business logic
  - Phase 4: Verified integration and backward compatibility
- **2025/01/22:** Migrated all imports from old paths to new architecture:
  - `@/lib/*` → `@/shared/*`
  - `@/types` → `@/shared/types`
  - `@/lib/firebase` → `@/infrastructure/firebase/config`
- **2025/01/22:** Fixed all TypeScript errors:
  - Changed `ErrorType` to `ErrorCode` throughout the codebase
  - Added `faceImageUrl` property to `EditablePersonInContext` interface
  - Fixed `faceImagePath` → `faceImageStoragePath` in `FaceAppearance` usage
- **2025/01/23:** Implemented data synchronization fixes:
  - Added `useEffect` to NetworkPage to refresh connections data on mount
  - Confirmed PeoplePage already had data refresh on mount
  - Fixed context synchronization issue where data updates in one context weren't reflected in another
- **2025/01/23:** Partially fixed TypeScript errors (maintaining app stability):
  - Fixed missing `addedBy` in AddPersonDialog.tsx
  - Removed `tags` type annotation in CreateRosterDialog.tsx
  - Fixed `onOpenAutoFocus` prop error in MobileLongPressMenu.tsx
  - Fixed missing `rostersCount` in usePeopleSearch.ts
  - Fixed duplicate function implementations in PeopleService.ts
  - Added missing `documentId` import in PeopleService.ts
  - Added `tags` property to Roster entity class
  - Removed invalid `tempOriginalRegion` property in PeopleService.ts
  - Note: Several `EditablePersonInContext` type errors remain but require careful review to avoid breaking the app

## Current Status & Next Steps

### Completed
- ✅ Phase 1-4 of layered architecture implementation (2025/01/22)
- ✅ Business logic extracted from UI components (2025/01/22)
- ✅ Domain services created for core functionality (2025/01/22)
- ✅ Presentation hooks bridge domain and UI layers (2025/01/22)
- ✅ Backward compatibility maintained (2025/01/22)
- ✅ Import paths migrated to new structure (2025/01/22)
- ✅ Data synchronization between contexts fixed (2025/01/23)
- ✅ Partial TypeScript error fixes completed (2025/01/23)

### Next Steps
1. **Fix Remaining TypeScript Errors**:
   - Resolve `EditablePersonInContext` type definition conflicts
   - Fix remaining type errors in RosterItemDetail.tsx
   - Address type issues in FaceRosterContext.tsx
   - Ensure all components have proper type safety

2. **Complete Migration of Remaining Components**:
   - Move remaining business logic from contexts to domain services
   - Migrate components from `src/components` to `src/presentation/components`
   - Update all imports to use new paths

3. **Implement Remaining Repository Patterns**:
   - Complete FirebaseConnectionRepository
   - Implement FirebaseRosterRepository
   - Create repository factory for dependency injection

4. **Testing Infrastructure**:
   - Add unit tests for domain services
   - Test presentation hooks in isolation
   - E2E tests for critical user flows

5. **Documentation**:
   - Update component documentation
   - Create architecture decision records (ADRs)
   - Developer onboarding guide for new architecture