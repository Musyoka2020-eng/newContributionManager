// Firebase Manager Module
// Handles all Firebase initialization and data operations

const FirebaseManager = (function() {
    // Get Firebase configuration
    // In multi-tenant mode: injected by OrganizationAdapter
    // In standalone mode: use hardcoded fallback
    let database;
    let auth;
    
    if (typeof window !== 'undefined' && window.orgFirebaseConfig) {
        // Multi-tenant mode: use injected organization-specific config
        try {
            const appName = `org_${window.orgSlug}`;
            
            // Try to get existing app instance
            const existingApp = firebase.app(appName);
            database = firebase.database(existingApp);
            auth = firebase.auth(existingApp);
            console.log('Using existing Firebase app for organization:', window.orgSlug);
        } catch (error) {
            // App doesn't exist, initialize it
            const firebaseConfig = window.orgFirebaseConfig;
            const firebaseApp = firebase.initializeApp(firebaseConfig, `org_${window.orgSlug}`);
            database = firebase.database(firebaseApp);
            auth = firebase.auth(firebaseApp);
            console.log('Initialized Firebase app for organization:', window.orgSlug);
        }
    } else {
        // Standalone mode: use hardcoded config
        const firebaseConfig = {
            apiKey: "AIzaSyB2JTsgg7CUjKKSLctAckWw0KeMcxXurfA",
            authDomain: "contribution-manager-8fe43.firebaseapp.com",
            databaseURL: "https://contribution-manager-8fe43-default-rtdb.firebaseio.com",
            projectId: "contribution-manager-8fe43",
            storageBucket: "contribution-manager-8fe43.firebasestorage.app",
            messagingSenderId: "831746937132",
            appId: "1:831746937132:web:35012b0a37bfdf09a1dc89",
            measurementId: "G-H73KB8R7XZ"
        };
        
        try {
            const defaultApp = firebase.app();
            database = firebase.database(defaultApp);
            auth = firebase.auth(defaultApp);
            console.log('Using existing Firebase initialization (standalone mode)');
        } catch (error) {
            // Firebase not initialized yet, initialize it
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            auth = firebase.auth();
            console.log('Initialized Firebase with hardcoded config (standalone mode)');
        }
    }

    let lastSyncTime = null;

    // Public API
    return {
        getDatabase: () => database,
        getAuth: () => auth,
        getLastSyncTime: () => lastSyncTime,
        setLastSyncTime: (time) => { lastSyncTime = time; },

        // Load data from Firebase (all data types in single operation)
        async loadData() {
            try {
                Swal.fire({
                    title: 'Loading data...',
                    didOpen: () => { Swal.showLoading(); },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false
                });

                if (!AuthModule.isUserAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const currentUserUID = AuthModule.getCurrentUser()?.uid;

                const [contributionsSnapshot, blacklistSnapshot, lastSyncSnapshot, budgetsSnapshot, campaignsSnapshot] = await Promise.all([
                    database.ref('contributionsData').once('value'),
                    database.ref('blacklistData').once('value'),
                    database.ref('meta/lastSync').once('value'),
                    currentUserUID ? database.ref(`budgets/${currentUserUID}`).once('value') : Promise.resolve(null),
                    database.ref('specialGiving').once('value')
                ]);

                const contributionsData = contributionsSnapshot.val() || {};
                const blacklistData = blacklistSnapshot.val() || { blacklistedMembers: [] };
                const budgetData = budgetsSnapshot ? (budgetsSnapshot.val() || { expenses: {} }) : { expenses: {} };
                const campaignsData = campaignsSnapshot.val() || {};
                lastSyncTime = lastSyncSnapshot.val() || null;

                Swal.close();
                return { contributionsData, blacklistData, budgetData, campaignsData, lastSyncTime };
            } catch (error) {
                console.error('Error loading data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Data Loading Error',
                    text: error.message || 'Could not load contribution data.'
                });
                return {
                    contributionsData: {},
                    blacklistData: { blacklistedMembers: [] },
                    budgetData: { expenses: {} },
                    campaignsData: {},
                    lastSyncTime: null
                };
            }
        },

        // Save data to Firebase with debounce (supports contributions, blacklist, budget, and campaigns)
        async saveData(contributionsData, blacklistData, budgetData = null, campaignsData = null, showNotification = false) {
            try {
                if (!AuthModule.isUserAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const userRole = AuthModule.getUserRole();
                if (userRole === 'viewer') {
                    throw new Error('You do not have permission to save changes');
                }

                const currentUserUID = AuthModule.getCurrentUser()?.uid;

                // Save to localStorage as backup
                localStorage.setItem('contributionsData', JSON.stringify(contributionsData));
                localStorage.setItem('blacklistData', JSON.stringify(blacklistData));

                // Save to Firebase
                await database.ref('contributionsData').set(this.validateContributionsData(contributionsData));

                if (userRole === 'admin') {
                    await database.ref('blacklistData').set(this.validateBlacklistData(blacklistData));
                }

                // Save budget data if provided
                if (budgetData && currentUserUID) {
                    await database.ref(`budgets/${currentUserUID}`).set(budgetData);
                }

                // Save campaigns data if provided
                if (campaignsData) {
                    await database.ref('specialGiving').set(campaignsData);
                }

                lastSyncTime = new Date().getTime();
                await database.ref('meta/lastSync').set(lastSyncTime);
                localStorage.setItem('lastSyncTime', lastSyncTime);

                if (showNotification) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: 'Your changes have been saved to Firebase.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }

                return true;
            } catch (error) {
                console.error('Error saving data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Save Error',
                    text: error.message || 'Failed to save data.'
                });
                return false;
            }
        },

        // Sync data with Firebase
        async syncData(contributionsData, blacklistData) {
            try {
                Swal.fire({
                    title: 'Syncing data...',
                    didOpen: () => { Swal.showLoading(); },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false
                });

                await database.ref('contributionsData').set(contributionsData);
                await database.ref('blacklistData').set(blacklistData);

                lastSyncTime = new Date().getTime();
                await database.ref('meta/lastSync').set(lastSyncTime);

                Swal.fire({
                    icon: 'success',
                    title: 'Sync Complete',
                    text: 'Your data has been synchronized with Firebase.',
                    timer: 2000,
                    showConfirmButton: false
                });

                return lastSyncTime;
            } catch (error) {
                console.error('Error syncing data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Sync Error',
                    text: 'Failed to sync data with Firebase.'
                });
                return null;
            }
        },

        // Validate contributions data
        validateContributionsData(data) {
            const validData = JSON.parse(JSON.stringify(data));

            for (const year in validData) {
                if (!validData.hasOwnProperty(year)) continue;

                if (!/^\d{4}$/.test(year)) {
                    delete validData[year];
                    continue;
                }

                for (const month in validData[year]) {
                    if (!validData[year].hasOwnProperty(month)) continue;

                    const validMonths = moment.months();
                    if (!validMonths.includes(month)) {
                        delete validData[year][month];
                        continue;
                    }

                    if (!Array.isArray(validData[year][month].contributions)) {
                        validData[year][month].contributions = [];
                    }

                    validData[year][month].contributions = validData[year][month].contributions.filter(c => {
                        return c && typeof c.name === 'string' &&
                            typeof c.amount === 'number' &&
                            typeof c.paid === 'boolean';
                    });

                    let total = 0;
                    for (const contribution of validData[year][month].contributions) {
                        total += contribution.amount;
                    }
                    validData[year][month].total = total;
                }
            }

            return validData;
        },

        // Validate blacklist data
        validateBlacklistData(data) {
            if (!data || !Array.isArray(data.blacklistedMembers)) {
                return { blacklistedMembers: [] };
            }

            const validMembers = data.blacklistedMembers.filter(name =>
                typeof name === 'string' && name.trim().length > 0
            );

            return { blacklistedMembers: validMembers };
        }
    };
})();
