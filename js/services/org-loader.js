/**
 * Organization Loader Service
 * Handles loading organizations and initializing Firebase instances
 */

class OrgLoader {
  constructor() {
    this.loadedInstances = {};
    this.orgManager = OrgManager.getInstance();
  }

  async loadOrganizationFromSlug(slug, centralDatabase) {
    try {
      const org = await this.orgManager.loadOrganization(slug);

      // All organizations have their own Firebase project
      await this.initializeOrganizationFirebase(org);

      return org;
    } catch (error) {
      console.error(`Failed to load organization: ${slug}`, error);
      throw error;
    }
  }

  async initializeOrganizationFirebase(org) {
    try {
      if (!org.firebaseConfig) {
        throw new Error(`No Firebase config found for organization: ${org.slug}`);
      }

      if (this.loadedInstances[org.slug]) {
        const instance = this.loadedInstances[org.slug];
        this.orgManager.setOrgFirebaseApp(instance.app);
        this.orgManager.setOrgDatabase(instance.database);
        return;
      }

      const instanceName = `org_${org.slug}`;
      let firebaseApp;

      try {
        firebaseApp = firebase.app(instanceName);
      } catch (error) {
        firebaseApp = firebase.initializeApp(org.firebaseConfig, instanceName);
      }

      const database = firebase.database(firebaseApp);

      this.loadedInstances[org.slug] = {
        app: firebaseApp,
        database: database,
        auth: firebase.auth(firebaseApp)
      };

      this.orgManager.setOrgFirebaseApp(firebaseApp);
      this.orgManager.setOrgDatabase(database);
    } catch (error) {
      console.error('Failed to initialize organization Firebase:', error);
      throw error;
    }
  }

  async disconnectFromOrg(slug) {
    try {
      if (this.loadedInstances[slug]) {
        try {
          await firebase.app(`org_${slug}`).delete();
          delete this.loadedInstances[slug];
        } catch (error) {
          // Silently ignore cleanup failures
        }
      }

      this.orgManager.clearCurrentOrg();
    } catch (error) {
      console.error(`Failed to disconnect from organization: ${slug}`, error);
      throw error;
    }
  }

  static getInstance() {
    if (!OrgLoader.instance) {
      OrgLoader.instance = new OrgLoader();
    }
    return OrgLoader.instance;
  }
}

const orgLoader = OrgLoader.getInstance();
