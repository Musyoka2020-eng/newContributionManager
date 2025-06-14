/**
 * Component Manager
 * 
 * Manages component registration, loading, rendering, and lifecycle.
 * This version uses modular component files instead of inline templates.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

// Import individual components
import { HomeComponent } from '../components/home/home-component.js';
import { LoginComponent } from '../components/auth/login-component.js';
import { RegisterComponent } from '../components/auth/register-component.js';
import { DashboardComponent } from '../components/dashboard/dashboard-component.js';
import { NotFoundComponent } from '../components/not-found-component.js';
import { NavigationComponent } from '../components/navigation-component.js';

export class ComponentManager {
  /**
   * Initialize component manager
   * 
   * @param {EventBus} eventBus - Application event bus
   * @param {AuthService} authService - Authentication service
   */
  constructor(eventBus, authService = null) {
    this.eventBus = eventBus;
    this.authService = authService;
    this.logger = new Logger('ComponentManager');
    this.errorHandler = new ErrorHandler();
    
    // Component registry
    this.components = new Map();
    this.activeComponents = new Map();
    
    // State
    this.isInitialized = false;
    
    this.logger.debug('ComponentManager instance created');
  }

  /**
   * Initialize the component manager
   * 
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.logger.info('Initializing component manager...');
      
      // Register built-in components
      this.registerBuiltInComponents();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.logger.info('✅ Component manager initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize component manager', error);
      throw error;
    }
  }

  /**
   * Register built-in components
   * 
   * @private
   */  registerBuiltInComponents() {
    this.logger.debug('Registering built-in components...');
      // Register components with their classes
    this.registerComponent('home-component', HomeComponent);
    this.registerComponent('login-component', LoginComponent);
    this.registerComponent('register-component', RegisterComponent);
    this.registerComponent('dashboard-component', DashboardComponent);
    this.registerComponent('not-found-component', NotFoundComponent);
    this.registerComponent('navigation-component', NavigationComponent);
    
    this.logger.debug(`Registered ${this.components.size} built-in components`);
  }

  /**
   * Register a component
   * 
   * @param {string} name - Component name
   * @param {Class} ComponentClass - Component class
   */
  registerComponent(name, ComponentClass) {
    if (this.components.has(name)) {
      this.logger.warn(`Component ${name} already registered, overwriting`);
    }
    
    this.components.set(name, ComponentClass);
    this.logger.debug(`Component registered: ${name}`);
  }  /**
   * Load and render a component
   * 
   * @param {string} componentName - Name of component to load
   * @param {Object} props - Props to pass to component
   * @param {string} containerId - ID of container element
   * @returns {Promise<Object>} Component instance
   */
  async loadComponent(componentName, props = {}, containerId = 'main-content') {
    try {
      this.logger.debug(`Loading component: ${componentName}`);
      
      // Check if component is registered
      const ComponentClass = this.components.get(componentName);
      if (!ComponentClass) {
        throw new Error(`Component not registered: ${componentName}`);
      }
      
      // Get container
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container not found: ${containerId}`);
      }
      
      // Check if the same component is already being loaded for this container
      const loadingKey = `${componentName}-${containerId}`;
      if (this.loadingComponents && this.loadingComponents.has(loadingKey)) {
        this.logger.debug(`Component ${componentName} already loading for container ${containerId}`);
        return this.loadingComponents.get(loadingKey);
      }
      
      // Initialize loading tracking if it doesn't exist
      if (!this.loadingComponents) {
        this.loadingComponents = new Map();
      }
      
      // Create loading promise
      const loadingPromise = this._doLoadComponent(componentName, props, containerId, ComponentClass, container);
      this.loadingComponents.set(loadingKey, loadingPromise);
      
      try {
        const result = await loadingPromise;
        this.loadingComponents.delete(loadingKey);
        return result;
      } catch (error) {
        this.loadingComponents.delete(loadingKey);
        throw error;
      }
      
    } catch (error) {
      this.logger.error(`Failed to load component: ${componentName}`, error);
      throw error;
    }
  }

  /**
   * Internal method to actually load the component
   * 
   * @private
   */  async _doLoadComponent(componentName, props, containerId, ComponentClass, container) {
    // Clear container
    container.innerHTML = '';
    
    // Add AuthService to props for auth components
    const componentProps = { 
      ...props, 
      autoRender: false,
      authService: this.authService 
    };
    
    // Create component instance with autoRender disabled since we'll handle rendering manually
    const instance = new ComponentClass(this.eventBus, componentProps);
    
    // Set container and element references
    instance.container = container;
    
    // Create wrapper element
    const element = document.createElement('div');
    element.className = `component ${instance.name}`;
    container.appendChild(element);
    instance.element = element;
    
    // Initialize component first
    await instance.init();
    
    // Get component template and render
    const template = instance.getTemplate();
    element.innerHTML = template;
    
    // Set up component methods and event listeners
    this.setupComponentMethods(instance);
    
    // Call lifecycle onMount
    if (instance.getLifecycle && instance.getLifecycle().onMount) {
      await instance.getLifecycle().onMount.call(instance);
    }
    
    // Store active instance
    const instanceId = `${componentName}-${Date.now()}`;
    this.activeComponents.set(instanceId, instance);
    
    this.logger.info(`Component loaded successfully: ${componentName}`);
    
    return instance;
  }
  /**
   * Set up component methods and event listeners
   * 
   * @private
   * @param {Object} instance - Component instance
   */  setupComponentMethods(instance) {
    if (!instance.element) return;
    
    // Safely get methods - check if getMethods exists
    const methods = (typeof instance.getMethods === 'function') ? instance.getMethods() : {};
    
    // Set up click handlers for elements with data-action attributes
    const actionElements = instance.element.querySelectorAll('[data-action]');
    actionElements.forEach(element => {
      element.addEventListener('click', (event) => {
        const action = event.target.getAttribute('data-action');
        if (methods[action]) {
          event.preventDefault();
          methods[action].call(instance, event);
        }
      });
    });
    
    // Set up form handlers
    const forms = instance.element.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (event) => {
        const action = form.getAttribute('data-action');
        if (action && methods[action]) {
          methods[action].call(instance, event);
        } else if (methods.onSubmit) {
          methods.onSubmit.call(instance, event);
        }
      });
    });
  }

  /**
   * Unload a component
   * 
   * @param {string} componentId - Component instance ID
   * @returns {Promise<boolean>} Success status
   */
  async unloadComponent(componentId) {
    try {
      const instance = this.activeComponents.get(componentId);
      
      if (!instance) {
        this.logger.warn(`Component instance not found: ${componentId}`);
        return false;
      }
        // Call lifecycle onUnmount
      if (instance.getLifecycle && typeof instance.getLifecycle === 'function' && instance.getLifecycle().onUnmount) {
        await instance.getLifecycle().onUnmount.call(instance);
      }
      
      // Remove from DOM
      if (instance.element) {
        instance.element.remove();
      }
      
      // Remove from active components
      this.activeComponents.delete(componentId);
      
      this.logger.debug(`Component unloaded: ${instance.name}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to unload component: ${componentId}`, error);
      return false;
    }
  }

  /**
   * Set up event listeners
   * 
   * @private
   */  setupEventListeners() {
    // Listen for component load requests
    this.eventBus.on('component:load', async ({ name, props, containerId }) => {
      try {
        await this.loadComponent(name, props, containerId);
      } catch (error) {
        this.logger.error('Failed to load requested component', error);
        this.eventBus.emit('component:error', { error, componentName: name });
      }
    });
    
    // Listen for router component load requests
    this.eventBus.on('router:load-component', async ({ component, route }) => {
      try {
        this.logger.debug(`Router requesting component load: ${component}`);
        await this.loadComponent(component, { route }, 'main-content');
        this.logger.info(`Component loaded successfully: ${component}`);
      } catch (error) {
        this.logger.error('Failed to load router component', error);
        this.eventBus.emit('component:error', { error, componentName: component });
      }
    });
    
    // Listen for component unload requests
    this.eventBus.on('component:unload', async ({ componentId }) => {
      await this.unloadComponent(componentId);
    });
  }

  /**
   * Get active components
   * 
   * @returns {Map} Active components
   */
  getActiveComponents() {
    return new Map(this.activeComponents);
  }

  /**
   * Get registered components
   * 
   * @returns {Array} Component names
   */
  getRegisteredComponents() {
    return Array.from(this.components.keys());
  }

  /**
   * Clean up component manager
   * 
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up component manager');
      
      // Unload all active components
      const componentIds = Array.from(this.activeComponents.keys());
      for (const componentId of componentIds) {
        await this.unloadComponent(componentId);
      }
      
      // Clear registrations
      this.components.clear();
      this.activeComponents.clear();
      
      // Reset state
      this.isInitialized = false;
      
      this.logger.info('Component manager cleanup complete');
      
    } catch (error) {
      this.logger.error('Error during component manager cleanup', error);
    }
  }
}
