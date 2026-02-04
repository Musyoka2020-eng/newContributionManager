/**
 * Central Firebase Configuration
 * 
 * This is the central database used for:
 * - Organization metadata
 * - User authentication and profiles
 * - User-organization memberships
 * - Super admin operations
 * 
 * Each organization also has its own isolated database
 */

export const CENTRAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDvVQyobB0zidbVp59XzuE5Tatb0M1xPGg",
  authDomain: "universal-contribution-manager.firebaseapp.com",
  databaseURL: "https://universal-contribution-manager-default-rtdb.firebaseio.com",
  projectId: "universal-contribution-manager",
  storageBucket: "universal-contribution-manager.firebasestorage.app",
  messagingSenderId: "10877815438",
  appId: "1:10877815438:web:62bf12fcc99ccead3fd7df",
  measurementId: "G-ZEBML1MZQ6"
};

// Central Firebase initialization
let centralApp = null;
let centralDatabase = null;
let centralAuth = null;

export function initializeCentralFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }

    centralApp = firebase.initializeApp(CENTRAL_FIREBASE_CONFIG);
    centralDatabase = firebase.database(centralApp);
    centralAuth = firebase.auth(centralApp);

    console.log('Central Firebase initialized');
    return {
      app: centralApp,
      database: centralDatabase,
      auth: centralAuth
    };
  } catch (error) {
    console.error('Failed to initialize Central Firebase:', error);
    throw error;
  }
}

export function getCentralDatabase() {
  return centralDatabase;
}

export function getCentralAuth() {
  return centralAuth;
}

export function getCentralApp() {
  return centralApp;
}
