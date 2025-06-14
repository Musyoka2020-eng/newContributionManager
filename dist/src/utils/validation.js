/**
 * Validation Utilities
 * 
 * This module provides comprehensive validation functions for the Universal Contribution Manager.
 * It includes validation for user input, data integrity, business rules, and security.
 * 
 * Features:
 * - Email validation
 * - Phone number validation
 * - Currency amount validation
 * - Date validation
 * - String sanitization
 * - Business rule validation
 * - Security validation
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2024-06-14
 */

import { Logger } from './logger.js';

/**
 * Validation utility class
 */
export class ValidationUtils {
    static logger = new Logger({
        context: 'ValidationUtils',
        level: 'warn'
    });

    // ===========================
    // Email Validation
    // ===========================

    /**
     * Validate email address
     * 
     * @param {string} email - Email to validate
     * @returns {Object} Validation result
     */
    static validateEmail(email) {
        const result = {
            isValid: false,
            errors: [],
            sanitized: null
        };

        try {
            if (!email || typeof email !== 'string') {
                result.errors.push('Email is required');
                return result;
            }

            // Sanitize email
            const sanitized = email.trim().toLowerCase();

            // Basic format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitized)) {
                result.errors.push('Invalid email format');
                return result;
            }

            // Length validation
            if (sanitized.length > 254) {
                result.errors.push('Email address is too long');
                return result;
            }

            // Domain validation
            const [localPart, domain] = sanitized.split('@');
            
            if (localPart.length > 64) {
                result.errors.push('Email local part is too long');
                return result;
            }

            if (domain.length > 253) {
                result.errors.push('Email domain is too long');
                return result;
            }

            // Check for common invalid patterns
            const invalidPatterns = [
                /\.{2,}/, // Multiple consecutive dots
                /^\./, // Starting with dot
                /\.$/, // Ending with dot
                /@\./, // Dot immediately after @
                /\.@/ // Dot immediately before @
            ];

            if (invalidPatterns.some(pattern => pattern.test(sanitized))) {
                result.errors.push('Invalid email format');
                return result;
            }

            result.isValid = true;
            result.sanitized = sanitized;

        } catch (error) {
            this.logger.error('Email validation error', error);
            result.errors.push('Email validation failed');
        }

