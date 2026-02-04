/**
 * Landing Page Script
 * Handles authentication state and navigation
 */

class LandingPage {
  constructor() {
    this.firebaseAuth = null;
    this.firebaseDatabase = null;
  }

  init(auth, database) {
    this.firebaseAuth = auth;
    this.firebaseDatabase = database;

    this.setupAuthListener();
    this.setupEventListeners();
  }

  setupAuthListener() {
    this.firebaseAuth.onAuthStateChanged((user) => {
      this.updateUI(user);
    });
  }

  setupEventListeners() {
    // Navigation buttons
    const loginBtn = document.querySelector('[data-action="login"]');
    const signupBtn = document.querySelector('[data-action="signup"]');
    const orgsBtn = document.querySelector('[data-action="orgs"]');
    const logoutBtn = document.querySelector('[data-action="logout"]');
    const adminBtn = document.querySelector('[data-action="admin"]');

    if (loginBtn) loginBtn.addEventListener('click', () => this.navigateTo('/pages/login.html'));
    if (signupBtn) signupBtn.addEventListener('click', () => this.navigateTo('/pages/signup.html'));
    if (orgsBtn) orgsBtn.addEventListener('click', () => this.navigateTo('/pages/organizations.html'));
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
    if (adminBtn) adminBtn.addEventListener('click', () => this.navigateTo('/pages/superadmin/dashboard.html'));
  }

  updateUI(user) {
    const loadingDiv = document.querySelector('[data-section="loading"]');
    const authDiv = document.querySelector('[data-section="auth"]');
    const authenticatedDiv = document.querySelector('[data-section="authenticated"]');
    const adminDiv = document.querySelector('[data-section="admin"]');

    if (loadingDiv) loadingDiv.style.display = 'none';

    if (user) {
      // User is logged in
      if (authDiv) authDiv.style.display = 'none';
      if (authenticatedDiv) authenticatedDiv.style.display = 'block';

      // Check if super admin
      this.firebaseDatabase.ref(`superadminUsers/${user.uid}`).once('value', (snapshot) => {
        if (adminDiv) {
          adminDiv.style.display = snapshot.exists() ? 'block' : 'none';
        }
      });
    } else {
      // User is not logged in
      if (authDiv) authDiv.style.display = 'block';
      if (authenticatedDiv) authenticatedDiv.style.display = 'none';
      if (adminDiv) adminDiv.style.display = 'none';
    }
  }

  async handleLogout() {
    try {
      await this.firebaseAuth.signOut();
      window.location.href = '/';
    } catch (error) {
      this.showError('Logout failed: ' + error.message);
    }
  }

  navigateTo(path) {
    window.location.href = path;
  }

  showError(message) {
    const errorDiv = document.querySelector('[data-error]');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
      setTimeout(() => {
        errorDiv.classList.remove('show');
      }, 5000);
    }
  }
}

// Initialize on DOM ready
const landingPage = new LandingPage();
