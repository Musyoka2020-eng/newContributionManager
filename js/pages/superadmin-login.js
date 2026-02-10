/**
 * Super Admin Login Page
 */

class SuperAdminLoginPage {
  constructor() {
    this.auth = null;
    this.db = null;
    this.router = null;
  }

  async init(auth, db, router) {
    this.auth = auth;
    this.db = db;
    this.router = router;

    // Check if setup is needed
    await this.checkSetupRequired();

    this.setupEventListeners();
  }

  async checkSetupRequired() {
    try {
      const snapshot = await this.db.collection('superadminUsers').limit(1).get();
      console.log('Setup check - superadminUsers collection has documents:', !snapshot.empty);
      
      if (snapshot.empty) {
        // No super admins exist, setup is required
        console.log('Redirecting to setup page - no admins found');
        this.redirectToSetup('No admin accounts exist yet');
        return; // Exit early
      }
    } catch (error) {
      console.error('Failed to check setup requirement:', error);
      
      // If permission error, likely no admins exist and setup is needed
      if (error.code === 'permission-denied') {
        console.warn('Permission denied - likely no admins exist. Redirecting to setup...');
        this.redirectToSetup('Permission denied - setup may be required');
        return;
      }
      
      // For other errors, allow login to proceed
      console.warn('Other error occurred - allowing login to proceed');
    }
  }

  redirectToSetup(reason) {
    console.log('Redirecting to setup:', reason);
    Swal.fire({
      icon: 'info',
      title: 'Initial Setup Required',
      text: 'No admin account exists yet. Redirecting to setup page...',
      timer: 2000,
      showConfirmButton: false,
      willClose: () => {
        window.location.href = '/pages/superadmin/setup.html';
      }
    });
  }

  setupEventListeners() {
    const form = document.querySelector('#loginForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;

    try {
      if (!email || !password) {
        Swal.fire({
          icon: 'warning',
          title: 'Required Fields',
          text: 'Please enter both email and password.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        return;
      }

      const button = document.querySelector('#loginForm button[type="submit"]');
      button.disabled = true;

      Swal.fire({
        title: 'Logging in...',
        didOpen: () => { Swal.showLoading(); },
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
      });

      await this.router.login(email, password);

      Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: 'Redirecting to dashboard...',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Check your email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: errorMessage,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });

      const button = document.querySelector('#loginForm button[type="submit"]');
      if (button) button.disabled = false;
    }
  }
}

const superAdminLoginPage = new SuperAdminLoginPage();
