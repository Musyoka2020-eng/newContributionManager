/**
 * Logger Utility
 * 
 * Provides structured logging functionality with different log levels,
 * formatting, and optional remote logging capabilities.
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

/**
 * Log levels enum
 * @readonly
 * @enum {string}
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Logger class for structured application logging
 * 
 * Provides different log levels, formatting, and contextual information.
 * In production, logs can be sent to external logging services.
 */
export class Logger {
  /**
   * Create a new Logger instance
   * 
   * @param {string} context - The context/module name for this logger
   * @param {string} [level=LogLevel.INFO] - Minimum log level to output
   */
  constructor(context = 'App', level = LogLevel.INFO) {
    this.context = context;
    this.level = level;
    this.startTime = Date.now();
    
    // Log level priorities for filtering
    this.levelPriorities = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };
    
    // Console method mapping
    this.consoleMethods = {
      [LogLevel.DEBUG]: 'debug',
      [LogLevel.INFO]: 'log',
      [LogLevel.WARN]: 'warn',
      [LogLevel.ERROR]: 'error'
    };
    
    // Colors for different log levels (for development)
    this.colors = {
      [LogLevel.DEBUG]: '#6b7280',
      [LogLevel.INFO]: '#2563eb',
      [LogLevel.WARN]: '#d97706',
      [LogLevel.ERROR]: '#dc2626'
    };
  }

  /**
   * Check if a log level should be output
   * 
   * @private
   * @param {string} level - Log level to check
   * @returns {boolean} True if level should be logged
   */
  shouldLog(level) {
    return this.levelPriorities[level] >= this.levelPriorities[this.level];
  }

  /**
   * Format log message with timestamp and context
   * 
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   * @returns {Object} Formatted log entry
   */
  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    
    return {
      timestamp,
      uptime: `${uptime}ms`,
      level: level.toUpperCase(),
      context: this.context,
      message,
      data: Object.keys(data).length > 0 ? data : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * Output log to console with styling
   * 
   * @private
   * @param {string} level - Log level
   * @param {Object} logEntry - Formatted log entry
   */
  outputToConsole(level, logEntry) {
    const consoleMethod = this.consoleMethods[level];
    const color = this.colors[level];
    
    // Create styled output for development
    const prefix = `%c[${logEntry.level}] ${logEntry.context}`;
    const style = `color: ${color}; font-weight: bold;`;
    
    if (logEntry.data) {
      console[consoleMethod](prefix, style, logEntry.message, logEntry.data);
    } else {
      console[consoleMethod](prefix, style, logEntry.message);
    }
    
    // Also log the full structured data for debugging
    if (level === LogLevel.DEBUG) {
      console.debug('Full log entry:', logEntry);
    }
  }

  /**
   * Send log to remote logging service (if configured)
   * 
   * @private
   * @param {Object} logEntry - Formatted log entry
   */
  async sendToRemoteLogging(logEntry) {
    // Only send warnings and errors to remote logging
    if (logEntry.level === 'WARN' || logEntry.level === 'ERROR') {
      try {
        // This would integrate with your logging service
        // Example: Sentry, LogRocket, etc.
        
        // For now, just store in localStorage for development
        const logs = JSON.parse(localStorage.getItem('ucm_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.shift();
        }
        
        localStorage.setItem('ucm_logs', JSON.stringify(logs));
        
      } catch (error) {
        console.error('Failed to send log to remote service:', error);
      }
    }
  }

  /**
   * Core logging method
   * 
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  log(level, message, data = {}) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const logEntry = this.formatMessage(level, message, data);
    
    // Output to console
    this.outputToConsole(level, logEntry);
    
    // Send to remote logging (async, don't wait)
    this.sendToRemoteLogging(logEntry);
  }

  /**
   * Log debug message
   * 
   * @param {string} message - Debug message
   * @param {Object} [data] - Additional debug data
   */
  debug(message, data = {}) {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   * 
   * @param {string} message - Info message
   * @param {Object} [data] - Additional info data
   */
  info(message, data = {}) {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   * 
   * @param {string} message - Warning message
   * @param {Object} [data] - Additional warning data
   */
  warn(message, data = {}) {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   * 
   * @param {string} message - Error message
   * @param {Error|Object} [data] - Error object or additional error data
   */
  error(message, data = {}) {
    // If data is an Error object, extract useful information
    if (data instanceof Error) {
      data = {
        name: data.name,
        message: data.message,
        stack: data.stack,
        cause: data.cause
      };
    }
    
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Create a timer for performance measurement
   * 
   * @param {string} label - Timer label
   * @returns {Function} Function to call to end the timer
   */
  timer(label) {
    const startTime = performance.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.info(`Timer completed: ${label}`, { 
        duration: `${duration.toFixed(2)}ms` 
      });
      return duration;
    };
  }

  /**
   * Log method execution time
   * 
   * @param {string} methodName - Name of the method being timed
   * @param {Function} fn - Function to execute and time
   * @param {...any} args - Arguments to pass to the function
   * @returns {any} Result of the function execution
   */
  async timeMethod(methodName, fn, ...args) {
    const endTimer = this.timer(methodName);
    
    try {
      const result = await fn(...args);
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.error(`Method ${methodName} failed`, error);
      throw error;
    }
  }

  /**
   * Set the minimum log level
   * 
   * @param {string} level - New minimum log level
   */
  setLevel(level) {
    if (this.levelPriorities.hasOwnProperty(level)) {
      this.level = level;
      this.info(`Log level changed to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Create a child logger with additional context
   * 
   * @param {string} childContext - Additional context for the child logger
   * @returns {Logger} New logger instance
   */
  child(childContext) {
    const fullContext = `${this.context}:${childContext}`;
    return new Logger(fullContext, this.level);
  }

  /**
   * Get all stored logs (from localStorage)
   * 
   * @returns {Array} Array of log entries
   */
  static getLogs() {
    try {
      return JSON.parse(localStorage.getItem('ucm_logs') || '[]');
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  /**
   * Clear all stored logs
   */
  static clearLogs() {
    try {
      localStorage.removeItem('ucm_logs');
      console.info('Logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as downloadable file
   */
  static exportLogs() {
    try {
      const logs = Logger.getLogs();
      const logData = JSON.stringify(logs, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `ucm-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.info('Logs exported successfully');
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }
}
