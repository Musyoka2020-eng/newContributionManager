/**
 * Home Component
 * 
 * Landing page component for the Universal Contribution Manager
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { BaseComponent } from '../base-component.js';

export class HomeComponent extends BaseComponent {
  constructor(eventBus, props = {}) {
    super(eventBus, props);
    this.name = 'home-component';
    this.cssPath = 'src/styles/components/home.css';
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
   */  getTemplate() {
    return `
      <div class="home-container">
        <div class="hero-section">
          <div class="hero-content">
            <h1 class="hero-title">Universal Contribution Manager</h1>
            <p class="hero-subtitle">
              A modern, secure, and scalable contribution management system for organizations
            </p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-action="navigateToLogin">
                Get Started
              </button>
              <button class="btn btn-secondary" data-action="learnMore">
                Learn More
              </button>
            </div>
          </div>
        </div>

        <div class="features-section">
          <div class="container">
            <h2 class="section-title">Key Features</h2>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">🏢</div>
                <h3>Multi-Organization</h3>
                <p>Manage multiple organizations and their contributions in one place</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Advanced Analytics</h3>
                <p>Comprehensive reporting and analytics for contribution tracking</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h3>Secure & Reliable</h3>
                <p>Enterprise-grade security with Firebase authentication</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📱</div>
                <h3>Mobile Friendly</h3>
                <p>Responsive design that works on all devices</p>
              </div>
            </div>
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
      navigateToLogin: () => {
        this.eventBus.emit('router:navigate', '/login');
      },

      learnMore: () => {
        // Scroll to features section
        const featuresSection = document.querySelector('.features-section');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
  }

  /**
   * Component lifecycle methods
   */
  getLifecycle() {
    return {
      onMount: () => {
        this.logger?.debug('Home component mounted');
      },

      onUnmount: () => {
        this.logger?.debug('Home component unmounted');
      }
    };
  }
}
