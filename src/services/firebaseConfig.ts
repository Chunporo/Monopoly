/**
 * Firebase Configuration
 * 
 * To use Firebase backend:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Realtime Database
 * 3. Copy your config values to .env file or replace the values below
 * 
 * Environment variables (create .env file in project root):
 * VITE_FIREBASE_API_KEY=your_api_key
 * VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 * VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
 * VITE_FIREBASE_PROJECT_ID=your_project_id
 * VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 * VITE_FIREBASE_APP_ID=your_app_id
 */

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

/**
 * Firebase Realtime Database Rules
 * 
 * Copy these rules to your Firebase Console > Realtime Database > Rules:
 * 
 * {
 *   "rules": {
 *     "rooms": {
 *       "$roomId": {
 *         ".read": true,
 *         ".write": true,
 *         "players": {
 *           ".indexOn": ["id"]
 *         }
 *       }
 *     }
 *   }
 * }
 * 
 * For production, add authentication:
 * 
 * {
 *   "rules": {
 *     "rooms": {
 *       "$roomId": {
 *         ".read": "auth != null",
 *         ".write": "auth != null"
 *       }
 *     }
 *   }
 * }
 */

export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.databaseURL &&
        firebaseConfig.projectId
    );
};
