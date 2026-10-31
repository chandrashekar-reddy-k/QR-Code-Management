// validations/storeValidation.js
import { checkSchema } from 'express-validator';

/**
 * Validation rules for creating store profile
 */
export const createStoreValidator = checkSchema({
    name: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'Store name is required'
        },
        isLength: {
            options: { min: 2, max: 100 },
            errorMessage: 'Store name must be between 2 and 100 characters'
        }
    },
    panNumber: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'PAN number is required'
        },
        matches: {
            options: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
            errorMessage: 'Invalid PAN number format (e.g., ABCDE1234F)'
        }
    },
    logoUrl: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'Logo URL is required'
        },
        isURL: {
            errorMessage: 'Logo URL must be a valid URL'
        }
    },
    nationalIdUrl: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'National ID document URL is required'
        },
        isURL: {
            errorMessage: 'National ID URL must be a valid URL'
        }
    },
    addressProofUrl: {
        in: ['body'],
        trim: true,
        notEmpty: {
            errorMessage: 'Address proof document URL is required'
        },
        isURL: {
            errorMessage: 'Address proof URL must be a valid URL'
        }
    },
    description: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 500 },
            errorMessage: 'Description must not exceed 500 characters'
        }
    },
    categoryIds: {
        in: ['body'],
        optional: true,
        isArray: {
            errorMessage: 'Category IDs must be an array'
        },
        custom: {
            options: (value) => {
                if (!value || value.length === 0) return true;
                return value.every(id => Number.isInteger(id) && id > 0);
            },
            errorMessage: 'All category IDs must be positive integers'
        }
    },
    taxName: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 100 },
            errorMessage: 'Tax name must not exceed 100 characters'
        }
    },
    taxNumber: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 50 },
            errorMessage: 'Tax number must not exceed 50 characters'
        }
    }
});

/**
 * Validation rules for updating store profile
 */
export const updateStoreValidator = checkSchema({
    name: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'Store name cannot be empty'
        },
        isLength: {
            options: { min: 2, max: 100 },
            errorMessage: 'Store name must be between 2 and 100 characters'
        }
    },
    panNumber: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'PAN number cannot be empty'
        },
        matches: {
            options: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
            errorMessage: 'Invalid PAN number format (e.g., ABCDE1234F)'
        }
    },
    logoUrl: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'Logo URL cannot be empty'
        },
        isURL: {
            errorMessage: 'Logo URL must be a valid URL'
        }
    },
    nationalIdUrl: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'National ID document URL cannot be empty'
        },
        isURL: {
            errorMessage: 'National ID URL must be a valid URL'
        }
    },
    addressProofUrl: {
        in: ['body'],
        optional: true,
        trim: true,
        notEmpty: {
            errorMessage: 'Address proof document URL cannot be empty'
        },
        isURL: {
            errorMessage: 'Address proof URL must be a valid URL'
        }
    },
    description: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 500 },
            errorMessage: 'Description must not exceed 500 characters'
        }
    },
    categoryIds: {
        in: ['body'],
        optional: true,
        isArray: {
            errorMessage: 'Category IDs must be an array'
        },
        custom: {
            options: (value) => {
                if (!value || value.length === 0) return true;
                return value.every(id => Number.isInteger(id) && id > 0);
            },
            errorMessage: 'All category IDs must be positive integers'
        }
    },
    taxName: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 100 },
            errorMessage: 'Tax name must not exceed 100 characters'
        }
    },
    taxNumber: {
        in: ['body'],
        optional: true,
        trim: true,
        isLength: {
            options: { max: 50 },
            errorMessage: 'Tax number must not exceed 50 characters'
        }
    }
});
