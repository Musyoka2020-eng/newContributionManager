/**
 * Not Found Component
 * 
 * 404 error page component
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { BaseComponent } from './base-component.js';

export class NotFoundComponent extends BaseComponent {
  constructor(eventBus, props = {}) {
    super(eventBus, props);
    this.name = 'not-found-component';
    this.cssPath = 'src/styles/components/not-found.css';
  }

  /**
   * Initialize component
   */
  async init() {
    await super.init();
    
    // Load component-specific CSS
    try {
      await this.loadCSS(this.cssPath);
    } catch (error) {
      console.warn(`Failed to load CSS for ${this.name}:`, error);
    }
  }

  /**
   * Cleanup component
   */
  destroy() {
    // Unload component-specific CSS
    this.unloadCSS(this.cssPath);
    super.destroy();
  }

  /**
   * Get component template
   * 
   * @returns {string} HTML template
   */
  getTemplate() {
    return `
      <div class="not-found-container">
        <div class="not-found-content">
          <div class="not-found-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="120" height="120">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 class="not-found-title">404 - Page Not Found</h1>
          <p class="not-found-message">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div class="not-found-actions">
            <button class="btn btn-primary" data-action="goHome">
              Go Home
            </button>
            <button class="btn btn-secondary" data-action="goBack">
              Go Back
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Component methods
   */
  getMethods() {
    return {
      goHome: () => {
        this.eventBus.emit('router:navigate', '/');
      },

      goBack: () => {
        window.history.back();
      }
    };
  }

  /**
   * Component lifecycle methods
   */
  getLifecycle() {
    return {
      onMount: () => {
        this.logger?.debug('Not found component mounted');
      },

      onUnmount: () => {
        this.logger?.debug('Not found component unmounted');
      }
    };
  }
}
