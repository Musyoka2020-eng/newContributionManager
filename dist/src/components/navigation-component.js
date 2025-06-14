/**
 * Navigation Component
 * 
 * This component handles the main navigation for the Universal Contribution Manager.
 * It provides responsive navigation with authentication state awareness, theme switching,
 * and mobile-friendly hamburger menu.
 * 
 * Features:
 * - Responsive design with mobile hamburger menu
 * - Authentication state awareness
 * - Theme switching
 * - Active route highlighting
 * - User profile dropdown
 * - Role-based navigation items
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2024-06-14
 */

import { BaseComponent } from './base-component.js';

/**
 * Navigation Component
 * 
 * Manages the main application navigation with authentication awareness
 */
export class NavigationComponent extends BaseComponent {
    /**
     * Create a new NavigationComponent
     * 
     * @param {HTMLElement} container - Navigation container element
     * @param {Object} options - Component options
     * @param {string} options.currentRoute - Current active route
     * @param {boolean} options.showThemeToggle - Whether to show theme toggle button
     */    constructor(eventBus, props = {}) {
        super(eventBus, {
            name: 'NavigationComponent',
            ...props,
            currentRoute: props.currentRoute || '/',
            showThemeToggle: props.showThemeToggle !== false
        });

        // Component state
        this.state = {
            isAuthenticated: false,
            user: null,
            userRole: null,
            mobileMenuOpen: false,
            userMenuOpen: false,
            currentTheme: this.getCurrentTheme()
        };

        // Navigation items configuration
        this.navigationItems = this.getNavigationItems();
    }    /**
     * Component initialization
     */
    async onInit() {
        // Subscribe to authentication state changes
        this.subscribe('auth:stateChanged', this.handleAuthStateChange.bind(this));
        this.subscribe('route:changed', this.handleRouteChange.bind(this));

        // Check current authentication state using the authService instance
        if (this.props.authService) {
            const user = await this.props.authService.getCurrentUser();
            // Format as expected by handleAuthStateChange
            this.handleAuthStateChange({ user });
        }
    }

    /**
     * Override init to skip setupEventListeners during initialization
     */
    async init() {
        try {
            this.logger.debug('Initializing component');
            
            // Validate component properties
            await this.validateProps();
            
            // Setup component-specific initialization
            await this.onInit();
            
            // Don't call setupEventListeners here - will be called in onMount
            
            this.isInitialized = true;
            this.logger.info('Component initialized successfully', { name: this.name, props: this.props });
            
        } catch (error) {
            this.handleError(error, 'Component initialization failed');
            throw error;
        }
    }

    /**
     * Called after component is mounted to DOM
     */
    onMount() {
        // Setup event listeners after HTML is rendered
        this.setupEventListeners();
    }

    /**
     * Setup component event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        this.addEventListener('.nav-mobile-toggle', 'click', this.toggleMobileMenu.bind(this));

        // User menu toggle
        this.addEventListener('.nav-user-toggle', 'click', this.toggleUserMenu.bind(this));

        // Theme toggle
        this.addEventListener('.theme-toggle', 'click', this.toggleTheme.bind(this));

        // Theme selector
        this.addEventListener('.theme-selector', 'change', this.handleThemeChange.bind(this));

        // Navigation links
        this.addEventListener('.nav-link', 'click', this.handleNavClick.bind(this));

        // Logout button
        this.addEventListener('.logout-btn', 'click', this.handleLogout.bind(this));

        // Close menus when clicking outside
        document.addEventListener('click', this.handleOutsideClick.bind(this));

        // Close mobile menu on window resize
        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }    /**
     * Generate navigation HTML
     */
    getHTML() {
        const { isAuthenticated, user, mobileMenuOpen, userMenuOpen, currentTheme } = this.state;
        const { currentRoute, showThemeToggle } = this.props;

        return `
            <nav class="navigation">
                <div class="nav-container">
                    <!-- Brand -->
                    <div class="nav-brand">
                        <div class="nav-brand-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <span>UCM</span>
                    </div>

                    <!-- Mobile Toggle -->
                    <button class="nav-mobile-toggle" aria-label="Toggle navigation menu">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>

                    <!-- Navigation Menu -->
                    <div class="nav-menu ${mobileMenuOpen ? 'show' : ''}">
                        ${this.renderNavigationItems(currentRoute)}
                        
                        <!-- Theme Toggle -->
                        ${showThemeToggle ? this.renderThemeToggle(currentTheme) : ''}
                        
                        <!-- User Section -->
                        ${isAuthenticated ? this.renderUserSection(user, userMenuOpen) : this.renderAuthLinks()}
                    </div>
                </div>
            </nav>
        `;
    }

