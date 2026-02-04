/**
 * Super Admin Router
 * Handles routing for super admin pages
 * Validates super admin access and manages admin routes
 */

class SuperAdminRouter {
  constructor() {
    this.authService = AuthService.getInstance();
    this.superAdminService = SuperAdminService.getInstance();
    this.centralAuth = null;
    this.centralDatabase = null;
  }

  async initialize(centralAuth, centralDatabase) {
    this.centralAuth = centralAuth;
    this.centralDatabase = centralDatabase;

    // Check auth state
    this.centralAuth.onAuthStateChanged((user) => {
      this.handleAuthStateChange(user);
    });
  }

  async handleAuthStateChange(user) {
    try {
      const currentPath = window.location.pathname;

      if (!user) {
        // User not authenticated
        if (!currentPath.includes('/superadmin/login')) {
          window.location.href = '/superadmin/login.html';
        }
        return;
      }

      // User is authenticated, check if super admin
      const isSuperAdmin = await this.checkSuperAdminStatus(user.uid);

      if (!isSuperAdmin) {
        console.warn('User is not a super admin');
        await this.centralAuth.signOut();
        window.location.href = '/superadmin/login.html';
        return;
      }

      // User is super admin
      console.log('Super admin authenticated:', user.email);

      // Redirect from login to dashboard if on login page
      if (currentPath.includes('/superadmin/login')) {
        window.location.href = '/superadmin/dashboard.html';
      }

      // Fire event for pages to know admin is ready
      document.dispatchEvent(new CustomEvent('superadmin:ready', { detail: { user } }));
    } catch (error) {
      console.error('Auth state change handling failed:', error);
    }
  }

  async checkSuperAdminStatus(userId) {
    try {
      const snapshot = await this.centralDatabase
        .ref(`superadminUsers/${userId}`)
        .once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('Failed to check super admin status:', error);
      return false;
    }
  }

  async login(email, password) {
    try {
      console.log('Super admin login attempt:', email);

      const result = await this.centralAuth.signInWithEmailAndPassword(email, password);
      const user = result.user;

      // Check if super admin
      const isSuperAdmin = await this.checkSuperAdminStatus(user.uid);

      if (!isSuperAdmin) {
        await this.centralAuth.signOut();
        throw new Error('User is not a super admin');
      }

      console.log('Super admin logged in:', email);
      return user;
    } catch (error) {
      console.error('Super admin login failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.centralAuth.signOut();
      console.log('Super admin logged out');
      window.location.href = '/superadmin/login.html';
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  static getInstance() {
    if (!SuperAdminRouter.instance) {
      SuperAdminRouter.instance = new SuperAdminRouter();
    }
    return SuperAdminRouter.instance;
  }
}

const superAdminRouter = SuperAdminRouter.getInstance();
