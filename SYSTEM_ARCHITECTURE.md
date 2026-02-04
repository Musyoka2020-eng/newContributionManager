# Multi-Tenant Contribution Manager System Architecture

## Overview

This is a **two-tier multi-tenant SaaS architecture** where:
- **Super Admin Level**: Manages organization creation (dev-only, no public signup)
- **Organization Level**: End-users login and work with their organization's contribution data

Each organization is completely isolated with its own database, and users can never access or modify the central database.

---

## System Tiers

### **Tier 1: Super Admin** (`/superadmin/`)

**Purpose:** Developer-only organization management

**Access:**
- `/superadmin/login.html` - Email/password login
- `/superadmin/dashboard.html` - Create, view, and manage organizations

**Authentication:** Central Firebase (`universal-contribution-manager`)

**Capabilities:**
- Create new organizations
- Provide org-specific Firebase credentials
- View all organizations
- Delete organizations

**Database:** Central Firebase (read/write)

---

### **Tier 2: Organization** (`/organizations/{slug}/`)

**Purpose:** End-user contribution management

**Access:**
- `/organizations/{slug}/` - Loads organization-specific app
- Organization users login/signup here
- Cannot see or access other organizations

**Authentication:** Organization's own Firebase

**Capabilities:**
- User login/signup
- Manage contributions
- View reports
- Budget management
- Special giving campaigns
- Blacklist management
- Settings

**Database:** Organization's own Firebase project

---

## Setup Types

### **Organization Setup** (Each org has its own Firebase project)

```
Central Firebase
└── organizations/{slug}/ → Only org metadata
    ├── name
    ├── slug
    └── firebaseConfig (the org's Firebase credentials)

Organization's Own Firebase Project
├── contributions/
├── budget/
├── users/ (members)
├── reports/
└── (all org-specific data)
```

**How it works:** 
- Super admin provides Firebase credentials when creating an org
- Central DB stores only the metadata and those credentials
- Organization users work entirely in their own Firebase project
- Central DB doesn't know or care about org data

---

**Central DB ONLY stores:**
- Organization name
- Organization slug
- Organization's Firebase config (apiKey, authDomain, projectId, etc.)

**Central DB DOES NOT have:**
- Any organization data (contributions, budgets, reports, etc.)
- Members/users
- User roles or permissions within org
- Any organization-level settings or configuration

## User Flow

### **A. Super Admin Creates Organization**

```
1. Super Admin logs into /superadmin/login.html
   ↓
2. Authenticates with central Firebase
   ↓
3. Super Admin visits /superadmin/dashboard.html
   ↓
4. Fills in organization form:
   - Organization Name
   - Admin Email
   - Admin Password
   - Paste Firebase config (from Firebase Console)
   ↓
5. SuperAdminService creates organization:
   a) Saves org metadata to central database
   b) Stores Firebase config with org metadata
   c) Creates admin user in org's own Firebase
   ↓
6. Organization is now active and users can access it
```

### **B. End User Accesses Organization**

```
1. User visits /organizations/{slug}/
   ↓
2. pages/organization.html loads:
   a) Initializes central Firebase
   b) Loads HTML structure from /org-app/index.html
   c) Runs OrganizationAdapter
   ↓
3. OrganizationAdapter executes:
   a) Loads organization metadata from central DB
   b) Gets org's Firebase config from central DB
   c) Injects Firebase config into window.orgFirebaseConfig
   d) Dynamically loads /org-app/* scripts
   ↓
4. /org-app/js/firebase-manager.js initializes:
   - Uses org's own Firebase config (from window.orgFirebaseConfig)
   ↓
5. /org-app/js/auth.js displays login/signup form
   ↓
6. User logs in/signs up to organization's Firebase project
   ↓
7. User works in contribution manager with org-specific data
```

---

## Data Isolation

### **Central Database Scope**

Central DB stores ONLY organization metadata:
- Organization name, slug, firebase config
- Member email list for that org

Organization users **READ** only their org's metadata (to know it exists, get config, etc.)