    /**
     * Render navigation items based on authentication state and user role
     */
    renderNavigationItems(currentRoute) {
        const { isAuthenticated, userRole } = this.state;
        
        return this.navigationItems
            .filter(item => this.shouldShowNavItem(item, isAuthenticated, userRole))
            .map(item => `
                <a href="${item.path}" 
                   class="nav-link ${currentRoute === item.path ? 'active' : ''}" 
                   data-route="${item.path}">
                    ${item.icon ? `<span class="nav-icon">${item.icon}</span>` : ''}
                    <span>${item.label}</span>
                </a>
            `).join('');
    }

    /**
     * Render theme toggle button or selector
     */
    renderThemeToggle(currentTheme) {
        return `
            <div class="theme-switcher">
                <button class="theme-toggle" 
                        aria-label="Toggle theme" 
                        title="Switch theme">
                    <svg class="theme-icon theme-icon-light" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                    </svg>
                    <svg class="theme-icon theme-icon-dark" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    </svg>
                </button>
                
                <select class="theme-selector" aria-label="Select theme">
                    <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
                    <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                    <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>Auto</option>
                </select>
            </div>
        `;
    }

    /**
     * Render user section with profile dropdown
     */
    renderUserSection(user, userMenuOpen) {
        const displayName = user?.displayName || user?.email || 'User';
        const avatar = user?.photoURL || null;

        return `
            <div class="nav-user">
                <button class="nav-user-toggle" aria-label="User menu">
                    ${avatar ? 
                        `<img src="${avatar}" alt="${displayName}" class="nav-user-avatar">` :
                        `<div class="nav-user-avatar">${displayName.charAt(0).toUpperCase()}</div>`
                    }
                    <span class="nav-user-name">${displayName}</span>
                    <svg class="nav-user-arrow" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
                
                ${userMenuOpen ? this.renderUserMenu(user) : ''}
            </div>
        `;
    }

