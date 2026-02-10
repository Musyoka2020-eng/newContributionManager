/**
 * Organization Manager Service
 * Manages current organization context and multi-tenant operations
 * Uses Firestore for central database
 */

class OrgManager {
  constructor() {
    this.currentOrg = null;
    this.userOrganizations = [];
    this.centralFirestore = null;
    this.orgDatabase = null;
    this.orgFirebaseApp = null;
  }

  async initialize(centralFirestore) {
    this.centralFirestore = centralFirestore;
    return true;
  }

  async loadUserOrganizations(userId) {
    try {
      // Get user organizations from Firestore
      const userOrgRef = this.centralFirestore.collection('userOrganizations').doc(userId);
      const userOrgDoc = await userOrgRef.get();
      
      const orgSlugs = userOrgDoc.exists ? (userOrgDoc.data()?.organizations || []) : [];
      const organizations = [];

      for (const slug of orgSlugs) {
        const orgDoc = await this.centralFirestore.collection('organizations').doc(slug).get();
        
        if (orgDoc.exists) {
          organizations.push({
            slug: orgDoc.id,
            ...orgDoc.data()
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
      const orgDoc = await this.centralFirestore.collection('organizations').doc(slug).get();
      
      if (!orgDoc.exists) {
        throw new Error(`Organization not found: ${slug}`);
      }

      this.currentOrg = {
        slug: orgDoc.id,
        ...orgDoc.data()
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

      const organizationRef = this.centralFirestore.collection('organizations').doc(this.currentOrg.slug);
      
      // Add member to organization
      await organizationRef.collection('members').doc(userId).set({
        email: email,
        role: role,
        addedAt: new Date().toISOString()
      });

      // Add organization to user's organization list
      const userOrgRef = this.centralFirestore.collection('userOrganizations').doc(userId);
      await userOrgRef.update({
        organizations: firebase.firestore.FieldValue.arrayUnion(this.currentOrg.slug)
      }).catch(async () => {
        // If document doesn't exist, create it
        await userOrgRef.set({
          organizations: [this.currentOrg.slug]
        });
      });

      return true;
    } catch (error) {
      console.error('Failed to add member:', error);
      throw error;
    }
  }

  async updateMemberRole(userId, newRole) {
    try {
      if (!this.currentOrg) throw new Error('No organization loaded');

      await this.centralFirestore
        .collection('organizations')
        .doc(this.currentOrg.slug)
        .collection('members')
        .doc(userId)
        .update({ role: newRole });

      return true;
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  async removeMember(userId) {
    try {
      if (!this.currentOrg) throw new Error('No organization loaded');

      // Remove member from organization
      await this.centralFirestore
        .collection('organizations')
        .doc(this.currentOrg.slug)
        .collection('members')
        .doc(userId)
        .delete();

      // Remove organization from user's organization list
      await this.centralFirestore
        .collection('userOrganizations')
        .doc(userId)
        .update({
          organizations: firebase.firestore.FieldValue.arrayRemove(this.currentOrg.slug)
        });

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
