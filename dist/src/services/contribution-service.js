/**
 * Contribution Service
 * 
 * This service handles all contribution-related operations including:
 * - Creating, updating, and deleting contributions
 * - Managing contribution types and categories
 * - Handling recurring contributions
 * - Generating contribution reports
 * - Integration with payment systems
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2024-06-14
 */

import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getFirebaseServices } from '../config/firebase.js';
import { AuthService } from './auth-service.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { EventBus } from '../core/event-bus.js';

/**
 * Contribution Service Class
 * 
 * Manages all contribution-related operations with Firebase Firestore
 */
export class ContributionService {
    /**
     * Initialize the service
     */
    static async init() {
        this.logger = new Logger({
            context: 'ContributionService',
            level: 'info'
        });
        
        this.errorHandler = new ErrorHandler();
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        this.logger.info('ContributionService initialized');
    }

    // ===========================
    // Contribution CRUD Operations
    // ===========================

    /**
     * Create a new contribution
     * 
     * @param {Object} contributionData - Contribution data
     * @param {string} contributionData.amount - Contribution amount
     * @param {string} contributionData.type - Contribution type (one-time, recurring)
     * @param {string} contributionData.category - Contribution category
     * @param {string} contributionData.description - Description or note
     * @param {string} contributionData.organizationId - Target organization ID
     * @param {Date} contributionData.date - Contribution date
     * @param {Object} contributionData.metadata - Additional metadata
     * @returns {Promise<Object>} Created contribution with ID
     */
    static async createContribution(contributionData) {
        try {
            this.logger.info('Creating new contribution', { contributionData });

            // Get current user
            const currentUser = await AuthService.getCurrentUser();
            if (!currentUser.user) {
                throw new Error('User must be authenticated to create contributions');
            }

            // Validate contribution data
            this.validateContributionData(contributionData);

            // Prepare contribution document
            const contribution = {
                ...contributionData,
                amount: parseFloat(contributionData.amount),
                userId: currentUser.user.uid,
                userEmail: currentUser.user.email,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                metadata: {
                    createdBy: currentUser.user.uid,
                    source: 'web',
                    ...contributionData.metadata
                }
            };

            // Add to Firestore
            const docRef = await addDoc(collection(db, 'contributions'), contribution);
            
            const createdContribution = {
                id: docRef.id,
                ...contribution,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Clear cache
            this.clearCache();

            // Emit event
            EventBus.emit('contribution:created', createdContribution);

            this.logger.info('Contribution created successfully', { 
                contributionId: docRef.id 
            });

            return createdContribution;

        } catch (error) {
            this.logger.error('Failed to create contribution', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.createContribution',
                contributionData
            });
            throw error;
        }
    }

