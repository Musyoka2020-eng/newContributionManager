/**
 * Router System
 * 
 * Handles client-side routing for the Universal Contribution Manager.
 * Manages navigation, route protection, and URL state management.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { Logger } from '../utils/logger.js';
import { ErrorHandler, ErrorType } from '../utils/error-handler.js';

/**
 * Router class for client-side navigation
 * 
 * Manages application routes, navigation, and URL state without full page reloads.
 * Integrates with authentication service for protected routes.
 */
export class Router {
  /**
   * Initialize the router
   * 
   * @param {EventBus} eventBus - Application event bus
   * @param {AuthService} authService - Authentication service
   */  constructor(eventBus, authService) {
    this.logger = new Logger('Router');
    this.errorHandler = new ErrorHandler();
    this.eventBus = eventBus;
    this.authService = authService;
    this.routes = new Map();
    this.currentRoute = null;
    this.isInitialized = false;
    this.beforeNavigationCallbacks = [];
    this.afterNavigationCallbacks = [];
    
    // Navigation state tracking
    this.isNavigating = false;
    this.targetPath = null;
    
    // Bind methods
    this.handlePopState = this.handlePopState.bind(this);
    this.handleLinkClick = this.handleLinkClick.bind(this);
    
    this.logger.debug('Router instance created');
  }

  /**
   * Initialize the router
   * 
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.logger.info('Initializing router...');
      
      // Define application routes
      this.defineRoutes();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Handle initial route
      await this.handleInitialRoute();
      
      this.isInitialized = true;
      this.logger.info('✅ Router initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize router', error);
      this.errorHandler.handleError(error, {
        type: ErrorType.SYSTEM,
        context: 'Router initialization'
      });
      throw error;
    }
  }

  /**
   * Define application routes
   * 
   * @private
   */
  defineRoutes() {
    // Public routes
    this.addRoute('/', {
      name: 'home',
      component: 'home-component',
      protected: false,
      title: 'Universal Contribution Manager'
    });
    
    this.addRoute('/login', {
      name: 'login',
      component: 'login-component',
      protected: false,
      title: 'Sign In'
    });
    
    this.addRoute('/register', {
      name: 'register',
      component: 'register-component',
      protected: false,
      title: 'Create Account'
    });
    
    this.addRoute('/forgot-password', {
      name: 'forgot-password',
      component: 'forgot-password-component',
      protected: false,
      title: 'Reset Password'
    });
    
    // Protected routes
    this.addRoute('/dashboard', {
      name: 'dashboard',
      component: 'dashboard-component',
      protected: true,
      title: 'Dashboard'
    });
    
    this.addRoute('/profile', {
      name: 'profile',
      component: 'profile-component',
      protected: true,
      title: 'My Profile'
    });
    
    this.addRoute('/organization', {
      name: 'organization',
      component: 'organization-component',
      protected: true,
      title: 'Organization'
    });
    
    this.addRoute('/contributions', {
      name: 'contributions',
      component: 'contributions-component',
      protected: true,
      title: 'Contributions'
    });
    
    this.addRoute('/members', {
      name: 'members',
      component: 'members-component',
      protected: true,
      title: 'Members'
    });
    
    this.addRoute('/reports', {
      name: 'reports',
      component: 'reports-component',
      protected: true,
      title: 'Reports & Analytics'
    });
    
    this.addRoute('/settings', {
      name: 'settings',
      component: 'settings-component',
      protected: true,
      title: 'Settings'
    });
    
    // Admin routes
    this.addRoute('/admin', {
      name: 'admin',
      component: 'admin-component',
      protected: true,
      requiredRole: 'admin',
      title: 'Admin Dashboard'
    });
    
    // 404 route
    this.addRoute('/404', {
      name: 'not-found',
      component: 'not-found-component',
      protected: false,
      title: 'Page Not Found'
    });
    
    this.logger.debug('Routes defined', { 
      totalRoutes: this.routes.size 
    });
  }

  /**
   * Add a route to the router
   * 
   * @param {string} path - Route path
   * @param {Object} config - Route configuration
   */
  addRoute(path, config) {
    this.routes.set(path, {
      path,
      name: config.name,
      component: config.component,
      protected: config.protected || false,
      requiredRole: config.requiredRole || null,
      title: config.title || 'Universal Contribution Manager',
      beforeEnter: config.beforeEnter || null,
      afterEnter: config.afterEnter || null
    });
    
    this.logger.debug(`Route added: ${path}`, config);
  }

  /**
   * Set up event listeners
   * 
   * @private
   */  setupEventListeners() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', this.handlePopState);
    
