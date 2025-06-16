
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebaseプロジェクトの設定情報をここに入力してください。
// これらの値はFirebaseコンソールのプロジェクト設定から取得できます。
// （歯車アイコン > プロジェクトの設定 > 全般タブ > マイアプリセクション）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <-- ここにFirebaseプロジェクトのAPIキーを入力してください
  authDomain: "YOUR_AUTH_DOMAIN", // <-- ここにFirebaseプロジェクトのAuthドメインを入力してください
  projectId: "YOUR_PROJECT_ID", // <-- ここにFirebaseプロジェクトのプロジェクトIDを入力してください
  storageBucket: "YOUR_STORAGE_BUCKET", // <-- ここにFirebaseプロジェクトのストレージバケットを入力してください
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- ここにFirebaseプロジェクトのメッセージングセンダーIDを入力してください
  appId: "YOUR_APP_ID", // <-- ここにFirebaseプロジェクトのApp IDを入力してください
  // measurementId: "YOUR_MEASUREMENT_ID" // 通常はオプションです
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  if (
    firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.authDomain && firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" &&
    firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  ) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn(
      "Firebase configuration is missing or incomplete. " +
      "Please ensure all 'YOUR_...' placeholders in src/lib/firebase.ts are replaced with your actual Firebase project settings. " +
      "Firebase services will not be available."
    );
    // アプリケーションがFirebaseなしでも部分的に動作できるように、
    // nullチェックを各サービス呼び出し元で行うか、
    // ここでエラーをスローするなどの対応が必要です。
    // 今回は警告にとどめます。
  }
} else {
  app = getApp();
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

export { app, auth, db, storage };
