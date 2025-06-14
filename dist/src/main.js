/**
 * Main Application Entry Point
 * 
 * This is the main entry point for the Universal Contribution Manager.
 * It initializes all core services, sets up the application state,
 * and manages the overall application lifecycle.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

// Import core dependencies
import { firebaseConfig, environment, validateFirebaseConfig, initializeFirebase } from './config/firebase.js';
import { Logger } from './utils/logger.js';
import { EventBus } from './core/event-bus.js';
import { AuthService } from './services/auth-service.js';
import { Router } from './core/router.js';
import { ComponentManager } from './core/component-manager.js';
import { ErrorHandler } from './utils/error-handler.js';

/**
 * Main Application Class
 * 
 * Manages the entire application lifecycle, coordinates between services,
 * and provides a centralized point for application state management.
 */
class UniversalContributionManager {
  /**
   * Initialize the application
   */
  constructor() {
    this.logger = new Logger('UniversalContributionManager');
    this.eventBus = new EventBus();
    this.errorHandler = new ErrorHandler();
    this.authService = null;
    this.router = null;
    this.componentManager = null;
    this.isInitialized = false;
    this.startTime = Date.now();
    
    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    
    this.logger.info('Application instance created', {
      version: environment.version,
      buildDate: environment.buildDate,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Initialize the application
   * 
   * This method sets up all core services and initializes the application.
   * It follows a specific order to ensure dependencies are properly loaded.
   * 
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.logger.info('🚀 Initializing Universal Contribution Manager...');
      
      // Step 1: Validate configuration
      await this.validateConfiguration();
      
      // Step 2: Setup global error handling
      this.setupGlobalErrorHandling();
      
      // Step 3: Initialize core services
      await this.initializeCoreServices();
        // Step 4: Initialize UI components
      await this.initializeUI();
      
      // Step 5: Initialize navigation
      await this.initializeNavigation();
      
      // Step 6: Setup routing
      await this.initializeRouting();
      
      // Step 6: Setup authentication monitoring
      this.setupAuthenticationMonitoring();
      
      // Step 7: Load initial state
      await this.loadInitialState();
      
      this.isInitialized = true;
      const initTime = Date.now() - this.startTime;
        this.logger.info('✅ Application initialized successfully', {
        initializationTime: `${initTime}ms`,
        timestamp: new Date().toISOString()
      });
      
      // Hide loading screen and show app
      this.hideLoadingScreen();
      
      // Emit application ready event
      this.eventBus.emit('app:ready', {
        version: environment.version,
        initializationTime: initTime
      });
      
    } catch (error) {
      this.handleError(error, 'Failed to initialize application');
      throw error;
    }
  }

  /**
   * Validate application configuration
   * 
   * @private
   * @returns {Promise<void>}
   */
  async validateConfiguration() {
    this.logger.debug('Validating configuration...');
    
    if (!validateFirebaseConfig()) {
      throw new Error('Invalid Firebase configuration. Please check your config settings.');
    }
    
    this.logger.debug('✅ Configuration validated');
  }

  /**
   * Setup global error handling
   * 
   * @private
   */
  setupGlobalErrorHandling() {
    this.logger.debug('Setting up global error handling...');
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.errorHandler.handleGlobalError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorHandler.handleGlobalError(event.reason, {
        type: 'unhandled_promise_rejection'
      });
    });
    
