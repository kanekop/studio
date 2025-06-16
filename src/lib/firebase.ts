
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBQMTKCV77S6LI0TkhOLjicsR-j9BU5eK8",
  authDomain: "faceroster.firebaseapp.com",
  projectId: "faceroster",
  storageBucket: "faceroster.firebasestorage.app",
  messagingSenderId: "17864523080",
  appId: "1:17864523080:web:e03c71bdbe26ba4712077d"
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// --- Configuration Validation Logic (Do NOT modify this section unless you are sure) ---
// This list contains common placeholder patterns that might be accidentally left in the config.
const GENERAL_PLACEHOLDER_PATTERNS: string[] = [
  "YOUR_API_KEY",
  "YOUR_AUTH_DOMAIN",
  "YOUR_PROJECT_ID",
  "YOUR_STORAGE_BUCKET",
  "YOUR_MESSAGING_SENDER_ID",
  "YOUR_APP_ID",
  "firebase-rules",
  "YOURMEASUREMENTID",
  "your-project-id",
  "your-app-id",
  "your-api-key",
  "YOU_MUST_REPLACE_THIS_WITH_YOUR_REAL_API_KEY" // Explicit placeholder used in previous steps
];

// This checks for the exact placeholders that might have been used in instructions.
const EXACT_PLACEHOLDERS: Record<string, string> = {
    apiKey: "YOU_MUST_REPLACE_THIS_WITH_YOUR_REAL_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN_PLACEHOLDER",
    projectId: "YOUR_PROJECT_ID_PLACEHOLDER",
    storageBucket: "YOUR_STORAGE_BUCKET_PLACEHOLDER",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID_PLACEHOLDER",
    appId: "YOUR_APP_ID_PLACEHOLDER",
};

const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
let problematicConfigKeys: string[] = [];
let isConfigComplete = true;

for (const key of criticalKeys) {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  let isProblematic = !value || value.trim() === "";

  if (!isProblematic) {
    // Check against the exact placeholder for this specific key if it exists in EXACT_PLACEHOLDERS
    if (EXACT_PLACEHOLDERS[key] && value === EXACT_PLACEHOLDERS[key]) {
      isProblematic = true;
    }
    // Check against general placeholder patterns only if not already caught by exact placeholder
    if (!isProblematic) {
      for (const pattern of GENERAL_PLACEHOLDER_PATTERNS) {
        if (typeof value === 'string' && value.toUpperCase().includes(pattern.toUpperCase())) {
          // A real API key starting with "AIzaSy" is much longer than the prefix itself.
          // If it's just "AIzaSy", it's a placeholder.
          if (key === "apiKey" && value === "AIzaSy") {
            isProblematic = true;
            break;
          }
          // For other keys, or if API key is not just "AIzaSy" but matches another general placeholder.
          if (key !== "apiKey" || value !== "AIzaSy") {
             // If the value IS the API key and starts with "AIzaSy" and is long enough,
             // it's likely real, so don't flag it for just containing "AIzaSy".
             // However, if it matches a MORE specific placeholder, it's still problematic.
             if (key === "apiKey" && value.startsWith("AIzaSy") && value.length > 10 && pattern.toUpperCase() === "AIzaSy".toUpperCase()){
                // This is likely a real key, continue loop to check other patterns.
             } else {
                isProblematic = true;
                break;
             }
          }
        }
      }
    }
  }

  if (isProblematic) {
    problematicConfigKeys.push(key);
    isConfigComplete = false;
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;

if (!isConfigComplete) {
  console.error(
    `Firebase configuration in src/lib/firebase.ts is INCOMPLETE or contains PLACEHOLDERS for critical keys: [${problematicConfigKeys.join(', ')}]. ` +
    "Please replace these with your actual Firebase project settings from the Firebase console. " +
    "Firebase services will not be available until this is corrected."
  );
} else {
  if (getApps().length === 0) {
    try {
      console.log("Firebase configuration appears complete. Initializing Firebase app...");
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (error) {
      firebaseInitializationError = error as Error;
      console.error("Firebase SDK initialization error:", firebaseInitializationError);
      app = null; 
    }
  } else {
    app = getApp();
    console.log("Firebase app already initialized.");
  }
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained.");
  } catch (error) {
    const typedError = error as any; 
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", typedError);
    if (typedError.code && (typedError.code === 'auth/configuration-not-found' || typedError.code === 'auth/api-key-not-valid')) {
        console.error(
          `This error (${typedError.code}) strongly suggests the firebaseConfig object in src/lib/firebase.ts, ` +
          "even if seemingly populated, is not valid for your project or specific services (like Auth) aren't correctly enabled or configured in the Firebase/Google Cloud console."
        );
    }
    auth = null;
    db = null;
    storage = null;
  }
} else {
  if (!isConfigComplete) {
    // Error already logged above about incomplete config
  } else if (firebaseInitializationError) {
       console.error("Firebase app could not be initialized due to an SDK error (see above). Auth, Firestore, and Storage will be unavailable.");
  } else if (getApps().length === 0 && isConfigComplete) {
       // This case might happen if initializeApp was called but 'app' is still null for an unknown reason
       // and no specific initialization error was caught.
       console.warn("Firebase app object is null after attempted initialization, despite configuration appearing complete and no caught SDK error. Auth, Firestore, and Storage will be unavailable.");
  } else {
      // Fallback for other scenarios where app is null.
      console.warn("Firebase app object is null. Auth, Firestore, and Storage will be unavailable.");
  }
}

export { app, auth, db, storage };
