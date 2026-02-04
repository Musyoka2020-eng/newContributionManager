/**
 * Super Admin Login Page
 */

class SuperAdminLoginPage {
  constructor() {
    this.auth = null;
    this.database = null;
    this.router = null;
  }

  init(auth, database, router) {
    this.auth = auth;
    this.database = database;
    this.router = router;

    this.setupEventListeners();
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
      this.showLoading(true);
      await this.router.login(email, password);
      this.showSuccess('Login successful! Redirecting...');
    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  showError(message) {
    const errorDiv = document.querySelector('[data-error]');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  showSuccess(message) {
    const successDiv = document.querySelector('[data-success]');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.classList.add('show');
    }
  }

  showLoading(show) {
    const form = document.querySelector('#loginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = show;
      button.textContent = show ? 'Logging in...' : 'Login';
    }
  }
}

const superAdminLoginPage = new SuperAdminLoginPage();
