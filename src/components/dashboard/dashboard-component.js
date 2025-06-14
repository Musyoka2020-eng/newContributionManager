/**
 * Dashboard Component
 * 
 * Main dashboard view for authenticated users
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { BaseComponent } from '../base-component.js';

export class DashboardComponent extends BaseComponent {
    constructor(eventBus, props = {}) {
        super(eventBus, props);
        this.name = 'dashboard-component';
        this.cssPath = 'src/styles/components/dashboard.css';
    }

    /**
     * Initialize the component
     */
    async init() {
        await super.init();
        
        // Load component-specific CSS
        try {
            await this.loadCSS(this.cssPath);
        } catch (error) {
            console.warn(`Failed to load CSS for ${this.name}:`, error);
        }
        
        this.logger.debug('Initializing dashboard component');
        this.attachEventListeners();
        this.logger.debug('Dashboard component initialized');
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Unload component-specific CSS
        this.unloadCSS(this.cssPath);
        super.destroy();    }

    /**
     * Get the component template
     */
    getTemplate() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Dashboard</h1>
                    <p>Welcome to your Universal Contribution Manager dashboard</p>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Total Contributions</h3>
                        <div class="stat-value">$0.00</div>
                        <div class="stat-change">No contributions yet</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h3>Active Members</h3>
                        <div class="stat-value">0</div>
                        <div class="stat-change">No members yet</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h3>Organizations</h3>
                        <div class="stat-value">0</div>
                        <div class="stat-change">No organizations yet</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h3>Recent Activity</h3>
                        <div class="activity-list">
                            <p>No recent activity</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-actions">
                    <button class="btn btn-primary" id="create-contribution">
                        Create Contribution
                    </button>
                    <button class="btn btn-secondary" id="manage-members">
                        Manage Members
                    </button>
                    <button class="btn btn-secondary" id="view-reports">
                        View Reports
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render the dashboard (legacy method, kept for compatibility)
     */
    render() {
        this.container.innerHTML = this.getTemplate();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const createContributionBtn = this.container.querySelector('#create-contribution');
        const manageMembersBtn = this.container.querySelector('#manage-members');
        const viewReportsBtn = this.container.querySelector('#view-reports');

        if (createContributionBtn) {
            createContributionBtn.addEventListener('click', () => {
                this.eventBus.emit('navigate', '/contributions/create');
            });
        }

        if (manageMembersBtn) {
            manageMembersBtn.addEventListener('click', () => {
                this.eventBus.emit('navigate', '/members');
            });
        }

        if (viewReportsBtn) {
            viewReportsBtn.addEventListener('click', () => {
                this.eventBus.emit('navigate', '/reports');
            });
        }
    }

    /**
     * Get component methods for event binding
     */
    getMethods() {
        return {
            createContribution: () => {
                this.eventBus.emit('navigate', '/contributions/create');
            },
            manageMembers: () => {
                this.eventBus.emit('navigate', '/members');
            },
            viewReports: () => {
                this.eventBus.emit('navigate', '/reports');
            }
        };
    }

    /**
     * Clean up the component
     */
    destroy() {
        this.logger.debug('Destroying dashboard component');
        super.destroy();
    }
}
