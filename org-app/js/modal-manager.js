// Modal Manager Module
// Handles modal dialog functionality for the application

const ModalManager = (function() {
    let modal = null;
    let openButton = null;
    let closeButtons = [];

    return {
        // Initialize modal functionality
        init() {
            modal = document.getElementById('contribution-modal');
            openButton = document.getElementById('add-contribution-btn');
            
            const closeBtn = document.getElementById('modal-close-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            
            if (closeBtn) closeButtons.push(closeBtn);
            if (cancelBtn) closeButtons.push(cancelBtn);

            // Set up event listeners
            if (openButton) {
                openButton.addEventListener('click', () => this.open());
            }

            closeButtons.forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => this.close());
                }
            });

            // Close modal when clicking outside
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close();
                    }
                });
            }

            // Close modal on ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.close();
                }
            });
        },

        // Open the modal
        open() {
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
                
                // Focus on first input
                const firstInput = modal.querySelector('input:not([type="checkbox"])');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        },

        // Close the modal
        close() {
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
                
                // Clear form fields
                const form = document.getElementById('contribution-form');
                if (form) {
                    form.reset();
                    // Reset the "Mark as Paid" checkbox to checked by default
                    const paidCheckbox = document.getElementById('contribution-paid');
                    if (paidCheckbox) {
                        paidCheckbox.checked = true;
                    }
                }
            }
        },

        // Check if modal is open
        isOpen() {
            return modal && modal.classList.contains('active');
        },

        // Close modal after form submission
        closeAfterSubmit() {
            this.close();
        }
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
