// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
// IMPORTANT: REPLACE THIS ENTIRE OBJECT with the firebaseConfig
// from your own Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
// console.log("FirebaseConfig object in firebase.ts:", firebaseConfig);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;

let isConfigComplete = true;
const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId", "storageBucket"];
const problematicConfigKeys: string[] = [];

for (const key of criticalKeys) {
  const value = firebaseConfig[key];
  if (!value || typeof value !== 'string' || value.trim() === "" || value.startsWith("YOUR_") || value.includes("REPLACE ME")) {
    isConfigComplete = false;
    problematicConfigKeys.push(key);
  }
}

if (!isConfigComplete) {
  console.error(
    `Firebase configuration in src/lib/firebase.ts is INCOMPLETE or uses placeholder values for critical keys: [${problematicConfigKeys.join(', ')}]. ` +
    "Please update it with the configuration from your Firebase project. Firebase services will not be available until this is corrected."
  );
} else {
  // console.log("Firebase configuration appears complete with critical keys. Attempting to initialize...");
  if (typeof window !== "undefined") { 
    if (getApps().length === 0) {
      try {
        // console.log("No Firebase app initialized yet. Calling initializeApp...");
        app = initializeApp(firebaseConfig);
        // console.log("Firebase app initialized successfully. App name:", app.name);
      } catch (error) {
        firebaseInitializationError = error as Error;
        console.error("Firebase SDK initializeApp error:", firebaseInitializationError);
        app = null; 
      }
    } else {
      app = getApp();
      // console.log("Firebase app already initialized. Reusing existing app. App name:", app.name);
    }
  }
}

if (app && isConfigComplete) {
  try {
    // console.log("Attempting to get Firebase Auth instance...");
    auth = getAuth(app);
    // if (auth) {
    //     console.log("Firebase Auth instance obtained successfully.");
    // } else {
    //     console.warn("getAuth(app) returned null or undefined. Auth will be unavailable.");
    // }

    // console.log("Attempting to get Firebase Firestore instance...");
    db = getFirestore(app);
    // console.log("Firebase Firestore instance obtained.");

    // console.log("Attempting to get Firebase Storage instance...");
    storage = getStorage(app);
    // console.log("Firebase Storage instance obtained.");

  } catch (error) {
    const typedError = error as any;
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", typedError);
    auth = null; 
    db = null;
    storage = null;
  }
} else {
  if (!isConfigComplete) {
    // Error already logged above about incomplete config
  } else if (firebaseInitializationError) {
     // console.error("Firebase app could not be initialized due to an SDK error (see console above). Auth, Firestore, and Storage will be unavailable.");
  } else if (typeof window !== "undefined" && !app) {
     // console.warn("Firebase app object is null even after attempted initialization. Auth, Firestore, and Storage will be unavailable.");
  }
}

export { app, auth, db, storage };
