/**
 * Register Component
 * 
 * User registration form component
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

import { BaseComponent } from '../base-component.js';
import { SweetAlert } from '../../utils/sweet-alert.js';

export class RegisterComponent extends BaseComponent {
  constructor(eventBus, props = {}) {
    super(eventBus, props);
    this.name = 'register-component';
    this.cssPath = 'src/styles/components/auth.css';
    this.isLoading = false;
    
    // Get AuthService from props (passed from app)
    this.authService = props.authService;
    
    // Registration retry tracking
    this.maxRetries = 3;
    this.retryCount = 0;
    this.isRetryBlocked = false;
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
      <div class="register-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1>Create Account</h1>
            <p>Join us to start managing contributions</p>
          </div>

          <form class="auth-form" data-action="handleRegister">
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">First Name</label>
                <input 
                  type="text" 
                  id="firstName" 
                  name="firstName" 
                  required 
                  placeholder="Enter your first name"
                  autocomplete="given-name"
                >
              </div>
              <div class="form-group">
                <label for="lastName">Last Name</label>
                <input 
                  type="text" 
                  id="lastName" 
                  name="lastName" 
                  required 
                  placeholder="Enter your last name"
                  autocomplete="family-name"
                >
              </div>
            </div>

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
                placeholder="Create a password"
                autocomplete="new-password"
                minlength="6"
              >
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                required 
                placeholder="Confirm your password"
                autocomplete="new-password"
                minlength="6"
              >
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" id="terms" name="terms" required>
                <span class="checkmark"></span>
                I agree to the <a href="#" data-action="showTerms">Terms of Service</a> and <a href="#" data-action="showPrivacy">Privacy Policy</a>
              </label>
            </div>            <div class="form-actions">
              <button type="submit" class="btn btn-primary" ${this.isLoading || this.isRetryBlocked ? 'disabled' : ''}>
                ${this.isLoading ? 'Creating Account...' : this.isRetryBlocked ? 'Registration Blocked' : 'Create Account'}
              </button>
              ${this.retryCount > 0 && !this.isRetryBlocked ? `
                <div class="retry-info">
                  <small>Attempts: ${this.retryCount}/${this.maxRetries}</small>
                </div>
              ` : ''}
              ${this.isRetryBlocked ? `
                <div class="retry-blocked">
                  <small>Too many failed attempts. Please <a href="#" data-action="resetRetries">refresh the page</a> to try again.</small>
                </div>
              ` : ''}
            </div>
          </form>

          <div class="auth-links">
            <p>
              Already have an account? 
              <a href="#" data-action="navigateToLogin">Sign In</a>
            </p>
          </div>

          <div class="auth-divider">
            <span>or</span>
          </div>

          <div class="social-login">
            <button type="button" class="btn btn-social" data-action="signUpWithGoogle">
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Component methods
   */  getMethods() {
    return {
      handleRegister: async (event) => {
        event.preventDefault();
        console.log('Register form submitted!', event);
        
        // Check if registration is blocked
        if (this.isRetryBlocked) {
          await SweetAlert.error(
            'Registration Blocked', 
            `You have exceeded the maximum number of registration attempts (${this.maxRetries}). Please refresh the page to try again.`,
            {
              confirmButtonText: 'Refresh Page',
              allowOutsideClick: false
            }
          );
          window.location.reload();
          return;
        }
        
        const formData = new FormData(event.target);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const terms = formData.get('terms');

        console.log('Form data:', { firstName, lastName, email, password, confirmPassword, terms });
        
        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
          await SweetAlert.error('Missing Information', 'Please fill in all fields');
          return;
        }

        if (password !== confirmPassword) {
          await SweetAlert.error('Password Mismatch', 'Passwords do not match');
          return;
        }

        if (password.length < 6) {
          await SweetAlert.error('Password Too Short', 'Password must be at least 6 characters long');
          return;
        }

        if (!terms) {
          await SweetAlert.error('Terms Required', 'Please accept the terms of service');
          return;
        }

        try {
          this.setLoading(true);
          this.retryCount++;
          
          // Update retry display
          this.render();
          
          // Use AuthService to create account
          if (this.authService) {
            console.log(`Registration attempt ${this.retryCount}/${this.maxRetries}`);
            const displayName = `${firstName} ${lastName}`;
            
            // Set a timeout for the registration attempt
            const registrationPromise = this.authService.createAccount(email, password, {
              displayName,
              firstName,
              lastName
            });
            
            // Create a timeout promise that rejects after 30 seconds
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('Registration timed out. Please check your internet connection and try again.'));
              }, 30000); // 30 second timeout
            });
            
            // Race between registration and timeout
            const result = await Promise.race([registrationPromise, timeoutPromise]);
            
            console.log('Registration result:', result);
              if (result.success) {
              // Reset retry count on success
              this.retryCount = 0;
              this.isRetryBlocked = false;
              
              // Show success message and redirect to login
              await SweetAlert.success(
                'Registration Successful!', 
                'Your account has been created successfully. Please check your email for verification, then sign in.',
                {
                  confirmButtonText: 'Go to Login'
                }
              );
              this.setLoading(false);
              
              // Clear form
              event.target.reset();
              
              // Navigate to login
              this.eventBus.emit('router:navigate', '/login');
              return; // Exit early to avoid fallback logic
            }
          } else {            // Fallback: emit event for backwards compatibility
            console.log('AuthService not available, emitting auth:register event');
            this.eventBus.emit('auth:register', { 
              firstName, 
              lastName, 
              email, 
              password 
            });
            
            // Temporary simulation
            setTimeout(() => {
              this.setLoading(false);
              SweetAlert.success('Registration Successful!', 'Please log in.', {
                confirmButtonText: 'Go to Login'
              }).then(() => {
                this.eventBus.emit('router:navigate', '/login');
              });
            }, 1000);
          }
        } catch (error) {
          console.error(`Registration error (attempt ${this.retryCount}/${this.maxRetries}):`, error);
          console.log('Error type:', typeof error);
          console.log('Error constructor:', error.constructor.name);
          console.log('Error keys:', Object.keys(error));
          
          // Check for specific error types
          const errorMessage = error.message || 'Registration failed';
          const errorCode = error.code || '';
          
          console.log('Error details:', { errorMessage, errorCode, fullError: error });
          console.log('Checking for email already exists conditions...');
          console.log('Message includes "account with this email already exists":', errorMessage.includes('account with this email already exists'));
          console.log('Message includes "email already exists":', errorMessage.includes('email already exists'));
          console.log('Message includes "email-already-in-use":', errorMessage.includes('email-already-in-use'));
          console.log('Message includes "An account with this email already exists":', errorMessage.includes('An account with this email already exists'));
          console.log('Code equals "auth/email-already-in-use":', errorCode === 'auth/email-already-in-use');
            // If email already exists, redirect to login
          if (errorMessage.includes('account with this email already exists') || 
              errorMessage.includes('email already exists') || 
              errorMessage.includes('email-already-in-use') ||
              errorMessage.includes('An account with this email already exists') ||
              errorCode === 'auth/email-already-in-use') {
            console.log('Email already exists - showing dialog and redirecting to login');
            this.setLoading(false); // Re-enable the button immediately
            
            try {
              console.log('About to show SweetAlert dialog...');
              const result = await SweetAlert.info(
                'Account Already Exists',
                'An account with this email address already exists. Please sign in instead.',
                {
                  confirmButtonText: 'Go to Login'
                }
              );
              console.log('SweetAlert dialog closed, result:', result);
              
              console.log('Navigating to login...');
              this.eventBus.emit('router:navigate', '/login');
            } catch (swalError) {
              console.error('Error showing SweetAlert dialog:', swalError);
              // Fallback: just navigate to login
              this.eventBus.emit('router:navigate', '/login');
            }
            return; // Exit early to avoid retry logic
          }
          
          // Check if we've exceeded max retries
          if (this.retryCount >= this.maxRetries) {
            this.isRetryBlocked = true;
            this.render(); // Update the UI
            
            await SweetAlert.error(
              'Registration Failed',
              `Registration failed after ${this.maxRetries} attempts. This might be due to:\n\n• Network connectivity issues\n• Server problems\n• Invalid email format\n\nPlease refresh the page and try again, or contact support if the problem persists.`,
              {
                confirmButtonText: 'Refresh Page',
                allowOutsideClick: false
              }
            );
            window.location.reload();
          } else {
            // Show error with retry option
            const remainingAttempts = this.maxRetries - this.retryCount;
            await SweetAlert.error(
              'Registration Failed',
              `${errorMessage}\n\nYou have ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
              {
                confirmButtonText: 'Try Again'
              }
            );
            this.render(); // Update retry count display
          }        } finally {
          // Always ensure loading state is reset unless we're blocked or navigating away
          if (!this.isRetryBlocked) {
            this.setLoading(false);
          }
        }
      },

      resetRetries: (event) => {
        event.preventDefault();
        window.location.reload();
      },

      navigateToLogin: (event) => {
        event.preventDefault();
        this.eventBus.emit('router:navigate', '/login');
      },

      signUpWithGoogle: () => {
        this.eventBus.emit('auth:google-signup');
      },

      showTerms: (event) => {
        event.preventDefault();
        // TODO: Show terms modal
        console.log('Show terms of service');
      },

      showPrivacy: (event) => {
        event.preventDefault();
        // TODO: Show privacy policy modal
        console.log('Show privacy policy');
      }
    };
  }  /**
   * Set loading state
   * 
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.updateButtonState();
  }

  /**
   * Update button state based on current loading and retry status
   * 
   * @private
   */
  updateButtonState() {
    const submitBtn = this.element?.querySelector('button[type="submit"]');
    if (submitBtn) {
      const shouldDisable = this.isLoading || this.isRetryBlocked;
      submitBtn.disabled = shouldDisable;
      
      if (this.isRetryBlocked) {
        submitBtn.textContent = 'Registration Blocked';
      } else if (this.isLoading) {
        submitBtn.textContent = 'Creating Account...';
      } else {
        submitBtn.textContent = 'Create Account';
      }
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
        this.logger?.debug('Register component mounted');
        
        // Focus on first name field
        const firstNameField = this.element?.querySelector('#firstName');
        if (firstNameField) {
          firstNameField.focus();
        }
      },

      onUnmount: () => {
        this.logger?.debug('Register component unmounted');
      }
    };
  }
}
