/**
 * Login Component
 * 
 * User authentication login form component
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { BaseComponent } from '../base-component.js';
import { SweetAlert } from '../../utils/sweet-alert.js';

export class LoginComponent extends BaseComponent {
  constructor(eventBus, props = {}) {
    super(eventBus, props);
    this.name = 'login-component';
    this.cssPath = 'src/styles/components/auth.css';
    this.isLoading = false;
    
    // Get AuthService from props (passed from app)
    this.authService = props.authService;
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
      <div class="login-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          <form class="auth-form" data-action="handleLogin">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                placeholder="Enter your email"
                autocomplete="email"
              >
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                placeholder="Enter your password"
                autocomplete="current-password"
              >
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" ${this.isLoading ? 'disabled' : ''}>
                ${this.isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div class="auth-links">
            <p>
              Don't have an account? 
              <a href="#" data-action="navigateToRegister">Create Account</a>
            </p>
            <p>
              <a href="#" data-action="navigateToForgotPassword">Forgot Password?</a>
            </p>
          </div>

          <div class="auth-divider">
            <span>or</span>
          </div>

          <div class="social-login">
            <button type="button" class="btn btn-social" data-action="signInWithGoogle">
              Continue with Google
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
    return {      handleLogin: async (event) => {
        event.preventDefault();
        console.log('Login form submitted!', event);
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        console.log('Form data:', { email, password });        if (!email || !password) {
          SweetAlert.error('Missing Information', 'Please fill in all fields');
          return;
        }

        try {
          this.setLoading(true);
          
          // Use AuthService to sign in
          if (this.authService) {
            console.log('Calling AuthService.signIn');
            const result = await this.authService.signIn(email, password);
            console.log('Sign in result:', result);            if (result.success) {
              // Show success message and redirect to dashboard
              SweetAlert.success('Welcome Back!', 'Redirecting to dashboard...', {
                timer: 1500,
                showConfirmButton: false
              });
              this.setLoading(false);
              
              // Clear form
              event.target.reset();
              
              // Navigate to dashboard after a short delay
              setTimeout(() => {
                this.eventBus.emit('router:navigate', '/dashboard');
              }, 1000);
            }
          } else {
            // Fallback: emit event for backwards compatibility
            console.log('AuthService not available, emitting auth:login event');
            this.eventBus.emit('auth:login', { email, password });
            
            // Temporary simulation
            setTimeout(() => {
              this.setLoading(false);
              this.eventBus.emit('router:navigate', '/dashboard');
            }, 1000);
          }        } catch (error) {
          console.error('Login error:', error);
          SweetAlert.error('Login Failed', error.message || 'Login failed');
          this.setLoading(false);
        }
      },

      navigateToRegister: (event) => {
        event.preventDefault();
        this.eventBus.emit('router:navigate', '/register');
      },

      navigateToForgotPassword: (event) => {
        event.preventDefault();
        this.eventBus.emit('router:navigate', '/forgot-password');
      },

      signInWithGoogle: () => {
        this.eventBus.emit('auth:google-signin');
      }
    };
  }

  /**
   * Set loading state
   * 
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    const submitBtn = this.element?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Signing In...' : 'Sign In';
    }
  }

  /**
   * Show error message
   * 
   * @param {string} message - Error message
   */
  showError(message) {
    // Remove existing error
    const existingError = this.element?.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    // Create new error element
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    // Insert after form
    const form = this.element?.querySelector('.auth-form');
    if (form) {
      form.parentNode.insertBefore(errorElement, form.nextSibling);
    }
  }

  /**
   * Component lifecycle methods
   */
  getLifecycle() {
    return {
      onMount: () => {
        this.logger?.debug('Login component mounted');
        
        // Focus on email field
        const emailField = this.element?.querySelector('#email');
        if (emailField) {
          emailField.focus();
        }
      },

      onUnmount: () => {
        this.logger?.debug('Login component unmounted');
      }
    };
  }
}
