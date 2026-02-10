/**
 * Central Firebase Configuration
 * 
 * This is the central Firestore database used for:
 * - Organization metadata
 * - User authentication and profiles
 * - User-organization memberships
 * - Super admin operations
 * 
 * Each organization also has its own isolated Realtime Database
 */

const CENTRAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDvVQyobB0zidbVp59XzuE5Tatb0M1xPGg",
  authDomain: "universal-contribution-manager.firebaseapp.com",
  projectId: "universal-contribution-manager",
  storageBucket: "universal-contribution-manager.firebasestorage.app",
  messagingSenderId: "10877815438",
  appId: "1:10877815438:web:62bf12fcc99ccead3fd7df",
  measurementId: "G-ZEBML1MZQ6"
};

// Central Firebase initialization
let centralApp = null;
let centralFirestore = null;
let centralAuth = null;

function initializeCentralFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }

    centralApp = firebase.initializeApp(CENTRAL_FIREBASE_CONFIG);
    centralFirestore = firebase.firestore(centralApp);
    
    // Auth initialization is optional - only initialize if available
    if (typeof firebase.auth === 'function') {
      centralAuth = firebase.auth(centralApp);
    }

    console.log('Central Firebase (Firestore) initialized');
    return {
      app: centralApp,
      db: centralFirestore,
      auth: centralAuth
    };
  } catch (error) {
    console.error('Failed to initialize Central Firebase:', error);
    throw error;
  }
}

function getCentralFirestore() {
  return centralFirestore;
}

function getCentralAuth() {
  return centralAuth;
}

function getCentralApp() {
  return centralApp;
}
