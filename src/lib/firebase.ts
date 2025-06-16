
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
// This configuration was provided by the user.
const firebaseConfig = {
  apiKey: "AIzaSyBQMTKCV77S6LI0TkhOLjicsR-j9BU5eK8",
  authDomain: "faceroster.firebaseapp.com",
  projectId: "faceroster",
  storageBucket: "faceroster.firebasestorage.app",
  messagingSenderId: "17864523080",
  appId: "1:17864523080:web:e03c71bdbe26ba4712077d"
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
console.log("FirebaseConfig object in firebase.ts:", firebaseConfig);

// --- Basic Configuration Validation Logic ---
const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
let isConfigSufficient = true;
let missingKeys: string[] = [];

for (const key of criticalKeys) {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  if (!value || typeof value !== 'string' || value.trim() === "") {
    isConfigSufficient = false;
    missingKeys.push(key);
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;

if (!isConfigSufficient) {
  console.error(
    `Firebase configuration in src/lib/firebase.ts is MISSING critical keys: [${missingKeys.join(', ')}]. ` +
    "Please ensure these are correctly set in firebaseConfig. " +
    "Firebase services will not be available until this is corrected."
  );
} else {
  console.log("Firebase configuration appears to have all critical keys. Attempting to initialize...");
  if (getApps().length === 0) {
    try {
      console.log("No Firebase app initialized yet. Calling initializeApp...");
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully. App object:", app);
    } catch (error) {
      firebaseInitializationError = error as Error;
      console.error("Firebase SDK initializeApp error:", firebaseInitializationError);
      app = null; 
    }
  } else {
    app = getApp();
    console.log("Firebase app already initialized. Reusing existing app. App object:", app);
  }
}

if (app) {
  try {
    console.log("Attempting to get Firebase Auth instance...");
    auth = getAuth(app);
    console.log("Firebase Auth instance obtained. Auth object:", auth);
    if (!auth) {
        console.warn("getAuth(app) returned null or undefined. Auth will be unavailable.");
    }

    console.log("Attempting to get Firebase Firestore instance...");
    db = getFirestore(app);
    console.log("Firebase Firestore instance obtained. DB object:", db);

    console.log("Attempting to get Firebase Storage instance...");
    storage = getStorage(app);
    console.log("Firebase Storage instance obtained. Storage object:", storage);

  } catch (error) {
    const typedError = error as any; 
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", typedError);
    if (typedError.code && (typedError.code.startsWith('auth/'))) {
        console.error(
          `This Auth error (${typedError.code}) after app initialization strongly suggests that while the basic config might be present, ` +
          "the Authentication service isn't correctly enabled or configured for this app in the Firebase/Google Cloud console, or there's a mismatch with the project settings."
        );
    }
    auth = null; // Ensure auth is null if there was an error getting it
    db = null;
    storage = null;
  }
} else {
  if (!isConfigSufficient) {
    // Error already logged above about missing config keys
  } else if (firebaseInitializationError) {
     console.error("Firebase app could not be initialized due to an SDK error (see above). Auth, Firestore, and Storage will be unavailable.");
  } else {
     console.warn("Firebase app object is null for an unknown reason, despite configuration appearing sufficient and no caught SDK error. Auth, Firestore, and Storage will be unavailable.");
  }
}

export { app, auth, db, storage };
