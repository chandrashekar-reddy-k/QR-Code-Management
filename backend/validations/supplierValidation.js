// validations/supplierValidation.js
import { checkSchema } from 'express-validator';

/**
 * Validation rules for creating supplier profile
 */
export const createSupplierValidator = checkSchema({
    companyName: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'Company name is required'
        },
        isLength: {
            options: { min: 2, max: 200 },
            errorMessage: 'Company name must be between 2 and 200 characters'
        }
    },
    gstin: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { min: 15, max: 15 },
            errorMessage: 'GSTIN must be exactly 15 characters'
        },
        matches: {
            options: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            errorMessage: 'Invalid GSTIN format'
        }
    },
    businessAddress: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Business address is required'
        },
        custom: {
            options: (value) => {
                if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                    throw new Error('Business address must be a valid JSON object');
                }
                // Validate required address fields
                if (!value.line1 || !value.city || !value.state || !value.pincode) {
                    throw new Error('Business address must include line1, city, state, and pincode');
                }
                return true;
            }
        }
    },
    licenseDocs: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('License documents must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    },
    operatingHours: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('Operating hours must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    },
    deliveryOptions: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('Delivery options must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    }
});

/**
 * Validation rules for updating supplier profile
 */
export const updateSupplierValidator = checkSchema({
    companyName: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'Company name cannot be empty'
        },
        isLength: {
            options: { min: 2, max: 200 },
            errorMessage: 'Company name must be between 2 and 200 characters'
        }
    },
    gstin: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { min: 15, max: 15 },
            errorMessage: 'GSTIN must be exactly 15 characters'
        },
        matches: {
            options: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            errorMessage: 'Invalid GSTIN format'
        }
    },
    businessAddress: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('Business address must be a valid JSON object');
                    }
                    if (!value.line1 || !value.city || !value.state || !value.pincode) {
                        throw new Error('Business address must include line1, city, state, and pincode');
                    }
                }
                return true;
            }
        }
    },
    licenseDocs: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('License documents must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    },
    operatingHours: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('Operating hours must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    },
    deliveryOptions: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value) => {
                if (value !== null && value !== undefined) {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        throw new Error('Delivery options must be a valid JSON object');
                    }
                }
                return true;
            }
        }
    }
});
