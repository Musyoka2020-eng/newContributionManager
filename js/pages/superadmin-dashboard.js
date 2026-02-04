/**
 * Super Admin Dashboard Page
 */

class SuperAdminDashboard {
  constructor() {
    this.auth = null;
    this.database = null;
    this.router = null;
    this.superAdminService = SuperAdminService.getInstance();
    this.organizations = [];
  }

  async init(auth, database, router) {
    this.auth = auth;
    this.database = database;
    this.router = router;

    await this.superAdminService.initialize(database, auth);
    this.setupEventListeners();
    await this.loadOrganizations();
  }

  setupEventListeners() {
    // Create organization form
    const form = document.querySelector('#createOrgForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateOrg(e));
    }

    // Logout button
    const logoutBtn = document.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  async handleCreateOrg(e) {
    e.preventDefault();

    const orgName = document.querySelector('#orgName').value;
    const adminEmail = document.querySelector('#adminEmail').value;
    const adminPassword = document.querySelector('#adminPassword').value;
    const firebaseConfigStr = document.querySelector('#firebaseConfig').value;

    try {
      this.clearMessages();

      // Parse Firebase config
      let firebaseConfig;
      try {
        firebaseConfig = JSON.parse(firebaseConfigStr);
      } catch (parseError) {
        throw new Error('Invalid Firebase config JSON: ' + parseError.message);
      }

      if (!firebaseConfig.projectId) {
        throw new Error('Firebase config must include projectId');
      }

      this.showLoading(true);

      // Create organization
      const org = await this.superAdminService.createOrganization(
        orgName,
        firebaseConfig,
        adminEmail,
        adminPassword
      );

      this.showSuccess(`Organization "${org.name}" created successfully!`);
      document.querySelector('#createOrgForm').reset();
      await this.loadOrganizations();
    } catch (error) {
      console.error('Create organization error:', error);
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async loadOrganizations() {
    try {
      document.querySelector('[data-section="orgs-loading"]').classList.add('show');
      document.querySelector('[data-section="orgs-list"]').innerHTML = '';

      this.organizations = await this.superAdminService.getAllOrganizations();

      if (this.organizations.length === 0) {
        document.querySelector('[data-section="orgs-list"]').innerHTML = `
          <p class="text-center text-muted" style="padding: 40px;">No organizations yet</p>
        `;
      } else {
        this.renderOrganizations();
      }
    } catch (error) {
      console.error('Load organizations error:', error);
      this.showError('Failed to load organizations: ' + error.message);
    } finally {
      document.querySelector('[data-section="orgs-loading"]').classList.remove('show');
    }
  }

  renderOrganizations() {
    const container = document.querySelector('[data-section="orgs-list"]');
    
    container.innerHTML = this.organizations.map(org => `
      <div class="org-card">
        <h3>${org.name}</h3>
        <p><strong>Slug:</strong> ${org.slug}</p>
        <p><strong>Status:</strong> <span class="badge ${org.status === 'active' ? 'badge-success' : 'badge-warning'}">${org.status}</span></p>
        <p><strong>URL:</strong> <code>/organizations/${org.slug}/</code></p>
        <div class="org-actions">
          <button class="btn-secondary btn-sm" onclick="superAdminDashboard.copyUrl('${org.slug}')">Copy URL</button>
          <button class="btn-danger btn-sm" onclick="superAdminDashboard.deleteOrg('${org.slug}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  copyUrl(slug) {
    const url = `${window.location.origin}/organizations/${slug}/`;
    navigator.clipboard.writeText(url).then(() => {
      this.showSuccess('Organization URL copied!');
    }).catch(err => {
      this.showError('Failed to copy URL');
    });
  }

  async deleteOrg(slug) {
    if (!confirm(`Are you sure you want to delete "${slug}"?`)) {
      return;
    }

    try {
      await this.superAdminService.updateOrgStatus(slug, 'deleted');
      this.showSuccess(`Organization "${slug}" deleted`);
      await this.loadOrganizations();
    } catch (error) {
      console.error('Delete organization error:', error);
      this.showError('Failed to delete organization: ' + error.message);
    }
  }

  async handleLogout() {
    try {
      await this.router.logout();
    } catch (error) {
      this.showError('Logout failed: ' + error.message);
    }
  }

  clearMessages() {
    document.querySelector('[data-error]').classList.remove('show');
    document.querySelector('[data-success]').classList.remove('show');
  }

  showError(message) {
    const errorDiv = document.querySelector('[data-error]');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  showSuccess(message) {
    const successDiv = document.querySelector('[data-success]');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.classList.add('show');
    }
  }

  showLoading(show) {
    const form = document.querySelector('#createOrgForm');
    const button = form?.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = show;
      button.textContent = show ? 'Creating...' : 'Create Organization';
    }
  }
}

const superAdminDashboard = new SuperAdminDashboard();
