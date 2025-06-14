/**
 * Firebase Configuration
 * 
 * This file contains Firebase configuration and initialization using modern ES modules.
 * Firebase is loaded via CDN ES modules for static deployment compatibility.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";

/**
 * Firebase project configuration
 * 
 * @type {Object}
 * @property {string} apiKey - Firebase API key
 * @property {string} authDomain - Firebase auth domain
 * @property {string} projectId - Firebase project ID
 * @property {string} storageBucket - Firebase storage bucket
 * @property {string} messagingSenderId - Firebase messaging sender ID
 * @property {string} appId - Firebase app ID
 * @property {string} measurementId - Firebase analytics measurement ID (optional)
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDvVQyobB0zidbVp59XzuE5Tatb0M1xPGg",
  authDomain: "universal-contribution-manager.firebaseapp.com",
  databaseURL: "https://universal-contribution-manager-default-rtdb.firebaseio.com",
  projectId: "universal-contribution-manager",
  storageBucket: "universal-contribution-manager.firebasestorage.app",
  messagingSenderId: "10877815438",
  appId: "1:10877815438:web:62bf12fcc99ccead3fd7df",
  measurementId: "G-ZEBML1MZQ6" // Optional: for Analytics
};

// Global Firebase instances
let app = null;
let auth = null;
let firestore = null;
let analytics = null;

/**
 * Initialize Firebase app and services
 * This function initializes Firebase using the modern ES modules
 * 
 * @returns {Promise<Object>} Firebase services object
 */
export async function initializeFirebase() {
  try {
    // Initialize Firebase app if not already initialized
    if (!app) {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized');
    }

    // Initialize Auth
    if (!auth) {
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized');
    }

    // Initialize Firestore
    if (!firestore) {
      firestore = getFirestore(app);
      console.log('✅ Firebase Firestore initialized');
    }

    // Initialize Analytics (only in production and if measurementId is provided)
    if (!analytics && firebaseConfig.measurementId && window.location.hostname !== 'localhost') {
      try {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      } catch (error) {
        console.warn('Firebase Analytics not available:', error.message);
      }
    }

    return {
      app,
      auth,
      firestore,
      analytics
    };

  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Get Firebase services
 * Returns the initialized Firebase services
 * 
 * @returns {Object} Firebase services
 */
export function getFirebaseServices() {
  if (!app || !auth || !firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }

  return {
    app,
    auth,
    firestore,
    analytics
  };
}

/**
 * Application environment configuration
 * 
 * @type {Object}
 */
export const environment = {
  production: false,
  development: true,
  version: '3.0.0',
  buildDate: new Date().toISOString()
};

/**
 * Feature flags for the application
 * Use these to enable/disable features during development
 * 
 * @type {Object}
 */
export const features = {
  analytics: true,
  notifications: true,
  multiTenant: true,
  darkMode: false,
  exportData: true,
  advancedReporting: true
};

/**
 * Application constants
 * 
 * @type {Object}
 */
export const constants = {
  APP_NAME: 'Universal Contribution Manager',
  DEFAULT_LANGUAGE: 'en',
  PAGINATION_SIZE: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  REFRESH_INTERVAL: 5 * 60 * 1000  // 5 minutes in milliseconds
};

/**
 * User roles and permissions
 * 
 * @type {Object}
 */
export const roles = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

/**
 * Permission levels for different user roles
 * 
 * @type {Object}
 */
export const permissions = {
  [roles.SUPER_ADMIN]: {
    canCreateOrganization: true,
    canDeleteOrganization: true,
    canManageAllUsers: true,
    canViewAllReports: true,
    canExportData: true,
    canManageSystem: true
  },
  [roles.ORGANIZATION_ADMIN]: {
    canCreateOrganization: false,
    canDeleteOrganization: false,
    canManageOrgUsers: true,
    canViewOrgReports: true,
    canExportOrgData: true,
    canManageOrgSettings: true
  },
  [roles.MEMBER]: {
    canViewProfile: true,
    canUpdateProfile: true,
    canMakeContributions: true,
    canViewOwnContributions: true
  },
  [roles.VIEWER]: {
    canViewProfile: true,
    canViewPublicData: true
  }
};

/**
 * API endpoints configuration
 * 
 * @type {Object}
 */
export const apiEndpoints = {
  // Firebase collections
  users: 'users',
  organizations: 'organizations',
  contributions: 'contributions',
  members: 'members',
  systemLogs: 'system_logs',
  
  // External APIs (if any)
  paymentGateway: 'https://api.example-payment.com/v1',
  notificationService: 'https://api.example-notifications.com/v1'
};

/**
 * UI configuration
 * 
 * @type {Object}
 */
export const uiConfig = {
  theme: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2'
  },
  
  animations: {
    duration: 300,
    easing: 'ease-in-out'
  },
  
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px'
  }
};

/**
 * Validates the Firebase configuration
 * 
 * @returns {boolean} True if configuration is valid
 */
export function validateFirebaseConfig() {
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  
  for (const field of requiredFields) {
    if (!firebaseConfig[field] || firebaseConfig[field].includes('your-')) {
      console.warn(`Firebase ${field} not configured properly`);
      return false;
    }
  }
  
  return true;
}

/**
 * Gets user permissions based on role
 * 
 * @param {string} userRole - The user's role
 * @returns {Object} User permissions object
 */
export function getUserPermissions(userRole) {
  return permissions[userRole] || permissions[roles.VIEWER];
}

/**
 * Checks if a user has a specific permission
 * 
 * @param {string} userRole - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(userRole, permission) {
  const userPermissions = getUserPermissions(userRole);
  return userPermissions[permission] || false;
}
