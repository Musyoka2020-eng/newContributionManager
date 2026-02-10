/**
 * Organization Router
 * Handles routing for organization-specific pages
 * Routes: /organizations/[slug]/
 */

class OrganizationRouter {
  constructor() {
    this.orgManager = OrgManager.getInstance();
    this.organizationAdapter = OrganizationAdapter.getInstance();
    this.centralFirestore = null;
  }

  async initialize(centralFirestore) {
    this.centralFirestore = centralFirestore;
    await this.handleRouteChange();
  }

  async handleRouteChange() {
    try {
      const slug = this.extractOrgSlugFromURL();

      if (!slug) {
        window.location.href = '/pages/superadmin/login.html';
        return;
      }

      // Load organization from central Firestore
      await this.loadOrganization(slug);
    } catch (error) {
      console.error('Route change failed:', error);
      this.showError('Failed to load organization: ' + error.message);
    }
  }

  extractOrgSlugFromURL() {
    // Try to extract from pathname first: /organizations/[slug]/
    const path = window.location.pathname;
    const pathnameMatch = path.match(/\/organizations\/([^/]+)/);
    if (pathnameMatch && pathnameMatch[1]) {
      return pathnameMatch[1];
    }

    // Fallback to query parameter: ?slug=[slug]
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get('slug');
    if (slugParam) {
      return slugParam;
    }

    return null;
  }

  async loadOrganization(slug) {
    try {
      // Load org metadata from central Firestore
      const org = await this.orgManager.loadOrganization(slug);

      // Initialize organization adapter with org config
      // This will load organization's Firebase config and organization scripts
      await this.organizationAdapter.initializeOrganization(org, this.centralFirestore);
      
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
