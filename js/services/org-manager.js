/**
 * Organization Manager Service
 * Manages current organization context and multi-tenant operations
 */

class OrgManager {
  constructor() {
    this.currentOrg = null;
    this.userOrganizations = [];
    this.centralDatabase = null;
    this.orgDatabase = null;
    this.orgFirebaseApp = null;
  }

  async initialize(centralDatabase) {
    this.centralDatabase = centralDatabase;
    return true;
  }

  async loadUserOrganizations(userId) {
    try {
      const snapshot = await this.centralDatabase
        .ref(`userOrganizations/${userId}`)
        .once('value');
      
      const orgSlugs = snapshot.val() || {};
      const organizations = [];

      for (const slug of Object.keys(orgSlugs)) {
        const orgSnapshot = await this.centralDatabase
          .ref(`organizations/${slug}`)
          .once('value');
        
        if (orgSnapshot.exists()) {
          organizations.push({
            slug: slug,
            ...orgSnapshot.val()
          });
        }
      }

      this.userOrganizations = organizations;
      return organizations;
    } catch (error) {
      console.error('Failed to load user organizations:', error);
      throw error;
    }
  }

  async loadOrganization(slug) {
    try {
      const snapshot = await this.centralDatabase
        .ref(`organizations/${slug}`)
        .once('value');
      
      if (!snapshot.exists()) {
        throw new Error(`Organization not found: ${slug}`);
      }

      this.currentOrg = {
        slug: slug,
        ...snapshot.val()
      };
      
      return this.currentOrg;
    } catch (error) {
      console.error(`Failed to load organization: ${slug}`, error);
      throw error;
    }
  }

  getCurrentOrg() {
    return this.currentOrg;
  }

  getOrgDatabase() {
    return this.orgDatabase;
  }

  setOrgDatabase(database) {
    this.orgDatabase = database;
  }

  setOrgFirebaseApp(firebaseApp) {
    this.orgFirebaseApp = firebaseApp;
  }

  getFirebaseConfig() {
    if (!this.currentOrg) return null;
    return this.currentOrg.firebaseConfig || null;
  }

  getOrgSlug() {
    if (!this.currentOrg) return null;
    return this.currentOrg.slug;
  }

  async addMember(userId, email, role = 'viewer') {
    try {
      if (!this.currentOrg) throw new Error('No organization loaded');

      await this.centralDatabase
        .ref(`organizations/${this.currentOrg.slug}/members/${userId}`)
        .set({
          email: email,
          role: role,
          addedAt: firebase.database.ServerValue.TIMESTAMP
        });

      await this.centralDatabase
        .ref(`userOrganizations/${userId}/${this.currentOrg.slug}`)
        .set(true);

      return true;
    } catch (error) {
      console.error('Failed to add member:', error);
      throw error;
    }
  }

  async updateMemberRole(userId, newRole) {
    try {
      if (!this.currentOrg) throw new Error('No organization loaded');

      await this.centralDatabase
        .ref(`organizations/${this.currentOrg.slug}/members/${userId}/role`)
        .set(newRole);

      return true;
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  async removeMember(userId) {
    try {
      if (!this.currentOrg) throw new Error('No organization loaded');

      await this.centralDatabase
        .ref(`organizations/${this.currentOrg.slug}/members/${userId}`)
        .remove();

      await this.centralDatabase
        .ref(`userOrganizations/${userId}/${this.currentOrg.slug}`)
        .remove();

      return true;
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  }

  clearCurrentOrg() {
    this.currentOrg = null;
    this.orgDatabase = null;
    this.orgFirebaseApp = null;
  }

  static getInstance() {
    if (!OrgManager.instance) {
      OrgManager.instance = new OrgManager();
    }
    return OrgManager.instance;
  }
}

const orgManager = OrgManager.getInstance();
