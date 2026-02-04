let userauth;
let fdatabase;
let currentUser = null;
let authSection;
let onAuthStateChangedCallback = () => {};

// Initialize authentication module
function initAuth(firebaseAuth, firebaseDatabase, authContainerSelector) {
    return new Promise((resolve) => {
        console.log('Auth module initializing...');
        userauth = firebaseAuth;
        fdatabase = firebaseDatabase;
        authSection = document.querySelector(authContainerSelector);
        
        if (!authSection) {
            console.error('Auth container not found');
            authSection = document.createElement('section');
            authSection.className = 'auth-section';
            document.querySelector('.container').insertBefore(authSection, document.querySelector('main'));
            console.log('Created auth section dynamically');
        }
        
        // Set up auth state change listener
        userauth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                try {
                    // Check user role from database
                    const userRef = fdatabase.ref(`users/${user.uid}`);
                    const userSnapshot = await userRef.once('value');
                    
                    if (!userSnapshot.exists()) {
                        // First-time user, set as viewer by default
                        await userRef.set({
                            email: user.email,
                            role: 'viewer',
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                        
                        user.role = 'viewer';
                    } else {
                        user.role = userSnapshot.val().role || 'viewer';
                    }
                    
                    currentUser = user;
                    
                    // Show authenticated UI
                    showAuthenticatedUI(user);
                    
                    // Notify app.js about authentication change
                    onAuthStateChangedCallback(user);
                } catch (error) {
                    console.error('Error setting up user data:', error);
                    logoutUser();
                    Swal.fire({
                        icon: 'error',
                        title: 'Authentication Error',
                        text: 'Failed to load user data. Please try again.'
                    });
                }
            } else {
                // User is signed out
                currentUser = null;
                showLoginUI();
                
                // Notify app.js about authentication change
                onAuthStateChangedCallback(null);
            }
            // Resolve the promise when auth state is first determined
            resolve();
        });
    });
}

// Set callback for auth state changes
function setAuthStateChangedCallback(callback) {
    if (typeof callback === 'function') {
        onAuthStateChangedCallback = callback;
    }
}

// Show login UI
function showLoginUI() {
    // Hide the initial loading spinner when showing login UI
    const spinner = document.getElementById('initial-loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
        setTimeout(() => {
            if (spinner.parentNode) {
                spinner.remove();
            }
        }, 300);
    }

    if (!authSection) return;
    
    authSection.innerHTML = `
        <div class="card">
            <h2>Login to Contribution Manager</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn">Login</button>
                    <button type="button" id="signup-toggle" class="btn btn-secondary">Create Account</button>
                </div>
            </form>
            
            <form id="signup-form" style="display: none;">
                <h2>Create a New Account</h2>
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <input type="email" id="signup-email" required>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" required>
                </div>
                <div class="form-group">
                    <label for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn">Create Account</button>
                    <button type="button" id="login-toggle" class="btn btn-secondary">Return to Login</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    
    document.getElementById('signup-toggle').addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });
    
    document.getElementById('login-toggle').addEventListener('click', () => {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });
}

// Show authenticated UI
function showAuthenticatedUI(user) {
    // Hide the initial loading spinner when authenticated user is shown
    const spinner = document.getElementById('initial-loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
        setTimeout(() => {
            if (spinner.parentNode) {
                spinner.remove();
            }
        }, 300);
    }

    if (!authSection) return;

    let adminButton = '';
    if (user.role === 'admin') {
        adminButton = '<button id="admin-dashboard-btn" class="btn btn-small"><i class="fas fa-user-shield"></i> Admin</button>';
    }
    
    authSection.innerHTML = `
        <div class="user-info">
            <div class="user-details">
                <i class="fas fa-user-circle"></i>
                <span class="user-email">${sanitizeHTML(user.email)}</span>
                <span class="user-role-badge">${user.role}</span>
            </div>
            <div class="user-actions">
                ${adminButton}
                <button id="logout-btn" class="btn btn-small"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    
    if (user.role === 'admin') {
        document.getElementById('admin-dashboard-btn').addEventListener('click', showAdminDashboard);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Login Error',
            text: 'Please enter both email and password'
        });
        return;
    }
    
    try {
        Swal.fire({
            title: 'Logging In...',
            didOpen: () => {
                Swal.showLoading();
            },
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });

        await userauth.signInWithEmailAndPassword(email, password);
        Swal.close();
    } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: getAuthErrorMessage(error)
        });
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
    if (!email || !password || !confirm) {
        Swal.fire({
            icon: 'error',
            title: 'Registration Error',
            text: 'Please fill in all fields'
        });
        return;
    }
    
    if (password !== confirm) {
        Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: 'Passwords do not match'
        });
        return;
    }
    
    if (password.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Password Too Short',
            text: 'Password must be at least 6 characters'
        });
        return;
    }
    
    try {
        Swal.fire({
            title: 'Creating Account...',
            didOpen: () => {
                Swal.showLoading();
            },
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });
        
        await userauth.createUserWithEmailAndPassword(email, password);
        Swal.close();
    } catch (error) {
        console.error('Signup error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: getAuthErrorMessage(error)
        });
    }
}

// Log out the current user
function logoutUser() {
    userauth.signOut().catch(error => {
        console.error('Logout error:', error);
    });
}

// Get readable auth error messages
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No account exists with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'This email is already registered';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-email':
            return 'Invalid email format';
        default:
            return `Error: ${error.message}`;
    }
}

// Show admin dashboard
function showAdminDashboard() {
    // Navigate to admin dashboard page
    // The admin-dashboard.js will verify admin role on that page
    window.location.href = 'admin-dashboard.html';
}

// Load user list for admin dashboard
async function loadUserList() {
    try {
        const usersRef = fdatabase.ref('users');
        const usersSnapshot = await usersRef.once('value');
        const users = usersSnapshot.val();
        
        if (!users) {
            document.getElementById('user-list').innerHTML = '<p>No users found</p>';
            return;
        }
        
        let userTable = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const uid in users) {
            if (!Object.prototype.hasOwnProperty.call(users, uid)) continue;
            
            const user = users[uid];
            userTable += `
                <tr>
                    <td>${sanitizeHTML(user.email)}</td>
                    <td>
                        <select class="role-select" data-uid="${uid}">
                            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                            <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-small save-role" data-uid="${uid}">Save</button>
                    </td>
                </tr>
            `;
        }
        
        userTable += `
                </tbody>
            </table>
        `;
        
        document.getElementById('user-list').innerHTML = userTable;
        
        // Add event listeners
        for(const btn of document.querySelectorAll('.save-role')) {
            btn.addEventListener('click', updateUserRole);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('user-list').innerHTML = '<p>Error loading users</p>';
    }
}

// Update user role
async function updateUserRole(e) {
    const uid = e.target.dataset.uid;
    const roleSelect = document.querySelector(`.role-select[data-uid="${uid}"]`);
    const newRole = roleSelect.value;
    
    try {
        await fdatabase.ref(`users/${uid}/role`).set(newRole);
        Swal.fire({
            icon: 'success',
            title: 'Role Updated',
            text: 'User role has been updated successfully',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } catch (error) {
        console.error('Error updating role:', error);
        Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'Failed to update user role'
        });
    }
}

// Check if user is authenticated
function isUserAuthenticated() {
    return currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Get user role
function getUserRole() {
    return currentUser?.role || 'viewer';
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for use in app.js
window.AuthModule = {
    initAuth,
    setAuthStateChangedCallback,
    isUserAuthenticated,
    getCurrentUser,
    getUserRole,
    logoutUser,
    sanitizeHTML
};