    /**
     * Get contribution by ID
     * 
     * @param {string} contributionId - Contribution ID
     * @returns {Promise<Object|null>} Contribution data or null if not found
     */
    static async getContribution(contributionId) {
        try {
            this.logger.debug('Getting contribution', { contributionId });

            // Check cache first
            const cacheKey = `contribution_${contributionId}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // Get from Firestore
            const docRef = doc(db, 'contributions', contributionId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                this.logger.warn('Contribution not found', { contributionId });
                return null;
            }

            const contribution = {
                id: docSnap.id,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate(),
                updatedAt: docSnap.data().updatedAt?.toDate()
            };

            // Cache the result
            this.setCache(cacheKey, contribution);

            return contribution;

        } catch (error) {
            this.logger.error('Failed to get contribution', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.getContribution',
                contributionId
            });
            throw error;
        }
    }

    /**
     * Update contribution
     * 
     * @param {string} contributionId - Contribution ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated contribution
     */
    static async updateContribution(contributionId, updates) {
        try {
            this.logger.info('Updating contribution', { contributionId, updates });

            // Get current user
            const currentUser = await AuthService.getCurrentUser();
            if (!currentUser.user) {
                throw new Error('User must be authenticated to update contributions');
            }

            // Get existing contribution to check permissions
            const existingContribution = await this.getContribution(contributionId);
            if (!existingContribution) {
                throw new Error('Contribution not found');
            }

            // Check permissions
            if (!this.canModifyContribution(existingContribution, currentUser.user)) {
                throw new Error('Insufficient permissions to modify this contribution');
            }

            // Prepare updates
            const contributionUpdates = {
                ...updates,
                updatedAt: serverTimestamp(),
                'metadata.lastModifiedBy': currentUser.user.uid
            };

            // Validate amount if being updated
            if (updates.amount !== undefined) {
                contributionUpdates.amount = parseFloat(updates.amount);
            }

            // Update in Firestore
            const docRef = doc(db, 'contributions', contributionId);
            await updateDoc(docRef, contributionUpdates);

            // Get updated contribution
            const updatedContribution = await this.getContribution(contributionId);

            // Clear cache
            this.clearCache();

            // Emit event
            EventBus.emit('contribution:updated', {
                contributionId,
                updates: contributionUpdates,
                contribution: updatedContribution
            });

            this.logger.info('Contribution updated successfully', { contributionId });

            return updatedContribution;

        } catch (error) {
            this.logger.error('Failed to update contribution', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.updateContribution',
                contributionId,
                updates
            });
            throw error;
        }
    }

    /**
     * Delete contribution
     * 
     * @param {string} contributionId - Contribution ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteContribution(contributionId) {
        try {
            this.logger.info('Deleting contribution', { contributionId });

            // Get current user
            const currentUser = await AuthService.getCurrentUser();
            if (!currentUser.user) {
                throw new Error('User must be authenticated to delete contributions');
            }

            // Get existing contribution to check permissions
            const existingContribution = await this.getContribution(contributionId);
            if (!existingContribution) {
                throw new Error('Contribution not found');
            }

            // Check permissions
            if (!this.canModifyContribution(existingContribution, currentUser.user)) {
                throw new Error('Insufficient permissions to delete this contribution');
            }

            // Delete from Firestore
            const docRef = doc(db, 'contributions', contributionId);
            await deleteDoc(docRef);

            // Clear cache
            this.clearCache();

            // Emit event
            EventBus.emit('contribution:deleted', {
                contributionId,
                contribution: existingContribution
            });

            this.logger.info('Contribution deleted successfully', { contributionId });

            return true;

        } catch (error) {
            this.logger.error('Failed to delete contribution', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.deleteContribution',
                contributionId
            });
            throw error;
        }
    }

    // ===========================
    // Query Operations
    // ===========================

    /**
     * Get contributions with filtering and pagination
     * 
     * @param {Object} options - Query options
     * @param {string} options.userId - Filter by user ID
     * @param {string} options.organizationId - Filter by organization ID
     * @param {string} options.status - Filter by status
     * @param {Date} options.startDate - Filter by start date
     * @param {Date} options.endDate - Filter by end date
     * @param {string} options.orderBy - Order by field (default: createdAt)
     * @param {string} options.orderDirection - Order direction (asc/desc)
     * @param {number} options.limit - Limit results (default: 25)
     * @param {string} options.startAfter - Pagination cursor
     * @returns {Promise<Object>} Query results with pagination info
     */
    static async getContributions(options = {}) {
        try {
            this.logger.debug('Getting contributions', { options });

            const {
                userId,
                organizationId,
                status,
                startDate,
                endDate,
                orderBy: orderByField = 'createdAt',
                orderDirection = 'desc',
                limit: limitCount = 25,
                startAfter: startAfterDoc
            } = options;

            // Build query
            let q = collection(db, 'contributions');
            const constraints = [];

            // Apply filters
            if (userId) {
                constraints.push(where('userId', '==', userId));
            }

            if (organizationId) {
                constraints.push(where('organizationId', '==', organizationId));
            }

            if (status) {
                constraints.push(where('status', '==', status));
            }

            if (startDate) {
                constraints.push(where('createdAt', '>=', startDate));
            }

            if (endDate) {
                constraints.push(where('createdAt', '<=', endDate));
            }

            // Add ordering
            constraints.push(orderBy(orderByField, orderDirection));

            // Add limit
            constraints.push(limit(limitCount));

            // Add pagination
            if (startAfterDoc) {
                constraints.push(startAfter(startAfterDoc));
            }

            // Execute query
            q = query(q, ...constraints);
            const querySnapshot = await getDocs(q);

            // Process results
            const contributions = [];
            const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

            querySnapshot.forEach((doc) => {
                contributions.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                });
            });

            const result = {
                contributions,
                hasMore: contributions.length === limitCount,
                lastDoc,
                total: contributions.length,
                query: options
            };

            this.logger.debug('Contributions retrieved', { 
                count: contributions.length,
                hasMore: result.hasMore
            });

            return result;

        } catch (error) {
            this.logger.error('Failed to get contributions', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.getContributions',
                options
            });
            throw error;
        }
    }

    /**
     * Get contribution statistics
     * 
     * @param {Object} filters - Filter options
     * @param {string} filters.userId - Filter by user ID
     * @param {string} filters.organizationId - Filter by organization ID
     * @param {Date} filters.startDate - Filter by start date
     * @param {Date} filters.endDate - Filter by end date
     * @returns {Promise<Object>} Contribution statistics
     */
    static async getContributionStats(filters = {}) {
        try {
            this.logger.debug('Getting contribution statistics', { filters });

            // Check cache first
            const cacheKey = `stats_${JSON.stringify(filters)}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // Get all contributions matching filters
            const result = await this.getContributions({
                ...filters,
                limit: 1000 // Get more for accurate stats
            });

            const contributions = result.contributions;

            // Calculate statistics
            const stats = {
                totalContributions: contributions.length,
                totalAmount: 0,
                averageAmount: 0,
                statusBreakdown: {},
                typeBreakdown: {},
                categoryBreakdown: {},
                monthlyTrend: {},
                topContributors: []
            };

            contributions.forEach(contribution => {
                // Total amount
                stats.totalAmount += contribution.amount || 0;

                // Status breakdown
                const status = contribution.status || 'unknown';
                stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;

                // Type breakdown
                const type = contribution.type || 'unknown';
                stats.typeBreakdown[type] = (stats.typeBreakdown[type] || 0) + 1;

                // Category breakdown
                const category = contribution.category || 'uncategorized';
                stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + 1;

                // Monthly trend
                if (contribution.createdAt) {
                    const monthKey = contribution.createdAt.toISOString().substring(0, 7); // YYYY-MM
                    if (!stats.monthlyTrend[monthKey]) {
                        stats.monthlyTrend[monthKey] = { count: 0, amount: 0 };
                    }
                    stats.monthlyTrend[monthKey].count += 1;
                    stats.monthlyTrend[monthKey].amount += contribution.amount || 0;
                }
            });

            // Calculate average
            stats.averageAmount = stats.totalContributions > 0 
                ? stats.totalAmount / stats.totalContributions 
                : 0;

            // Format currency values
            stats.totalAmountFormatted = this.formatCurrency(stats.totalAmount);
            stats.averageAmountFormatted = this.formatCurrency(stats.averageAmount);

            // Cache the result
            this.setCache(cacheKey, stats);

            this.logger.debug('Contribution statistics calculated', stats);

            return stats;

        } catch (error) {
            this.logger.error('Failed to get contribution statistics', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.getContributionStats',
                filters
            });
            throw error;
        }
    }

    // ===========================
    // Batch Operations
    // ===========================

    /**
     * Create multiple contributions in a batch
     * 
     * @param {Array} contributionsData - Array of contribution data
     * @returns {Promise<Array>} Array of created contributions
     */
    static async createBatchContributions(contributionsData) {
        try {
            this.logger.info('Creating batch contributions', { 
                count: contributionsData.length 
            });

            if (contributionsData.length === 0) {
                return [];
            }

            if (contributionsData.length > 500) {
                throw new Error('Batch size cannot exceed 500 contributions');
            }

            // Get current user
            const currentUser = await AuthService.getCurrentUser();
            if (!currentUser.user) {
                throw new Error('User must be authenticated to create contributions');
            }

            // Validate all contributions
            contributionsData.forEach((data, index) => {
                try {
                    this.validateContributionData(data);
                } catch (error) {
                    throw new Error(`Invalid contribution data at index ${index}: ${error.message}`);
                }
            });

            // Create batch
            const batch = writeBatch(db);
            const createdContributions = [];

            contributionsData.forEach((contributionData) => {
                const docRef = doc(collection(db, 'contributions'));
                
                const contribution = {
                    ...contributionData,
                    amount: parseFloat(contributionData.amount),
                    userId: currentUser.user.uid,
                    userEmail: currentUser.user.email,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    metadata: {
                        createdBy: currentUser.user.uid,
                        source: 'batch',
                        ...contributionData.metadata
                    }
                };

                batch.set(docRef, contribution);
                
                createdContributions.push({
                    id: docRef.id,
                    ...contribution,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            });

            // Commit batch
            await batch.commit();

            // Clear cache
            this.clearCache();

            // Emit event
            EventBus.emit('contributions:batchCreated', {
                contributions: createdContributions,
                count: createdContributions.length
            });

            this.logger.info('Batch contributions created successfully', { 
                count: createdContributions.length 
            });

            return createdContributions;

        } catch (error) {
            this.logger.error('Failed to create batch contributions', error);
            this.errorHandler.handleError(error, {
                context: 'ContributionService.createBatchContributions',
                count: contributionsData.length
            });
            throw error;
        }
    }

    // ===========================
    // Helper Methods
    // ===========================

    /**
     * Validate contribution data
     * 
     * @param {Object} contributionData - Contribution data to validate
     * @throws {Error} If validation fails
     */
    static validateContributionData(contributionData) {
        const required = ['amount', 'type', 'organizationId'];
        
        for (const field of required) {
            if (!contributionData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate amount
        const amount = parseFloat(contributionData.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        if (amount > 1000000) {
            throw new Error('Amount cannot exceed $1,000,000');
        }

        // Validate type
        const validTypes = ['one-time', 'recurring', 'pledge'];
        if (!validTypes.includes(contributionData.type)) {
            throw new Error(`Invalid contribution type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate date if provided
        if (contributionData.date && !(contributionData.date instanceof Date)) {
            throw new Error('Date must be a valid Date object');
        }
    }

    /**
     * Check if user can modify contribution
     * 
     * @param {Object} contribution - Contribution to check
     * @param {Object} user - User object
     * @returns {boolean} Whether user can modify
     */
    static canModifyContribution(contribution, user) {
        // Users can modify their own contributions
        if (contribution.userId === user.uid) {
            return true;
        }

        // Admins and managers can modify any contribution
        const privilegedRoles = ['admin', 'manager'];
        if (privilegedRoles.includes(user.role)) {
            return true;
        }

        return false;
    }

    /**
     * Format currency value
     * 
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Get data from cache
     * 
     * @param {string} key - Cache key
     * @returns {*} Cached data or null
     */
    static getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        
        if (cached) {
            this.cache.delete(key);
        }
        
        return null;
    }

    /**
     * Set data in cache
     * 
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    static setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    static clearCache() {
        this.cache.clear();
    }
}

// Initialize the service
ContributionService.init();
