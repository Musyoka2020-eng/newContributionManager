/**
 * SweetAlert2 Utility
 * 
 * Wrapper for SweetAlert2 to ensure it's available and provide consistent styling
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2025-06-14
 */

/**
 * Wait for SweetAlert2 to be available
 * @returns {Promise<void>}
 */
function waitForSwal() {
  return new Promise((resolve, reject) => {
    console.log('Waiting for SweetAlert2 to load...');
    
    if (typeof window.Swal !== 'undefined') {
      console.log('SweetAlert2 is already available');
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time
    
    const checkSwal = () => {
      attempts++;
      console.log(`Checking for SweetAlert2, attempt ${attempts}/${maxAttempts}`);
      
      if (typeof window.Swal !== 'undefined') {
        console.log('SweetAlert2 loaded successfully');
        resolve();
      } else if (attempts >= maxAttempts) {
        console.error('SweetAlert2 failed to load after 5 seconds');
        reject(new Error('SweetAlert2 failed to load'));
      } else {
        setTimeout(checkSwal, 100);
      }
    };
    
    checkSwal();
  });
}

/**
 * SweetAlert2 wrapper with consistent styling
 */
export class SweetAlert {  static async fire(options) {
    try {
      console.log('SweetAlert.fire called with options:', options);
      await waitForSwal();
      
      // Default styling for the app
      const defaultOptions = {
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          content: 'swal-custom-content',
          confirmButton: 'swal-custom-confirm',
          cancelButton: 'swal-custom-cancel'
        },
        buttonsStyling: false
      };
      
      const result = window.Swal.fire({
        ...defaultOptions,
        ...options
      });
      
      console.log('SweetAlert dialog opened successfully');
      return result;
    } catch (error) {
      console.error('Error in SweetAlert.fire:', error);
      // Fallback: use browser alert
      alert(`${options.title || 'Alert'}: ${options.text || ''}`);
      return { isConfirmed: true };
    }
  }
  
  static async success(title, text = '', options = {}) {
    return this.fire({
      icon: 'success',
      title,
      text,
      ...options
    });
  }
  
  static async error(title, text = '', options = {}) {
    return this.fire({
      icon: 'error',
      title,
      text,
      ...options
    });
  }
  
  static async warning(title, text = '', options = {}) {
    return this.fire({
      icon: 'warning',
      title,
      text,
      ...options
    });
  }
  
  static async info(title, text = '', options = {}) {
    return this.fire({
      icon: 'info',
      title,
      text,
      ...options
    });
  }
  
  static async confirm(title, text = '', options = {}) {
    return this.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      ...options
    });
  }
}

export default SweetAlert;