        return result;
    }

    // ===========================
    // Phone Number Validation
    // ===========================

    /**
     * Validate phone number
     * 
     * @param {string} phone - Phone number to validate
     * @param {string} countryCode - Country code (optional)
     * @returns {Object} Validation result
     */
    static validatePhoneNumber(phone, countryCode = 'US') {
        const result = {
            isValid: false,
            errors: [],
            sanitized: null,
            formatted: null
        };

        try {
            if (!phone || typeof phone !== 'string') {
                result.errors.push('Phone number is required');
                return result;
            }

            // Remove all non-digit characters except +
            let sanitized = phone.replace(/[^\d+]/g, '');

            // US phone number validation (default)
            if (countryCode === 'US') {
                // Remove country code if present
                if (sanitized.startsWith('+1')) {
                    sanitized = sanitized.substring(2);
                } else if (sanitized.startsWith('1') && sanitized.length === 11) {
                    sanitized = sanitized.substring(1);
                }

                // Validate US phone number format
                if (sanitized.length !== 10) {
                    result.errors.push('US phone number must be 10 digits');
                    return result;
                }

                // Check for valid area code (not starting with 0 or 1)
                if (sanitized[0] === '0' || sanitized[0] === '1') {
                    result.errors.push('Invalid area code');
                    return result;
                }

                // Format as (XXX) XXX-XXXX
                result.formatted = `(${sanitized.substring(0, 3)}) ${sanitized.substring(3, 6)}-${sanitized.substring(6)}`;
            } else {
                // Basic international validation
                if (sanitized.length < 7 || sanitized.length > 15) {
                    result.errors.push('Phone number must be between 7 and 15 digits');
                    return result;
                }

                result.formatted = sanitized;
            }

            result.isValid = true;
            result.sanitized = sanitized;

        } catch (error) {
            this.logger.error('Phone validation error', error);
            result.errors.push('Phone validation failed');
        }

        return result;
    }

    // ===========================
    // Currency Validation
    // ===========================

    /**
     * Validate currency amount
     * 
     * @param {string|number} amount - Amount to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateCurrencyAmount(amount, options = {}) {
        const result = {
            isValid: false,
            errors: [],
            sanitized: null,
            formatted: null
        };

        const {
            minAmount = 0.01,
            maxAmount = 1000000,
            currency = 'USD',
            allowZero = false
        } = options;

        try {
            if (amount === null || amount === undefined) {
                result.errors.push('Amount is required');
                return result;
            }

            let numericAmount;

            if (typeof amount === 'string') {
                // Remove currency symbols and formatting
                const cleanAmount = amount.replace(/[$,\s]/g, '');
                numericAmount = parseFloat(cleanAmount);
            } else if (typeof amount === 'number') {
                numericAmount = amount;
            } else {
                result.errors.push('Amount must be a number or string');
                return result;
            }

            // Check if it's a valid number
            if (isNaN(numericAmount)) {
                result.errors.push('Invalid amount format');
                return result;
            }

            // Check if it's finite
            if (!isFinite(numericAmount)) {
                result.errors.push('Amount must be a finite number');
                return result;
            }

            // Round to 2 decimal places
            numericAmount = Math.round(numericAmount * 100) / 100;

            // Check minimum amount
            if (!allowZero && numericAmount <= 0) {
                result.errors.push('Amount must be greater than zero');
                return result;
            }

            if (allowZero && numericAmount < 0) {
                result.errors.push('Amount cannot be negative');
                return result;
            }

            if (numericAmount < minAmount) {
                result.errors.push(`Amount must be at least ${this.formatCurrency(minAmount, currency)}`);
                return result;
            }

            // Check maximum amount
            if (numericAmount > maxAmount) {
                result.errors.push(`Amount cannot exceed ${this.formatCurrency(maxAmount, currency)}`);
                return result;
            }

            result.isValid = true;
            result.sanitized = numericAmount;
            result.formatted = this.formatCurrency(numericAmount, currency);

        } catch (error) {
            this.logger.error('Currency validation error', error);
            result.errors.push('Currency validation failed');
        }

        return result;
    }

    // ===========================
    // Date Validation
    // ===========================

    /**
     * Validate date
     * 
     * @param {string|Date} date - Date to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateDate(date, options = {}) {
        const result = {
            isValid: false,
            errors: [],
            sanitized: null,
            formatted: null
        };

        const {
            minDate = null,
            maxDate = null,
            allowFuture = true,
            allowPast = true,
            format = 'ISO'
        } = options;

        try {
            if (!date) {
                result.errors.push('Date is required');
                return result;
            }

            let dateObj;

            if (date instanceof Date) {
                dateObj = date;
            } else if (typeof date === 'string') {
                dateObj = new Date(date);
            } else {
                result.errors.push('Date must be a Date object or string');
                return result;
            }

            // Check if it's a valid date
            if (isNaN(dateObj.getTime())) {
                result.errors.push('Invalid date format');
                return result;
            }

            const now = new Date();

            // Check future/past restrictions
            if (!allowFuture && dateObj > now) {
                result.errors.push('Future dates are not allowed');
                return result;
            }

            if (!allowPast && dateObj < now) {
                result.errors.push('Past dates are not allowed');
                return result;
            }

            // Check min/max dates
            if (minDate && dateObj < new Date(minDate)) {
                result.errors.push(`Date must be after ${new Date(minDate).toLocaleDateString()}`);
                return result;
            }

            if (maxDate && dateObj > new Date(maxDate)) {
                result.errors.push(`Date must be before ${new Date(maxDate).toLocaleDateString()}`);
                return result;
            }

            result.isValid = true;
            result.sanitized = dateObj;
            
            // Format date based on requested format
            switch (format) {
                case 'ISO':
                    result.formatted = dateObj.toISOString();
                    break;
                case 'local':
                    result.formatted = dateObj.toLocaleDateString();
                    break;
                case 'long':
                    result.formatted = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    break;
                default:
                    result.formatted = dateObj.toISOString();
            }

        } catch (error) {
            this.logger.error('Date validation error', error);
            result.errors.push('Date validation failed');
        }

        return result;
    }

    // ===========================
    // String Validation & Sanitization
    // ===========================

    /**
     * Validate and sanitize text input
     * 
     * @param {string} text - Text to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateText(text, options = {}) {
        const result = {
            isValid: false,
            errors: [],
            sanitized: null
        };

        const {
            minLength = 0,
            maxLength = 1000,
            required = false,
            allowHTML = false,
            allowSpecialChars = true,
            pattern = null
        } = options;

        try {
            if (!text && required) {
                result.errors.push('Text is required');
                return result;
            }

            if (!text) {
                result.isValid = true;
                result.sanitized = '';
                return result;
            }

            if (typeof text !== 'string') {
                result.errors.push('Input must be a string');
                return result;
            }

            let sanitized = text.trim();

            // Remove HTML if not allowed
            if (!allowHTML) {
                sanitized = this.stripHTML(sanitized);
            }

            // Remove special characters if not allowed
            if (!allowSpecialChars) {
                sanitized = sanitized.replace(/[^\w\s.-]/g, '');
            }

            // Check length
            if (sanitized.length < minLength) {
                result.errors.push(`Text must be at least ${minLength} characters`);
                return result;
            }

            if (sanitized.length > maxLength) {
                result.errors.push(`Text cannot exceed ${maxLength} characters`);
                return result;
            }

            // Check pattern if provided
            if (pattern && !pattern.test(sanitized)) {
                result.errors.push('Text format is invalid');
                return result;
            }

            result.isValid = true;
            result.sanitized = sanitized;

        } catch (error) {
            this.logger.error('Text validation error', error);
            result.errors.push('Text validation failed');
        }

        return result;
    }

    // ===========================
    // Security Validation
    // ===========================

    /**
     * Validate password strength
     * 
     * @param {string} password - Password to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result with strength score
     */
    static validatePassword(password, options = {}) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            strength: 0,
            strengthText: 'Very Weak'
        };

        const {
            minLength = 8,
            maxLength = 128,
            requireUppercase = true,
            requireLowercase = true,
            requireNumbers = true,
            requireSpecialChars = true,
            preventCommonPasswords = true
        } = options;

        try {
            if (!password || typeof password !== 'string') {
                result.errors.push('Password is required');
                return result;
            }

            let score = 0;

            // Length validation
            if (password.length < minLength) {
                result.errors.push(`Password must be at least ${minLength} characters`);
                return result;
            }

            if (password.length > maxLength) {
                result.errors.push(`Password cannot exceed ${maxLength} characters`);
                return result;
            }

            // Length scoring
            if (password.length >= 8) score += 10;
            if (password.length >= 12) score += 10;
            if (password.length >= 16) score += 10;

            // Character type validation and scoring
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

            if (requireUppercase && !hasUppercase) {
                result.errors.push('Password must contain uppercase letters');
            } else if (hasUppercase) {
                score += 15;
            }

            if (requireLowercase && !hasLowercase) {
                result.errors.push('Password must contain lowercase letters');
            } else if (hasLowercase) {
                score += 15;
            }

            if (requireNumbers && !hasNumbers) {
                result.errors.push('Password must contain numbers');
            } else if (hasNumbers) {
                score += 15;
            }

            if (requireSpecialChars && !hasSpecialChars) {
                result.errors.push('Password must contain special characters');
            } else if (hasSpecialChars) {
                score += 15;
            }

            // Pattern complexity
            const uniqueChars = new Set(password).size;
            if (uniqueChars >= password.length * 0.7) score += 10;

            // Common password check
            if (preventCommonPasswords) {
                const commonPasswords = [
                    'password', '123456', 'password123', 'admin', 'letmein',
                    'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
                ];
                
                if (commonPasswords.includes(password.toLowerCase())) {
                    result.errors.push('Password is too common');
                    score = Math.max(0, score - 30);
                }
            }

            // Sequential characters check
            if (this.hasSequentialChars(password)) {
                result.warnings.push('Avoid sequential characters');
                score = Math.max(0, score - 10);
            }

            // Repeated characters check
            if (this.hasRepeatedChars(password)) {
                result.warnings.push('Avoid repeated characters');
                score = Math.max(0, score - 10);
            }

            // Determine strength
            result.strength = Math.min(100, score);
            
            if (result.strength >= 80) {
                result.strengthText = 'Very Strong';
            } else if (result.strength >= 60) {
                result.strengthText = 'Strong';
            } else if (result.strength >= 40) {
                result.strengthText = 'Moderate';
            } else if (result.strength >= 20) {
                result.strengthText = 'Weak';
            } else {
                result.strengthText = 'Very Weak';
            }

            // Password is valid if no errors
            result.isValid = result.errors.length === 0;

        } catch (error) {
            this.logger.error('Password validation error', error);
            result.errors.push('Password validation failed');
        }

        return result;
    }

    // ===========================
    // Helper Methods
    // ===========================

    /**
     * Strip HTML tags from text
     * 
     * @param {string} text - Text to clean
     * @returns {string} Clean text
     */
    static stripHTML(text) {
        return text.replace(/<[^>]*>/g, '');
    }

    /**
     * Format currency
     * 
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency
     */
    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Check for sequential characters
     * 
     * @param {string} password - Password to check
     * @returns {boolean} Has sequential characters
     */
    static hasSequentialChars(password) {
        const sequences = ['123', '234', '345', '456', '567', '678', '789', '890',
                          'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
                          'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'iop'];
        
        const lowerPassword = password.toLowerCase();
        return sequences.some(seq => lowerPassword.includes(seq));
    }

    /**
     * Check for repeated characters
     * 
     * @param {string} password - Password to check
     * @returns {boolean} Has repeated characters
     */
    static hasRepeatedChars(password) {
        return /(.)\1{2,}/.test(password);
    }

    /**
     * Validate multiple fields at once
     * 
     * @param {Object} data - Data to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    static validateFields(data, rules) {
        const result = {
            isValid: true,
            errors: {},
            sanitized: {}
        };

        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            let fieldResult;

            switch (rule.type) {
                case 'email':
                    fieldResult = this.validateEmail(value);
                    break;
                case 'phone':
                    fieldResult = this.validatePhoneNumber(value, rule.countryCode);
                    break;
                case 'currency':
                    fieldResult = this.validateCurrencyAmount(value, rule.options);
                    break;
                case 'date':
                    fieldResult = this.validateDate(value, rule.options);
                    break;
                case 'text':
                    fieldResult = this.validateText(value, rule.options);
                    break;
                case 'password':
                    fieldResult = this.validatePassword(value, rule.options);
                    break;
                default:
                    fieldResult = { isValid: true, sanitized: value, errors: [] };
            }

            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors[field] = fieldResult.errors;
            } else {
                result.sanitized[field] = fieldResult.sanitized;
            }
        }

        return result;
    }
}
