
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBQMTKCV77S6LI0Tkh0LjicsR-j9BU5eK8",
  authDomain: "faceroster.firebaseapp.com",
  projectId: "faceroster",
  storageBucket: "faceroster.firebasestorage.app", // Note: your screenshot showed "faceroster.firebasestorage.app", usually it's "your-project-id.appspot.com". Ensure this is correct from your Firebase console.
  messagingSenderId: "17864523080", // Note: your screenshot showed "17864523080", ensure this is correct.
  appId: "1:17864523080:web:e03c71bdbe26ba4712077d" // Note: your screenshot showed "1:17864523080:web:e03c71bdbe26ba4712077d", ensure this is correct.
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional, not present in screenshot
};

// --- Configuration Validation ---
// These are for the *template* placeholders, not for the user's actual values.
const EXACT_PLACEHOLDERS: Record<string, string> = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
};

const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
const problematicConfigKeys: string[] = [];

for (const key of criticalKeys) {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  // Check if the value is one of the generic placeholders I might have used previously.
  // This check is less relevant now that we're using the user's direct values, but harmless.
  if (!value || value === EXACT_PLACEHOLDERS[key] || (EXACT_PLACEHOLDERS[key] && typeof value === 'string' && value.includes(EXACT_PLACEHOLDERS[key]) && value.length < EXACT_PLACEHOLDERS[key].length + 5) ) {
    problematicConfigKeys.push(key);
  }
}


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const isConfigPotentiallyProblematic = problematicConfigKeys.length > 0;
let firebaseInitializationError: Error | null = null;

if (getApps().length === 0) {
  // Check if any critical values are obviously empty before trying to init
  const essentialValuesMissing = !firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId;

  if (essentialValuesMissing) {
    console.error(
      `Firebase configuration in src/lib/firebase.ts is MISSING one or more critical values (apiKey, authDomain, projectId). ` +
      "Please ensure these are correctly set with your actual Firebase project settings. " +
      "Firebase services will not be available."
    );
  } else if (isConfigPotentiallyProblematic) {
    // This warning is less likely to trigger now, as we are using user-provided values
    // but kept for robustness if somehow placeholders were re-introduced.
    console.warn(
      `Firebase configuration in src/lib/firebase.ts might still contain PLACEHOLDER values for: [${problematicConfigKeys.join(', ')}]. ` +
      "Please ensure these are replaced with your actual Firebase project settings. "
    );
  }

  // Attempt initialization regardless of the placeholder check if essential values seem present,
  // as the Firebase SDK itself will throw a more accurate error if the config is truly invalid.
  if (!essentialValuesMissing) {
    try {
      console.log("Firebase configuration found. Initializing Firebase app...");
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (error) {
      firebaseInitializationError = error as Error;
      console.error("Firebase SDK initialization error:", firebaseInitializationError);
      app = null; // Ensure app is null on error
    }
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized.");
  // It's hard to re-validate an already initialized app's config directly from here.
  // We assume if it's initialized, it used some config.
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained.");
  } catch (error) {
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", error);
    // This might indicate the app object is valid but services fail for other reasons
    // or if the initial config was subtly wrong and only caught at service level.
    auth = null;
    db = null;
    storage = null;
    if ((error as any).code === 'auth/configuration-not-found') {
        console.error("This 'auth/configuration-not-found' error suggests the firebaseConfig object, even if populated, is not valid for your project or services aren't enabled.");
    }
  }
} else {
    if (firebaseInitializationError) {
         console.error("Firebase app could not be initialized due to an SDK error (see above). Auth, Firestore, and Storage will be unavailable.");
    } else {
         console.warn("Firebase app object is null, possibly due to missing essential configuration or prior initialization failure. Auth, Firestore, and Storage will be unavailable.");
    }
}

export { app, auth, db, storage };
