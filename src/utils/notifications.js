/**
 * Notification System
 * 
 * Simple notification system for user feedback
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

export class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a notification
   * 
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getIcon(type)}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `;

    this.container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Dismiss a notification
   */
  dismiss(notification) {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  }

  /**
   * Get icon for notification type
   */
  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Show success notification
   */
  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error notification
   */
  error(message, duration = 8000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show warning notification
   */
  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show info notification
   */
  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// Global notification instance
window.notifications = new NotificationSystem();
