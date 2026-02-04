/**
 * Organization Adapter
 * Bridges organization contribution-manager code with multi-tenant system
 * Dynamically loads organization Firebase config and initializes organization code
 */

class OrganizationAdapter {
  constructor() {
    this.currentOrgFirebaseApp = null;
    this.currentOrgDatabase = null;
    this.currentOrgAuth = null;
    this.orgScriptsLoaded = false;
  }

  /**
   * Initialize organization code with organization config
   * @param {Object} org - Organization object from central DB
   * @param {Object} centralDatabase - Central database reference
   */
  async initializeOrganization(org, centralDatabase) {
    try {
      console.log('Initializing organization adapter for org:', org.slug);

      if (!org.firebaseConfig) {
        throw new Error('No Firebase config found for organization');
      }

      // Store references
      const firebaseConfig = org.firebaseConfig;

      // Initialize separate Firebase app for this organization
      const instanceName = `org_${org.slug}`;
      let firebaseApp;

      try {
        firebaseApp = firebase.app(instanceName);
      } catch (error) {
        firebaseApp = firebase.initializeApp(firebaseConfig, instanceName);
      }

      const database = firebase.database(firebaseApp);
      const auth = firebase.auth(firebaseApp);

      this.currentOrgFirebaseApp = firebaseApp;
      this.currentOrgDatabase = database;
      this.currentOrgAuth = auth;

      // Inject Firebase config globally BEFORE loading org-app scripts
      // This allows org-app's firebase-manager.js to use the injected config
      this.injectFirebaseConfig(firebaseConfig, org);

      // Load organization scripts if not already loaded
      if (!this.orgScriptsLoaded) {
        await this.loadOrganizationScripts();
      }

      // Initialize organization code with Firebase references
      this.initializeOrganizationCode(database, auth, org);

      console.log('Organization adapter initialized successfully');
      return {
        database: database,
        auth: auth
      };
    } catch (error) {
      console.error('Failed to initialize organization adapter:', error);
      throw error;
    }
  }

  /**
   * Inject Firebase config globally before org-app scripts load
   * This allows org-app's firebase-manager.js to use organization-specific credentials
   */
  injectFirebaseConfig(firebaseConfig, org) {
    try {
      // Store organization's Firebase config
      window.orgFirebaseConfig = firebaseConfig;
      window.orgSlug = org.slug;
      window.orgName = org.name;

      console.log('Injected Firebase config for organization:', org.slug);
    } catch (error) {
      console.error('Failed to inject Firebase config:', error);
      throw error;
    }
  }

  /**
   * Load organization scripts from /org-app folder
   */
  async loadOrganizationScripts() {
    try {
      console.log('Loading organization scripts...');

      const scripts = [
        '/org-app/js/utils.js',
        '/org-app/js/firebase-manager.js',
        '/org-app/js/auth.js',
        '/org-app/js/dom-manager.js',
        '/org-app/js/ui-renderer.js',
        '/org-app/js/modal-manager.js',
        '/org-app/js/event-handlers.js',
        '/org-app/js/contributions.js',
        '/org-app/js/budget.js',
        '/org-app/js/reports.js',
        '/org-app/js/special-giving-manager.js',
        '/org-app/js/campaign-export-manager.js',
        '/org-app/js/expected-members.js',
        '/org-app/js/admin-dashboard.js',
        '/org-app/js/app.js'
      ];

      for (const scriptPath of scripts) {
        await this.loadScript(scriptPath);
      }

      this.orgScriptsLoaded = true;
      console.log('All organization scripts loaded');
    } catch (error) {
      console.error('Failed to load organization scripts:', error);
      throw error;
    }
  }

  /**
   * Load a single script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize organization code with Firebase references
   * Makes Firebase available to organization code
   */
  initializeOrganizationCode(database, auth, org) {
    try {
      // Store org info in window for organization code
      window.currentOrganization = {
        slug: org.slug,
        name: org.name
      };

      // Store Firebase references in window for organization code
      window.orgDatabase = database;
      window.orgAuth = auth;

      // If organization code has an initialization function, call it
      if (typeof initOrgApp === 'function') {
        initOrgApp(database, auth);
      }

      console.log('Organization code initialized with Firebase references');
    } catch (error) {
      console.error('Failed to initialize organization code:', error);
      throw error;
    }
  }

  /**
   * Disconnect from current organization
   */
  async disconnect() {
    try {
      if (this.currentOrgFirebaseApp) {
        await this.currentOrgFirebaseApp.delete();
        this.currentOrgFirebaseApp = null;
      }

      this.currentOrgDatabase = null;
      this.currentOrgAuth = null;
      window.currentOrganization = null;

      console.log('Organization adapter disconnected');
    } catch (error) {
      console.error('Failed to disconnect organization adapter:', error);
      throw error;
    }
  }

  /**
   * Get organization database reference
   */
  getDatabase() {
    return this.currentOrgDatabase;
  }

  /**
   * Get organization auth reference
   */
  getAuth() {
    return this.currentOrgAuth;
  }

  static getInstance() {
    if (!OrganizationAdapter.instance) {
      OrganizationAdapter.instance = new OrganizationAdapter();
    }
    return OrganizationAdapter.instance;
  }
}

const organizationAdapter = OrganizationAdapter.getInstance();
