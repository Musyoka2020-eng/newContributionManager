/**
 * Super Admin Service
 * Handles organization creation and management
 */

class SuperAdminService {
  constructor() {
    this.centralDatabase = null;
    this.centralAuth = null;
  }

  async initialize(centralDatabase, centralAuth) {
    this.centralDatabase = centralDatabase;
    this.centralAuth = centralAuth;
  }

  async createOrganization(orgName, firebaseConfig, adminEmail, adminPassword) {
    try {
      if (!firebaseConfig || !firebaseConfig.projectId) {
        throw new Error('Valid Firebase config required for organization');
      }

      const slug = this.generateSlug(orgName);
      const orgId = this.generateId();

      // Check if slug exists
      const existingOrg = await this.centralDatabase
        .ref(`organizations/${slug}`)
        .once('value');

      if (existingOrg.exists()) {
        throw new Error(`Organization slug already exists: ${slug}`);
      }

      // Initialize organization's own Firebase to create admin user there
      const orgAppName = `init_${slug}_${Date.now()}`;
      const orgFirebaseApp = firebase.initializeApp(firebaseConfig, orgAppName);
      const orgAuth = firebase.auth(orgFirebaseApp);
      const orgDatabase = firebase.database(orgFirebaseApp);

      // Create admin user in organization's Firebase
      const adminUser = await orgAuth.createUserWithEmailAndPassword(adminEmail, adminPassword);
      const adminUid = adminUser.user.uid;

      // Add admin to users in organization's database
      await orgDatabase.ref(`users/${adminUid}`).set({
        email: adminEmail,
        role: 'admin',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      // Create organization metadata in central DB (NO members list)
      const orgData = {
        id: orgId,
        name: orgName,
        slug: slug,
        firebaseConfig: firebaseConfig,
        status: 'active',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };

      await this.centralDatabase.ref(`organizations/${slug}`).set(orgData);

      // Clean up temporary Firebase instance
      await firebase.app(orgAppName).delete();

      console.log(`Organization created: ${slug}`);

      return {
        ...orgData,
        adminUser: {
          uid: adminUid,
          email: adminEmail
        }
      };
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }

  async initializeOrgDatabase(firebaseConfig, orgName) {
    try {
      const instanceName = `init_${Date.now()}`;
      const orgApp = firebase.initializeApp(firebaseConfig, instanceName);
      const database = firebase.database(orgApp);

      const initialData = {
        contributions: {},
        blacklist: { blacklistedMembers: [] },
        budgets: { expenses: {} },
        specialGiving: {},
        config: {
          organizationName: orgName,
          fiscalYearStart: 'January',
          currency: 'KSH',
          createdAt: firebase.database.ServerValue.TIMESTAMP
        }
      };

      await database.ref('/').set(initialData);
      await firebase.app(instanceName).delete();

      console.log('Organization database initialized');
    } catch (error) {
      console.error('Failed to initialize organization database:', error);
      throw error;
    }
  }

  async getAllOrganizations() {
    try {
      const snapshot = await this.centralDatabase
        .ref('organizations')
        .once('value');

      const organizations = [];
      snapshot.forEach((childSnapshot) => {
        organizations.push({
          slug: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return organizations;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      throw error;
    }
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  generateId() {
    return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance() {
    if (!SuperAdminService.instance) {
      SuperAdminService.instance = new SuperAdminService();
    }
    return SuperAdminService.instance;
  }
}

const superAdminService = SuperAdminService.getInstance();
