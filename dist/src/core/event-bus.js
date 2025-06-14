/**
 * Event Bus System
 * 
 * Centralized event management system for the Universal Contribution Manager.
 * Provides publish-subscribe functionality for loose coupling between components.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { Logger } from '../utils/logger.js';

/**
 * Event Bus class for application-wide event management
 * 
 * Implements the publish-subscribe pattern for decoupled communication
 * between different parts of the application.
 */
export class EventBus {
  /**
   * Initialize the event bus
   */
  constructor() {
    this.logger = new Logger('EventBus');
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.debugMode = false;
    
    this.logger.debug('Event bus initialized');
  }

  /**
   * Subscribe to an event
   * 
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @param {Object} [options={}] - Subscription options
   * @param {number} [options.priority=0] - Event handler priority (higher = called first)
   * @param {Object} [options.context] - Context object for the callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (typeof event !== 'string') {
      throw new Error('Event name must be a string');
    }
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const { priority = 0, context = null } = options;
    
    // Initialize event listeners array if it doesn't exist
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const listener = {
      callback,
      priority,
      context,
      id: this.generateListenerId(),
      createdAt: new Date().toISOString()
    };
    
    // Add listener and sort by priority (higher priority first)
    const eventListeners = this.listeners.get(event);
    eventListeners.push(listener);
    eventListeners.sort((a, b) => b.priority - a.priority);
    
    this.logger.debug(`Event listener registered: ${event}`, {
      listenerId: listener.id,
      priority,
      totalListeners: eventListeners.length
    });
    
    // Return unsubscribe function
    return () => this.off(event, listener.id);
  }

  /**
   * Subscribe to an event that will only fire once
   * 
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @param {Object} [options={}] - Subscription options
   * @returns {Function} Unsubscribe function
   */
  once(event, callback, options = {}) {
    const { priority = 0, context = null } = options;
    
    // Initialize once listeners array if it doesn't exist
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    
    const listener = {
      callback,
      priority,
      context,
      id: this.generateListenerId(),
      createdAt: new Date().toISOString()
    };
    
    // Add to once listeners and sort by priority
    const onceEventListeners = this.onceListeners.get(event);
    onceEventListeners.push(listener);
    onceEventListeners.sort((a, b) => b.priority - a.priority);
    
    this.logger.debug(`Once event listener registered: ${event}`, {
      listenerId: listener.id,
      priority
    });
    
    // Return unsubscribe function
    return () => this.offOnce(event, listener.id);
  }

  /**
   * Unsubscribe from an event
   * 
   * @param {string} event - Event name
   * @param {string} [listenerId] - Specific listener ID to remove
   * @returns {boolean} True if listener was removed
   */
  off(event, listenerId = null) {
    if (!this.listeners.has(event)) {
      return false;
    }
    
    const eventListeners = this.listeners.get(event);
    
    if (listenerId) {
      // Remove specific listener
      const index = eventListeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        eventListeners.splice(index, 1);
        this.logger.debug(`Event listener removed: ${event}`, { listenerId });
        return true;
      }
    } else {
      // Remove all listeners for this event
      const count = eventListeners.length;
      this.listeners.set(event, []);
      this.logger.debug(`All event listeners removed: ${event}`, { count });
      return count > 0;
    }
    