    /**
     * Render user dropdown menu
     */
    renderUserMenu(user) {
        return `
            <div class="nav-user-menu">
                <div class="nav-user-menu-header">
                    <div class="nav-user-info">
                        <div class="nav-user-name">${user?.displayName || 'User'}</div>
                        <div class="nav-user-email">${user?.email || ''}</div>
                    </div>
                </div>
                
                <div class="nav-user-menu-items">
                    <a href="/profile" class="nav-user-menu-item">
                        <svg class="nav-user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                        </svg>
                        Profile
                    </a>
                    
                    <a href="/settings" class="nav-user-menu-item">
                        <svg class="nav-user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                        Settings
                    </a>
                </div>
                
                <div class="nav-user-menu-footer">
                    <button class="logout-btn nav-user-menu-item">
                        <svg class="nav-user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/>
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render authentication links for non-authenticated users
     */
    renderAuthLinks() {
        return `
            <div class="nav-auth">
                <a href="/login" class="nav-link">Sign In</a>
                <a href="/register" class="btn btn-primary btn-sm">Sign Up</a>
            </div>
        `;
    }    /**
     * Get component template (alias for getHTML for compatibility)
     */
    getTemplate() {
        return this.getHTML();
    }// ===========================
    // Event Handlers
    // ===========================

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(authState) {
        // Handle null or undefined authState
        const user = authState?.user || null;
        
        this.setState({
            isAuthenticated: !!user,
            user: user,
            userRole: user?.role || null
        });
    }

    /**
     * Handle route changes
     */
    handleRouteChange(routeData) {
        this.updateProps({ currentRoute: routeData.path });
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        this.setState({
            mobileMenuOpen: !this.state.mobileMenuOpen,
            userMenuOpen: false // Close user menu when opening mobile menu
        });
    }

    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        this.setState({
            userMenuOpen: !this.state.userMenuOpen,
            mobileMenuOpen: false // Close mobile menu when opening user menu
        });
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.state.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        this.setTheme(newTheme);
    }

    /**
     * Handle theme selector change
     */
    handleThemeChange(event) {
        const newTheme = event.target.value;
        this.setTheme(newTheme);
    }

    /**
     * Handle navigation link clicks
     */
    handleNavClick(event) {
        const link = event.target.closest('.nav-link');
        if (!link) return;

        const route = link.dataset.route;
        if (route) {
            event.preventDefault();
            this.emit('navigation:routeRequested', { path: route });
            
            // Close mobile menu
            this.setState({ mobileMenuOpen: false });
        }
    }    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            if (this.props.authService) {
                await this.props.authService.signOut();
            }
            this.setState({ userMenuOpen: false });
            this.emit('navigation:routeRequested', { path: '/login' });
        } catch (error) {
            this.handleError(error, 'Logout failed');
        }
    }

    /**
     * Handle clicks outside of menus
     */
    handleOutsideClick(event) {
        if (!this.container.contains(event.target)) {
            this.setState({
                mobileMenuOpen: false,
                userMenuOpen: false
            });
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Close mobile menu on desktop
        if (window.innerWidth >= 768) {
            this.setState({ mobileMenuOpen: false });
        }
    }

    // ===========================
    // Helper Methods
    // ===========================

    /**
     * Get navigation items configuration
     */
    getNavigationItems() {
        return [
            {
                label: 'Dashboard',
                path: '/dashboard',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>',
                authRequired: true
            },
            {
                label: 'Organizations',
                path: '/organizations',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
                authRequired: true
            },
            {
                label: 'Contributions',
                path: '/contributions',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>',
                authRequired: true
            },
            {
                label: 'Members',
                path: '/members',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>',
                authRequired: true,
                roles: ['admin', 'manager']
            },
            {
                label: 'Reports',
                path: '/reports',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>',
                authRequired: true,
                roles: ['admin', 'manager']
            },
            {
                label: 'Admin',
                path: '/admin',
                icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
                authRequired: true,
                roles: ['admin']
            }
        ];
    }

    /**
     * Check if navigation item should be shown
     */
    shouldShowNavItem(item, isAuthenticated, userRole) {
        // Check authentication requirement
        if (item.authRequired && !isAuthenticated) {
            return false;
        }

        // Check role requirement
        if (item.roles && (!userRole || !item.roles.includes(userRole))) {
            return false;
        }

        return true;
    }

    /**
     * Get current theme from localStorage or system preference
     */
    getCurrentTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            return savedTheme;
        }

        return 'auto';
    }

    /**
     * Set theme and save to localStorage
     */
    setTheme(theme) {
        // Validate theme
        if (!['light', 'dark', 'auto'].includes(theme)) {
            theme = 'auto';
        }

        // Update state
        this.setState({ currentTheme: theme });

        // Save to localStorage
        localStorage.setItem('theme', theme);

        // Apply theme to document
        this.applyTheme(theme);

        // Emit theme change event
        this.emit('theme:changed', { theme });

        this.logger.info('Theme changed', { theme });
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        const documentElement = document.documentElement;

        if (theme === 'auto') {
            // Use system preference
            documentElement.removeAttribute('data-theme');
        } else {
            // Use explicit theme
            documentElement.setAttribute('data-theme', theme);
        }
    }

    /**
     * Component cleanup
     */
    onDestroy() {
        // Remove global event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        window.removeEventListener('resize', this.handleWindowResize);
    }

    /**
     * Get component methods for event binding
     */
    getMethods() {
        return {
            toggleMobileMenu: this.toggleMobileMenu.bind(this),
            toggleUserMenu: this.toggleUserMenu.bind(this),
            toggleTheme: this.toggleTheme.bind(this),
            handleThemeChange: this.handleThemeChange.bind(this),
            handleNavClick: this.handleNavClick.bind(this),
            handleLogout: this.handleLogout.bind(this)
        };
    }

    /**
     * Get component lifecycle methods
     */
    getLifecycle() {
        return {
            onMount: this.onMount.bind(this),
            onUnmount: this.onDestroy.bind(this)
        };
    }
}