Organization users **NEVER WRITE** to central DB (it's read-only for them)

### **Organization's Own Firebase Project**

All user-generated data stays entirely in the organization's own Firebase project:
- Contributions
- Members/users
- Reports
- Budgets
- Settings
- Everything else

Central DB knows NOTHING about this data. It's completely separate.

---

## File Structure

```
newContributionManager/
├── config-central.js                 # Central Firebase config
├── index.html                        # Redirect to super admin
│
├── pages/
│   ├── organization.html             # Entry point for org users
│   └── superadmin/
│       ├── login.html                # Super admin login
│       └── dashboard.html            # Org management
│
├── js/
│   ├── core/
│   │   ├── organization-router.js    # Routes /organizations/{slug}
│   │   └── superadmin-router.js      # Routes /superadmin/*
│   │
│   ├── services/
│   │   ├── org-manager.js            # Current org context
│   │   ├── org-loader.js             # Load orgs from central DB
│   │   ├── auth-service.js           # Universal auth
│   │   └── super-admin-service.js    # Create/manage orgs
│   │
│   ├── adapters/
│   │   └── organization-adapter.js   # Injects org config & loads org-app
│   │
│   └── pages/
│       ├── superadmin-login.js       # Login logic
│       └── superadmin-dashboard.js   # Dashboard logic
│
├── css/
│   ├── global.css                    # Global styles
│   ├── auth.css                      # Auth pages
│   ├── admin.css                     # Admin dashboard
│   └── organization.css              # Org app container
│
└── org-app/                          # Organization-specific contribution manager
    ├── index.html                    # Structure (loaded dynamically)
    ├── css/                          # Org-specific styles
    └── js/
        ├── firebase-manager.js       # Dynamic Firebase config
        ├── auth.js                   # Login/signup/roles
        ├── app.js                    # Main app logic
        └── ... (all modules)
```

---

## Technical Implementation Details

### **Step 1: Super Admin Creates Organization**

**File:** `js/pages/superadmin-dashboard.js`

```javascript
// User submits form with:
// - orgName, adminEmail, adminPassword, firebaseConfig

// Super admin provides Firebase config from their Firebase Console
await SuperAdminService.createOrganization(
  orgName,
  firebaseConfig,  // {apiKey, authDomain, databaseURL, projectId, ...}
  adminEmail,
  adminPassword
);
```

Result: Organization metadata (including Firebase config) saved in central DB

---

### **Step 2: Organization Router Loads Organization**

**File:** `js/core/organization-router.js`

```javascript
// Extract slug from URL: /organizations/myorg/
const slug = extractOrgSlugFromURL();

// Load org metadata from central DB (including its Firebase config)
const org = await orgManager.loadOrganization(slug);

// Initialize adapter with org metadata
await organizationAdapter.initializeOrganization(org, centralDatabase);
```

---

### **Step 3: Organization Adapter Injects Config**

**File:** `js/adapters/organization-adapter.js`

```javascript
// Before loading org-app scripts, inject org's Firebase config globally
injectFirebaseConfig(org.firebaseConfig, org) {
  window.orgSlug = org.slug;
  window.orgFirebaseConfig = org.firebaseConfig;  // Org's own Firebase credentials
}

// Load org-app scripts
await loadOrganizationScripts();
```

---

### **Step 4: Organization App Detects Configuration**

**File:** `org-app/js/firebase-manager.js`

```javascript
if (window.orgFirebaseConfig) {
  // Initialize separate Firebase app for this organization
  const appName = `org_${window.orgSlug}`;
  const firebaseApp = firebase.initializeApp(window.orgFirebaseConfig, appName);
  database = firebase.database(firebaseApp);
  auth = firebase.auth(firebaseApp);
}
```

---

### **Step 5: Organization App Authenticates**

**File:** `org-app/js/auth.js`

```javascript
// User logs in with email/password
await firebaseAuth.signInWithEmailAndPassword(email, password);

// Auth happens against the ORGANIZATION'S OWN Firebase project
// User can only access their organization's data
```

---

## Security Model

### **Authentication Levels**

1. **Super Admin** - Central Firebase, role: 'superadmin'
2. **Organization User** - Organization's Firebase, role: 'admin'/'viewer'

### **Database Access Control**

1. **Central DB** - Organization users have read-only access to their org metadata
2. **Organization DB** - Organization users have full read/write access
3. **Other Org Data** - No access (different Firebase project or database path)

### **URL Security**

1. Slug-based routing: `/organizations/{slug}/`
2. Invalid slugs redirect to error page
3. Super admin only: `/superadmin/` routes check authentication

---

## Multi-Organization User Scenario

**Example:** John works for both Organization A and Organization B

```
Central DB stores:
- users/john-uid/organizations: {slugA: 'admin', slugB: 'viewer'}

Flow when John visits /organizations/slugA/:
1. Organization Router loads slugA organization
2. OrganizationAdapter injects slugA's Firebase config
3. John logs in with his credentials to slugA's Firebase
4. John sees and edits slugA's data

Flow when John visits /organizations/slugB/:
1. Organization Router loads slugB organization
2. OrganizationAdapter injects slugB's Firebase config
3. John logs in with his credentials to slugB's Firebase
4. John sees and edits slugB's data (read-only if viewer)
```

---

## Future Enhancements

1. **Organization-level permissions** - Grant users different roles per org
2. **Organization settings** - Allow admins to edit logo, branding
3. **Organization dashboard** - Analytics per organization
4. **API access** - Backend API for org management
5. **Organization invites** - Users invite others to organizations
6. **Subscription management** - Billing per organization

---

## Debugging Checklist

When something doesn't work, check:

- [ ] Is central Firebase initialized? Check `window.firebaseAuth`
- [ ] Does organization exist in central DB? Check `organizations/{slug}`
- [ ] Is `window.orgFirebaseConfig` set? Use browser DevTools
- [ ] Are org-app scripts loading? Check Network tab
- [ ] Is `FirebaseManager.getDatabase()` returning correct database?
- [ ] Can user authenticate? Check Firebase Console → Auth
- [ ] Can user read from database? Check Firebase Rules