    return false;
  }

  /**
   * Unsubscribe from a once event
   * 
   * @private
   * @param {string} event - Event name
   * @param {string} listenerId - Listener ID to remove
   * @returns {boolean} True if listener was removed
   */
  offOnce(event, listenerId) {
    if (!this.onceListeners.has(event)) {
      return false;
    }
    
    const onceEventListeners = this.onceListeners.get(event);
    const index = onceEventListeners.findIndex(l => l.id === listenerId);
    
    if (index !== -1) {
      onceEventListeners.splice(index, 1);
      this.logger.debug(`Once event listener removed: ${event}`, { listenerId });
      return true;
    }
    
    return false;
  }

  /**
   * Emit an event to all subscribers
   * 
   * @param {string} event - Event name to emit
   * @param {any} [data] - Data to pass to event handlers
   * @param {Object} [options={}] - Emission options
   * @param {boolean} [options.async=false] - Whether to emit asynchronously
   * @returns {Promise<Array>|Array} Results from event handlers
   */
  emit(event, data = null, options = {}) {
    const { async = false } = options;
    
    const eventData = {
      event,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateEventId()
    };
    
    // Add to event history
    this.addToHistory(eventData);
    
    this.logger.debug(`Event emitted: ${event}`, {
      eventId: eventData.id,
      hasData: data !== null,
      async
    });
    
    if (async) {
      return this.emitAsync(event, eventData);
    } else {
      return this.emitSync(event, eventData);
    }
  }

  /**
   * Emit event synchronously
   * 
   * @private
   * @param {string} event - Event name
   * @param {Object} eventData - Event data object
   * @returns {Array} Results from event handlers
   */
  emitSync(event, eventData) {
    const results = [];
    
    try {
      // Handle once listeners first
      if (this.onceListeners.has(event)) {
        const onceListeners = this.onceListeners.get(event).slice(); // Copy array
        this.onceListeners.set(event, []); // Clear once listeners
        
        for (const listener of onceListeners) {
          try {
            const result = this.callListener(listener, eventData);
            results.push({ listenerId: listener.id, result, error: null });
          } catch (error) {
            this.logger.error(`Error in once event listener: ${event}`, {
              listenerId: listener.id,
              error: error.message
            });
            results.push({ listenerId: listener.id, result: null, error });
          }
        }
      }
      
      // Handle regular listeners
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        
        for (const listener of listeners) {
          try {
            const result = this.callListener(listener, eventData);
            results.push({ listenerId: listener.id, result, error: null });
          } catch (error) {
            this.logger.error(`Error in event listener: ${event}`, {
              listenerId: listener.id,
              error: error.message
            });
            results.push({ listenerId: listener.id, result: null, error });
          }
        }
      }
      
    } catch (error) {
      this.logger.error(`Error emitting event: ${event}`, error);
    }
    
    return results;
  }

  /**
   * Emit event asynchronously
   * 
   * @private
   * @param {string} event - Event name
   * @param {Object} eventData - Event data object
   * @returns {Promise<Array>} Results from event handlers
   */
  async emitAsync(event, eventData) {
    const results = [];
    
    try {
      // Handle once listeners first
      if (this.onceListeners.has(event)) {
        const onceListeners = this.onceListeners.get(event).slice(); // Copy array
        this.onceListeners.set(event, []); // Clear once listeners
        
        for (const listener of onceListeners) {
          try {
            const result = await this.callListener(listener, eventData);
            results.push({ listenerId: listener.id, result, error: null });
          } catch (error) {
            this.logger.error(`Error in async once event listener: ${event}`, {
              listenerId: listener.id,
              error: error.message
            });
            results.push({ listenerId: listener.id, result: null, error });
          }
        }
      }
      
      // Handle regular listeners
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        
        for (const listener of listeners) {
          try {
            const result = await this.callListener(listener, eventData);
            results.push({ listenerId: listener.id, result, error: null });
          } catch (error) {
            this.logger.error(`Error in async event listener: ${event}`, {
              listenerId: listener.id,
              error: error.message
            });
            results.push({ listenerId: listener.id, result: null, error });
          }
        }
      }
      
    } catch (error) {
      this.logger.error(`Error emitting async event: ${event}`, error);
    }
    
    return results;
  }

  /**
   * Call an event listener with proper context
   * 
   * @private
   * @param {Object} listener - Listener object
   * @param {Object} eventData - Event data
   * @returns {any} Result from the listener
   */
  callListener(listener, eventData) {
    if (listener.context) {
      return listener.callback.call(listener.context, eventData.data, eventData);
    } else {
      return listener.callback(eventData.data, eventData);
    }
  }

  /**
   * Add event to history
   * 
   * @private
   * @param {Object} eventData - Event data to add to history
   */
  addToHistory(eventData) {
    this.eventHistory.unshift(eventData);
    
    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Wait for a specific event to be emitted
   * 
   * @param {string} event - Event name to wait for
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @returns {Promise} Promise that resolves when event is emitted
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
      
      // Set up event listener
      const unsubscribe = this.once(event, (data, eventData) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve({ data, eventData });
      });
    });
  }

  /**
   * Get all listeners for an event
   * 
   * @param {string} event - Event name
   * @returns {Array} Array of listener objects
   */
  getListeners(event) {
    const regular = this.listeners.get(event) || [];
    const once = this.onceListeners.get(event) || [];
    
    return {
      regular: regular.map(l => ({
        id: l.id,
        priority: l.priority,
        createdAt: l.createdAt
      })),
      once: once.map(l => ({
        id: l.id,
        priority: l.priority,
        createdAt: l.createdAt
      }))
    };
  }

  /**
   * Get event statistics
   * 
   * @returns {Object} Event bus statistics
   */
  getStats() {
    const allEvents = new Set([
      ...this.listeners.keys(),
      ...this.onceListeners.keys()
    ]);
    
    const eventStats = {};
    for (const event of allEvents) {
      const regular = this.listeners.get(event) || [];
      const once = this.onceListeners.get(event) || [];
      
      eventStats[event] = {
        regularListeners: regular.length,
        onceListeners: once.length,
        total: regular.length + once.length
      };
    }
    
    return {
      totalEvents: allEvents.size,
      totalListeners: Array.from(allEvents).reduce((sum, event) => {
        return sum + eventStats[event].total;
      }, 0),
      eventStats,
      historySize: this.eventHistory.length
    };
  }

  /**
   * Get recent event history
   * 
   * @param {number} [limit=10] - Maximum number of events to return
   * @returns {Array} Recent events
   */
  getHistory(limit = 10) {
    return this.eventHistory.slice(0, limit);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    const stats = this.getStats();
    
    this.listeners.clear();
    this.onceListeners.clear();
    
    this.logger.info('All event listeners removed', stats);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    const historySize = this.eventHistory.length;
    this.eventHistory = [];
    
    this.logger.debug('Event history cleared', { historySize });
  }

  /**
   * Enable or disable debug mode
   * 
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.logger.info(`Event bus debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Generate unique listener ID
   * 
   * @private
   * @returns {string} Unique listener ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   * 
   * @private
   * @returns {string} Unique event ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
