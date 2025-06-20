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
│   └── (main)/      # Main app pages (people, connections, rosters)
├── components/
│   ├── features/    # Feature-specific components
│   └── ui/          # Reusable ShadCN UI components
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── lib/             # Utilities and Firebase config
├── types/           # TypeScript type definitions
└── ai/              # Genkit AI integration
```

### Key Files
- `src/lib/firebase.ts`: Firebase configuration (hardcoded, no env vars)
- `src/contexts/FaceRosterContext.tsx`: Main state management
- `src/types/index.ts`: Core type definitions
- `src/ai/genkit.ts`: AI configuration

## Core Features & Implementation

### 1. People Management
- CRUD operations on people data
- Search and filter functionality with debounce
- Company-based filtering
- Stored in Firestore: `/people/{personId}`

### 2. Roster Management
- Image upload and face region selection
- Manual face identification via drag-and-drop
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
// Always use the context for global state
const { people, addPerson } = useFaceRoster();

// Handle async operations with proper error handling
const handleSubmit = async (data: FormData) => {
  try {
    await addPerson(data);
    toast.success('Person added');
  } catch (error) {
    toast.error('Failed to add person');
  }
};
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

## Notes

- Firebase config is hardcoded (no .env file needed)
- Authentication is required for all main features
- Images are limited to 10MB
- The app uses localStorage for temporary data persistence
- Z-index hierarchy is managed via CSS variables for proper layering