    this.logger.debug('✅ Global error handling setup complete');
  }
  /**
   * Initialize core services
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeCoreServices() {
    this.logger.debug('Initializing core services...');
    
    // Initialize Firebase first
    await this.initializeFirebase();
    
    // Initialize authentication service
    this.authService = new AuthService();
    await this.authService.init();
    
    this.logger.debug('✅ Core services initialized');
  }
  /**
   * Initialize Firebase
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeFirebase() {
    this.logger.debug('Initializing Firebase...');
    
    try {
      await initializeFirebase();
      this.logger.debug('✅ Firebase initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error);
      throw error;
    }
  }
  /**
   * Initialize UI components
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeUI() {
    this.logger.debug('Initializing UI components...');
    
    this.componentManager = new ComponentManager(this.eventBus, this.authService);
    await this.componentManager.init();
    
    this.logger.debug('✅ UI components initialized');
  }

  /**
   * Initialize routing system
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeRouting() {
    this.logger.debug('Initializing routing...');
    
    this.router = new Router(this.eventBus, this.authService);
    await this.router.init();
    
    this.logger.debug('✅ Routing initialized');
  }

  /**
   * Setup authentication state monitoring
   * 
   * @private
   */
  setupAuthenticationMonitoring() {
    this.logger.debug('Setting up authentication monitoring...');
    
    this.authService.onAuthStateChange(this.handleAuthStateChange);
    
    this.logger.debug('✅ Authentication monitoring setup complete');
  }

  /**
   * Load initial application state
   * 
   * @private
   * @returns {Promise<void>}
   */
  async loadInitialState() {
    this.logger.debug('Loading initial state...');
    
    // Load user preferences
    await this.loadUserPreferences();
    
    // Check authentication status
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.logger.info('User is authenticated', { userId: user.uid });
    } else {
      this.logger.info('No authenticated user found');
    }
    
    this.logger.debug('✅ Initial state loaded');
  }

  /**
   * Load user preferences from localStorage
   * 
   * @private
   * @returns {Promise<void>}
   */
  async loadUserPreferences() {
    try {
      const preferences = localStorage.getItem('ucm_preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        this.eventBus.emit('preferences:loaded', parsed);
        this.logger.debug('User preferences loaded', parsed);
      }
    } catch (error) {
      this.logger.warn('Failed to load user preferences', error);
    }
  }

  /**
   * Handle authentication state changes
   * 
   * @private
   * @param {Object|null} user - Firebase user object or null
   */
  handleAuthStateChange(user) {
    this.logger.debug('Authentication state changed', {
      authenticated: !!user,
      userId: user?.uid
    });
    
    this.eventBus.emit('auth:state-changed', user);
    
    if (user) {
      this.eventBus.emit('auth:user-signed-in', user);
    } else {
      this.eventBus.emit('auth:user-signed-out');
    }
  }

  /**
   * Handle application errors
   * 
   * @private
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   */
  handleError(error, context = 'Unknown') {
    this.logger.error(`Error in ${context}:`, error);
    this.errorHandler.handleError(error, { context });
  }

  /**
   * Get application health status
   * 
   * @returns {Object} Application health information
   */
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      uptime: Date.now() - this.startTime,
      version: environment.version,
      services: {
        auth: this.authService?.isInitialized || false,
        router: this.router?.isInitialized || false,
        components: this.componentManager?.isInitialized || false
      },
      timestamp: new Date().toISOString()    };
  }

  /**
   * Hide the loading screen and show the main application
   * 
   * @private
   */
  hideLoadingScreen() {
    try {
      const loadingScreen = document.getElementById('loading-screen');
      const appContainer = document.getElementById('app');
      
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
        this.logger.debug('Loading screen hidden');
      }
      
      if (appContainer) {
        appContainer.style.display = 'block';
        this.logger.debug('App container shown');
      }
    } catch (error) {
      this.logger.error('Error hiding loading screen:', error);
    }
  }

  /**
   * Safely shutdown the application
   * 
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down application...');
    
    try {
      // Clean up services
      if (this.authService) {
        await this.authService.cleanup();
      }
      
      if (this.router) {
        await this.router.cleanup();
      }
      
      if (this.componentManager) {
        await this.componentManager.cleanup();
      }
      
      // Clear event listeners
      this.eventBus.removeAllListeners();
      
      this.isInitialized = false;
      this.logger.info('✅ Application shutdown complete');
      
    } catch (error) {
      this.logger.error('Error during application shutdown:', error);
    }
  }
  /**
   * Initialize navigation component
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeNavigation() {
    this.logger.debug('Initializing navigation...');
    
    try {
      // Check if navigation container exists
      const navigationContainer = document.getElementById('navigation');
      if (!navigationContainer) {
        throw new Error('Navigation container not found');
      }
      
      // Load navigation component with correct parameter order
      await this.componentManager.loadComponent('navigation-component', {
        authService: this.authService,
        eventBus: this.eventBus,
        currentRoute: window.location.pathname
      }, 'navigation');
      
      this.logger.debug('✅ Navigation initialized');
    } catch (error) {
      this.logger.error('Failed to initialize navigation', error);
      throw error;
    }
  }
}

/**
 * Initialize and start the application
 * 
 * This function is called when the DOM is ready and creates a new instance
 * of the UniversalContributionManager and initializes it.
 */
async function startApplication() {
  try {
    // Create application instance
    const app = new UniversalContributionManager();
    
    // Make app globally available for debugging
    if (environment.development) {
      window.UCM = app;
      console.log('🔧 Development mode: UCM app instance available globally');
    }
    
    // Initialize application
    await app.init();
    
    // Setup beforeunload handler for cleanup
    window.addEventListener('beforeunload', () => {
      app.shutdown();
    });
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    
    // Show user-friendly error message
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 16px;">
            ⚠️ Application Failed to Start
          </h1>
          <p style="color: #374151; margin-bottom: 24px;">
            We're sorry, but the application encountered an error during startup.
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
            "
          >
            Reload Application
          </button>
          ${environment.development ? `
            <div style="
              margin-top: 24px;
              padding: 16px;
              background: #fee2e2;
              border-radius: 6px;
              text-align: left;
              font-family: monospace;
              font-size: 14px;
              color: #991b1b;
            ">
              <strong>Development Error:</strong><br>
              ${error.message}<br>
              ${error.stack}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication);
} else {
  startApplication();
}

export default UniversalContributionManager;
