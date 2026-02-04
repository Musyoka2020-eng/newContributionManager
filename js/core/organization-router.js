/**
 * Organization Router
 * Handles routing for organization-specific pages
 * Routes: /organizations/[slug]/
 */

class OrganizationRouter {
  constructor() {
    this.orgManager = OrgManager.getInstance();
    this.organizationAdapter = OrganizationAdapter.getInstance();
    this.centralDatabase = null;
  }

  async initialize(centralDatabase) {
    this.centralDatabase = centralDatabase;
    await this.handleRouteChange();
  }

  async handleRouteChange() {
    try {
      const slug = this.extractOrgSlugFromURL();

      if (!slug) {
        console.warn('No organization slug in URL');
        window.location.href = '/superadmin/login.html';
        return;
      }

      // Load organization from central database
      await this.loadOrganization(slug);
    } catch (error) {
      console.error('Route change failed:', error);
      this.showError('Failed to load organization: ' + error.message);
    }
  }

  extractOrgSlugFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/organizations\/([^/]+)/);
    return match ? match[1] : null;
  }

  async loadOrganization(slug) {
    try {
      console.log(`Loading organization: ${slug}`);

      // Load org metadata from central database
      const org = await this.orgManager.loadOrganization(slug);

      // Initialize organization adapter with org config
      // This will load organization's Firebase config and organization scripts
      await this.organizationAdapter.initializeOrganization(org, this.centralDatabase);

      console.log(`Organization loaded and initialized: ${slug}`);
      
      // Fire event for pages to know org is ready
      document.dispatchEvent(new CustomEvent('org:ready', { detail: { org, slug } }));
    } catch (error) {
      console.error(`Failed to load organization: ${slug}`, error);
      throw error;
    }
  }

  showError(message) {
    const errorDiv = document.querySelector('[data-error]');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  static getInstance() {
    if (!OrganizationRouter.instance) {
      OrganizationRouter.instance = new OrganizationRouter();
    }
    return OrganizationRouter.instance;
  }
}

const organizationRouter = OrganizationRouter.getInstance();
