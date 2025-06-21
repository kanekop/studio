# CLAUDE.md

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

### Debug Logging
```typescript
import { debugLog } from '@/lib/debug-logger';

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
- **State**: React Context API (FaceRosterContext)

### Directory Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/      # Login, signup pages
│   ├── (main)/      # Main app pages (people, connections, rosters)
│   └── test/        # System status and debugging page
├── components/
│   ├── features/    # Feature-specific components
│   ├── ui/          # Reusable ShadCN UI components
│   └── ErrorBoundary.tsx  # Error boundary for unexpected errors
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── lib/             # Utilities and Firebase config
│   ├── firebase.ts  # Firebase configuration
│   └── debug-logger.ts  # Systematic error logging
├── types/           # TypeScript type definitions
└── ai/              # Genkit AI integration
```

### Key Files
- `src/lib/firebase.ts`: Firebase configuration (hardcoded, no env vars)
- `src/contexts/index.tsx`: Unified Context exports and AppProviders
- `src/types/index.ts`: Core type definitions including ImageSet with description
- `src/lib/debug-logger.ts`: Systematic error logging utilities
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

### 3. Connection Management
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
  isProcessing 
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
import { cn } from '@/lib/utils';

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
1. Create component in `src/components/features/`
2. Add types to `src/types/index.ts` if needed
3. Update context in `src/contexts/FaceRosterContext.tsx`
4. Implement Firebase operations with proper error handling

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