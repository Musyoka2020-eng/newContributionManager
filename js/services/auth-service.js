/**
 * Authentication Service
 * Handles multi-tenant authentication
 */

class AuthService {
  constructor() {
    this.centralAuth = null;
    this.centralDatabase = null;
    this.currentUser = null;
    this.currentUserRole = null;
    this.userOrganizations = [];
    this.orgManager = OrgManager.getInstance();
  }

  async initialize(centralAuth, centralDatabase) {
    this.centralAuth = centralAuth;
    this.centralDatabase = centralDatabase;

    this.centralAuth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.handleUserSignIn(user);
      } else {
        await this.handleUserSignOut();
      }
    });

    return true;
  }

  async handleUserSignIn(user) {
    try {
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };

      const userSnapshot = await this.centralDatabase
        .ref(`users/${user.uid}`)
        .once('value');

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        this.currentUserRole = userData.role || 'user';
      } else {
        await this.centralDatabase.ref(`users/${user.uid}`).set({
          email: user.email,
          role: 'user',
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        this.currentUserRole = 'user';
      }

      await this.orgManager.loadUserOrganizations(user.uid);
      this.userOrganizations = this.orgManager.userOrganizations;

      console.log('User sign in completed:', this.currentUser.email);
    } catch (error) {
      console.error('Failed to handle user sign in:', error);
      throw error;
    }
  }

  async handleUserSignOut() {
    this.currentUser = null;
    this.currentUserRole = null;
    this.userOrganizations = [];
    this.orgManager.clearCurrentOrg();
    console.log('User signed out');
  }

  async signUp(email, password) {
    try {
      const result = await this.centralAuth.createUserWithEmailAndPassword(
        email,
        password
      );

      const user = result.user;

      await this.centralDatabase.ref(`users/${user.uid}`).set({
        email: email,
        role: 'user',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      console.log(`User signed up: ${email}`);
      return { uid: user.uid, email: user.email };
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    try {
      const result = await this.centralAuth.signInWithEmailAndPassword(
        email,
        password
      );
      console.log(`User signed in: ${email}`);
      return result.user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await this.centralAuth.signOut();
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentUserRole() {
    return this.currentUserRole;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isSuperAdmin() {
    return this.currentUserRole === 'superadmin';
  }

  getUserOrganizations() {
    return this.userOrganizations;
  }

  canAccessOrg(orgSlug) {
    if (this.isSuperAdmin()) return true;
    return this.userOrganizations.some(org => org.slug === orgSlug);
  }

  hasRoleInOrg(orgSlug, requiredRole) {
    if (this.isSuperAdmin()) return true;

    const org = this.userOrganizations.find(o => o.slug === orgSlug);
    if (!org) return false;

    const members = org.members || {};
    const userRole = members[this.currentUser.uid];
    if (!userRole) return false;

    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
}

const authService = AuthService.getInstance();
