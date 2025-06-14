/**
 * Authentication Service
 * 
 * Handles all authentication-related functionality including sign-in,
 * sign-out, user management, and session handling using Firebase Auth.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getFirebaseServices } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler, ErrorType } from '../utils/error-handler.js';

/**
 * Authentication Service class
 * 
 * Provides comprehensive authentication functionality using Firebase Auth.
 * Manages user sessions, profile updates, and authentication state changes.
 */
export class AuthService {
  /**
   * Initialize the authentication service
   */  constructor() {
    this.logger = new Logger('AuthService');
    this.errorHandler = new ErrorHandler();
    this.auth = null;
    this.firestore = null;
    this.currentUser = null;
    this.authStateListeners = [];
    this.isInitialized = false;
    
    this.logger.debug('AuthService instance created');
  }/**
   * Initialize Firebase and authentication
   * 
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.logger.info('Initializing Firebase Authentication...');      // Get Firebase services
      const firebaseServices = getFirebaseServices();
      this.auth = firebaseServices.auth;
      this.firestore = firebaseServices.firestore;
      this.firestore = firebaseServices.firestore;
      
      if (!this.auth) {
        throw new Error('Firebase Auth not available. Please ensure Firebase is initialized.');
      }
      
      if (!this.firestore) {
        throw new Error('Firebase Firestore not available. Please ensure Firebase is initialized.');
      }
      
      // Set up auth state monitoring
      this.setupAuthStateMonitoring();
      
      this.isInitialized = true;
      this.logger.info('✅ Authentication service initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize authentication service', error);
      this.errorHandler.handleError(error, { 
        type: ErrorType.CONFIGURATION,
        context: 'AuthService initialization' 
      });
      throw error;
    }
  }

  /**
   * Set up authentication state monitoring
   * 
   * @private
   */
  setupAuthStateMonitoring() {
    onAuthStateChanged(this.auth, (user) => {
      this.logger.debug('Auth state changed', {
        authenticated: !!user,
        userId: user?.uid
      });
      
      this.currentUser = user;
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => {
        try {
          listener(user);
        } catch (error) {
          this.logger.error('Error in auth state listener', error);
        }
      });
    });
  }

  /**
   * Sign in user with email and password
   * 
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise<Object>} User credentials
   */
  async signIn(email, password) {
    try {
      this.logger.info('Attempting user sign-in', { email });
      
      // Validate inputs
      this.validateEmail(email);
      this.validatePassword(password);
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      this.logger.info('User signed in successfully', {
        userId: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });
      
      return {
        user: this.formatUserData(user),
        success: true
      };
        } catch (error) {
      this.logger.error('Sign-in failed', error);
      
      const errorInfo = this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'User sign-in',
        email
      });
      
      // Create a new error with user-friendly message but preserve the original code
      const friendlyMessage = this.getAuthErrorMessage(error.code);
      const newError = new Error(friendlyMessage);
      newError.code = error.code; // Preserve the original error code
      newError.originalError = error; // Preserve the original error for debugging
      
      throw newError;
    }
  }
  /**
   * Create new user account
   * 
   * @param {string} email - User email address
   * @param {string} password - User password
   * @param {Object} [profile={}] - Additional profile information
   * @returns {Promise<Object>} User credentials
   */
  async createAccount(email, password, profile = {}) {
    try {
      this.logger.info('Creating new user account', { email });
      
      // Validate inputs
      this.validateEmail(email);
      this.validatePassword(password);
      
      // Create user with Firebase (with timeout)
      const createUserPromise = createUserWithEmailAndPassword(this.auth, email, password);
      const createUserTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User creation timed out. Please check your internet connection.')), 15000);
      });
      
      const userCredential = await Promise.race([createUserPromise, createUserTimeout]);
      const user = userCredential.user;
      
      // Update profile if provided (with timeout)
      if (profile.displayName) {
        const updateProfilePromise = updateProfile(user, {
          displayName: profile.displayName,
          photoURL: profile.photoURL || null
        });
        const updateProfileTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile update timed out.')), 10000);
        });
        
        await Promise.race([updateProfilePromise, updateProfileTimeout]);
      }
      
      // Create user document in Firestore (with timeout and retry logic)
      const userData = {
        uid: user.uid,
        email: user.email,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
        role: 'user', // Default role
        settings: {
          notifications: true,
          theme: 'light',
          language: 'en'
        },
        profile: {
          bio: '',
          location: '',
          website: '',
          avatar: user.photoURL || ''
        }
      };
      
      // Save user document to Firestore with timeout and single retry
      await this.saveUserDataWithTimeout(user.uid, userData);
      
      this.logger.info('User profile saved to database', {
        userId: user.uid,
        email: user.email
      });
      
      // Send email verification (with timeout)
      const emailVerificationPromise = sendEmailVerification(user);
      const emailVerificationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email verification send timed out.')), 10000);
      });
      
      try {
        await Promise.race([emailVerificationPromise, emailVerificationTimeout]);
      } catch (emailError) {
        // Log email verification error but don't fail the registration
        this.logger.warn('Email verification failed', emailError);
        // Continue with registration success
      }
      
      this.logger.info('User account created successfully', {
        userId: user.uid,
        email: user.email
      });
      
      return {
        user: this.formatUserData(user),
        userData: userData,
        success: true
      };
        } catch (error) {
      this.logger.error('Account creation failed', error);
      
      this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'Account creation',
        email
      });
      
      // Create a new error with user-friendly message but preserve the original code
      const friendlyMessage = this.getAuthErrorMessage(error.code) || error.message;
      const newError = new Error(friendlyMessage);
      newError.code = error.code; // Preserve the original error code
      newError.originalError = error; // Preserve the original error for debugging
      
      throw newError;
    }
  }

  /**
   * Save user data to Firestore with timeout and limited retry
   * 
   * @private
   * @param {string} userId - User ID
   * @param {Object} userData - User data to save
   * @returns {Promise<void>}
   */
  async saveUserDataWithTimeout(userId, userData) {
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const savePromise = setDoc(doc(this.firestore, 'users', userId), userData);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Firestore write operation timed out. Please check your internet connection.'));
          }, 15000); // 15 second timeout for Firestore writes
        });
        
        await Promise.race([savePromise, timeoutPromise]);
        return; // Success, exit the retry loop
        
      } catch (error) {
        retryCount++;
        this.logger.warn(`Firestore save attempt ${retryCount}/${maxRetries} failed`, error);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to save user profile after ${maxRetries} attempts. ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }  }
  
  /**
   * Sign out current user
   * 
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      const userId = this.currentUser?.uid;
      
      this.logger.info('Signing out user', { userId });
      
      await signOut(this.auth);
      
      this.currentUser = null;
      
      this.logger.info('User signed out successfully');
      
    } catch (error) {
      this.logger.error('Sign-out failed', error);
      
      this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'User sign-out'
      });
      
      throw error;
    }
  }

  /**
   * Send password reset email
   * 
   * @param {string} email - User email address
   * @returns {Promise<void>}
   */
  async resetPassword(email) {
    try {
      this.logger.info('Sending password reset email', { email });
      
      this.validateEmail(email);
      
      await sendPasswordResetEmail(this.auth, email);
      
      this.logger.info('Password reset email sent successfully');
      
    } catch (error) {
      this.logger.error('Password reset failed', error);
        this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'Password reset',
        email
      });
      
      const friendlyMessage = this.getAuthErrorMessage(error.code);
      const newError = new Error(friendlyMessage);
      newError.code = error.code;
      newError.originalError = error;
      
      throw newError;
    }
  }

  /**
   * Update user password
   * 
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async updateUserPassword(newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      this.logger.info('Updating user password');
      
      this.validatePassword(newPassword);
      
      await updatePassword(this.currentUser, newPassword);
      
      this.logger.info('Password updated successfully');
      
    } catch (error) {
      this.logger.error('Password update failed', error);
        this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'Password update'
      });
      
      const friendlyMessage = this.getAuthErrorMessage(error.code);
      const newError = new Error(friendlyMessage);
      newError.code = error.code;
      newError.originalError = error;
      
      throw newError;
    }
  }

  /**
   * Update user profile
   * 
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<void>}
   */
  async updateUserProfile(profileData) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      this.logger.info('Updating user profile', { userId: this.currentUser.uid });
      
      await updateProfile(this.currentUser, profileData);
      
      this.logger.info('Profile updated successfully');
      
    } catch (error) {
      this.logger.error('Profile update failed', error);
      
      this.errorHandler.handleError(error, {
        type: ErrorType.AUTHENTICATION,
        context: 'Profile update'
      });
      
      throw error;
    }
  }

  /**
   * Get current user
   * 
   * @returns {Object|null} Current user data or null
   */
  getCurrentUser() {
    if (this.currentUser) {
      return this.formatUserData(this.currentUser);
    }
    return null;
  }

  /**
   * Check if user is authenticated
   * 
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Register authentication state change listener
   * 
   * @param {Function} callback - Callback function to call on auth state change
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Validate email format
   * 
   * @private
   * @param {string} email - Email to validate
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate password strength
   * 
   * @private
   * @param {string} password - Password to validate
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  /**
   * Format user data for consistent structure
   * 
   * @private
   * @param {Object} user - Firebase user object
   * @returns {Object} Formatted user data
   */
  formatUserData(user) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime
    };
  }

  /**
   * Get user-friendly error message
   * 
   * @private
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  getAuthErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
      'auth/invalid-email': 'Invalid email address format.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please sign in again to complete this action.'
    };
    
    return errorMessages[errorCode] || 'An authentication error occurred. Please try again.';
  }

  /**
   * Clean up service resources
   * 
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up authentication service');
      
      // Clear listeners
      this.authStateListeners = [];
      
      // Reset state
      this.currentUser = null;
      this.isInitialized = false;
      
      this.logger.info('Authentication service cleanup complete');
      
    } catch (error) {
      this.logger.error('Error during authentication service cleanup', error);
    }
  }
}
