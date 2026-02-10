/**
 * Admin Setup Page
 * One-time initialization of the first super admin account
 */

class AdminSetupPage {
  constructor() {
    this.auth = null;
    this.db = null;
    this.setupCodeHash = null;
  }

  async init(auth, db) {
    this.auth = auth;
    this.db = db;

    // Check if setup is needed
    const setupNeeded = await this.checkIfSetupNeeded();
    
    if (!setupNeeded) {
      // Setup already completed, redirect to login
      console.log('Setup already completed, redirecting to login');
      Swal.fire({
        icon: 'info',
        title: 'Setup Already Complete',
        text: 'Redirecting to login page...',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = '/pages/superadmin/login.html';
      });
      return;
    }

    this.setupEventListeners();
  }

  async checkIfSetupNeeded() {
    try {
      const snapshot = await this.db.collection('superadminUsers').limit(1).get();
      console.log('Admin setup check - superadminUsers collection has documents:', !snapshot.empty);
      const setupNeeded = snapshot.empty;
      console.log('Setup needed:', setupNeeded);
      return setupNeeded;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      
      // If permission error, assume setup is needed (no rules for unauthenticated access yet)
      if (error.code === 'permission-denied') {
        console.warn('Permission denied - assuming setup is needed');
        return true;
      }
      
      // For other errors, also assume setup is needed
      console.warn('Error checking setup status - assuming setup is needed');
      return true;
    }
  }

  setupEventListeners() {
    const form = document.querySelector('#setupForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    const confirmPassword = document.querySelector('#confirmPassword').value;
    const setupCode = document.querySelector('#setupCode').value;

    // Validation
    if (!this.validateInputs(email, password, confirmPassword, setupCode)) {
      return;
    }

    try {
      const button = document.querySelector('#setupForm button[type="submit"]');
      button.disabled = true;

      Swal.fire({
        title: 'Creating Admin Account...',
        didOpen: () => { Swal.showLoading(); },
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
      });

      // Verify setup code
      if (!this.verifySetupCode(setupCode)) {
        throw new Error('Invalid setup code');
      }

      // Create user in Firebase Auth
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      const uid = result.user.uid;

      // Create superadmin user document in Firestore
      await this.db.collection('superadminUsers').doc(uid).set({
        uid: uid,
        email: email,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        setupCompletedAt: new Date().toISOString()
      });

      // Create user document in Firestore
      await this.db.collection('users').doc(uid).set({
        uid: uid,
        email: email,
        role: 'superadmin',
        createdAt: new Date().toISOString()
      });

      console.log('Super admin account created:', email);

      Swal.fire({
        icon: 'success',
        title: 'Setup Complete!',
        text: 'Your admin account has been created. Redirecting to login...',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        window.location.href = '/pages/superadmin/login.html';
      });
    } catch (error) {
      console.error('Setup error:', error);

      let errorMessage = 'Setup failed. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and numbers.';
      } else if (error.message === 'Invalid setup code') {
        errorMessage = 'The setup code you entered is incorrect.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Setup Failed',
        text: errorMessage,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });

      const button = document.querySelector('#setupForm button[type="submit"]');
      if (button) button.disabled = false;
    }
  }

  validateInputs(email, password, confirmPassword, setupCode) {
    // Email validation
    if (!email || !email.includes('@')) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return false;
    }

    // Password validation
    if (!password || password.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters long.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return false;
    }

    // Password match validation
    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Mismatch',
        text: 'Passwords do not match. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return false;
    }

    // Setup code validation (before Firebase calls)
    if (!setupCode || setupCode.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Setup Code',
        text: 'Please enter the setup code.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return false;
    }

    return true;
  }

  verifySetupCode(code) {
    /**
     * SETUP CODE: Change this to your own secure code
     * This should be shared with you via secure channels
     * For production, consider using environment variables
     */
    const VALID_SETUP_CODE = 'STEVE_SETUP_2026';

    return code === VALID_SETUP_CODE;
  }
}

const adminSetupPage = new AdminSetupPage();