    // Handle link clicks for SPA navigation
    document.addEventListener('click', this.handleLinkClick);
    
    // Listen to authentication state changes
    this.authService.onAuthStateChange((user) => {
      this.handleAuthStateChange(user);
    });
    
    // Listen for programmatic navigation requests
    this.eventBus.on('router:navigate', (path) => {
      if (typeof path === 'string') {
        this.navigateTo(path);
      } else if (path && path.path) {
        this.navigateTo(path.path, path.options);
      }
    });
    
    this.logger.debug('Event listeners set up');
  }

  /**
   * Handle initial route on page load
   * 
   * @private
   * @returns {Promise<void>}
   */
  async handleInitialRoute() {
    const currentPath = window.location.pathname;
    await this.navigateTo(currentPath, { replace: true });
  }

  /**
   * Handle browser back/forward navigation
   * 
   * @private
   * @param {PopStateEvent} event - Pop state event
   */
  async handlePopState(event) {
    const path = window.location.pathname;
    await this.navigateTo(path, { 
      replace: true, 
      fromPopState: true 
    });
  }
  /**
   * Handle link clicks for SPA navigation
   * 
   * @private
   * @param {MouseEvent} event - Click event
   */
  handleLinkClick(event) {
    const link = event.target.closest('a');
    
    if (!link) return;
    
    const href = link.getAttribute('href');
    
    // Only handle internal links, ignore # links, external links, etc.
    if (!href || 
        href === '#' || 
        href.startsWith('#') || 
        href.startsWith('http') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:')) {
      return;
    }
    
    // Prevent default navigation
    event.preventDefault();
    
    // Navigate using router
    this.navigateTo(href);
  }
  /**
   * Navigate to a specific route
   * 
   * @param {string} path - Route path to navigate to
   * @param {Object} [options={}] - Navigation options
   * @returns {Promise<boolean>} True if navigation was successful
   */
  async navigateTo(path, options = {}) {
    try {
      const { replace = false, fromPopState = false } = options;
      
      this.logger.debug(`Navigating to: ${path}`, options);
      
      // Check if we're already navigating to this path
      if (this.isNavigating && this.targetPath === path) {
        this.logger.debug(`Already navigating to: ${path}`);
        return true;
      }
      
      // Check if we're already on this route (unless it's from popstate)
      if (!fromPopState && this.currentRoute && this.currentRoute.path === path) {
        this.logger.debug(`Already on route: ${path}`);
        return true;
      }
      
      // Set navigation flag
      this.isNavigating = true;
      this.targetPath = path;
      
      try {
        // Find matching route
        const route = this.findRoute(path);
        
        if (!route) {
          this.logger.warn(`Route not found: ${path}`);
          return await this.navigateTo('/404', { replace: true });
        }
        
        // Check route protection
        const canAccess = await this.checkRouteAccess(route);
        
        if (!canAccess) {
          this.logger.warn(`Access denied to route: ${path}`);
          return await this.redirectToAuth();
        }
        
        // Run before navigation callbacks
        const canContinue = await this.runBeforeNavigationCallbacks(route, path);
        
        if (!canContinue) {
          this.logger.info(`Navigation cancelled by before callback: ${path}`);
          return false;
        }
        
        // Update browser history
        if (!fromPopState) {
          if (replace) {
            window.history.replaceState({ path }, '', path);
          } else {
            window.history.pushState({ path }, '', path);
          }
        }
        
        // Update page title
        document.title = route.title;
        
        // Store current route
        this.currentRoute = route;
        
        // Emit navigation event
        this.eventBus.emit('router:navigate', {
          route,
          path,
          options
        });
        
        // Load and render component
        await this.loadRouteComponent(route);
        
        // Run after navigation callbacks
        await this.runAfterNavigationCallbacks(route, path);
        
        this.logger.info(`Navigation completed: ${path}`);
        return true;
        
      } finally {
        // Clear navigation flag
        this.isNavigating = false;
        this.targetPath = null;
      }
      
    } catch (error) {
      this.logger.error(`Navigation failed: ${path}`, error);
      this.errorHandler.handleError(error, {
        type: ErrorType.SYSTEM,
        context: 'Route navigation',
        path
      });
      
      // Clear navigation flag on error
      this.isNavigating = false;
      this.targetPath = null;
      
      // Try to navigate to error page
      if (path !== '/404') {
        return await this.navigateTo('/404', { replace: true });
      }
      
      return false;
    }
  }

  /**
   * Find route that matches the given path
   * 
   * @private
   * @param {string} path - Path to match
   * @returns {Object|null} Matching route or null
   */
  findRoute(path) {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }
    
    // TODO: Add support for parameterized routes (e.g., /user/:id)
    // For now, just return null for non-exact matches
    
    return null;
  }

  /**
   * Check if user can access the route
   * 
   * @private
   * @param {Object} route - Route configuration
   * @returns {Promise<boolean>} True if user can access route
   */
  async checkRouteAccess(route) {
    // Public routes are always accessible
    if (!route.protected) {
      return true;
    }
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return false;
    }
    
    // Check role-based access
    if (route.requiredRole) {
      const user = this.authService.getCurrentUser();
      // TODO: Implement role checking logic
      // For now, assume user has required role
      return true;
    }
    
    return true;
  }

  /**
   * Redirect to authentication page
   * 
   * @private
   * @returns {Promise<boolean>} Navigation result
   */
  async redirectToAuth() {
    const currentPath = window.location.pathname;
    
    // Store intended destination
    sessionStorage.setItem('intended_destination', currentPath);
    
    return await this.navigateTo('/login', { replace: true });
  }

  /**
   * Load and render route component
   * 
   * @private
   * @param {Object} route - Route configuration
   * @returns {Promise<void>}
   */
  async loadRouteComponent(route) {
    try {
      this.logger.debug(`Loading component: ${route.component}`);
      
      // Emit component load event
      this.eventBus.emit('router:load-component', {
        component: route.component,
        route
      });
      
      this.logger.debug(`Component loaded: ${route.component}`);
      
    } catch (error) {
      this.logger.error(`Failed to load component: ${route.component}`, error);
      throw error;
    }
  }

  /**
   * Run before navigation callbacks
   * 
   * @private
   * @param {Object} route - Route configuration
   * @param {string} path - Navigation path
   * @returns {Promise<boolean>} True to continue navigation
   */
  async runBeforeNavigationCallbacks(route, path) {
    for (const callback of this.beforeNavigationCallbacks) {
      try {
        const result = await callback(route, path);
        if (result === false) {
          return false;
        }
      } catch (error) {
        this.logger.error('Error in before navigation callback', error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Run after navigation callbacks
   * 
   * @private
   * @param {Object} route - Route configuration
   * @param {string} path - Navigation path
   * @returns {Promise<void>}
   */
  async runAfterNavigationCallbacks(route, path) {
    for (const callback of this.afterNavigationCallbacks) {
      try {
        await callback(route, path);
      } catch (error) {
        this.logger.error('Error in after navigation callback', error);
      }
    }
  }

  /**
   * Handle authentication state changes
   * 
   * @private
   * @param {Object|null} user - User object or null
   */
  handleAuthStateChange(user) {
    this.logger.debug('Auth state changed in router', {
      authenticated: !!user,
      currentRoute: this.currentRoute?.name
    });
    
    // If user signed out and on protected route, redirect to login
    if (!user && this.currentRoute?.protected) {
      this.navigateTo('/login', { replace: true });
    }
    
    // If user signed in and on login page, redirect to intended destination or dashboard
    if (user && this.currentRoute?.name === 'login') {
      const intendedDestination = sessionStorage.getItem('intended_destination');
      sessionStorage.removeItem('intended_destination');
      
      this.navigateTo(intendedDestination || '/dashboard', { replace: true });
    }
  }

  /**
   * Get current route information
   * 
   * @returns {Object|null} Current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Check if current route matches given path
   * 
   * @param {string} path - Path to check
   * @returns {boolean} True if current route matches
   */
  isCurrentRoute(path) {
    return this.currentRoute?.path === path;
  }

  /**
   * Add before navigation callback
   * 
   * @param {Function} callback - Callback function
   */
  addBeforeNavigationCallback(callback) {
    this.beforeNavigationCallbacks.push(callback);
  }

  /**
   * Add after navigation callback
   * 
   * @param {Function} callback - Callback function
   */
  addAfterNavigationCallback(callback) {
    this.afterNavigationCallbacks.push(callback);
  }

  /**
   * Clean up router resources
   * 
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up router');
      
      // Remove event listeners
      window.removeEventListener('popstate', this.handlePopState);
      document.removeEventListener('click', this.handleLinkClick);
      
      // Clear callbacks
      this.beforeNavigationCallbacks = [];
      this.afterNavigationCallbacks = [];
      
      // Reset state
      this.currentRoute = null;
      this.isInitialized = false;
      
      this.logger.info('Router cleanup complete');
      
    } catch (error) {
      this.logger.error('Error during router cleanup', error);
    }
  }
}
