// validators/productValidation.js
import { checkSchema } from "express-validator";

const MAX_IMAGES = 10;
const MAX_IMAGE_URL_LENGTH = 2000;
const IMAGE_URL_REGEX = /^https?:\/\/.+/i;

const imageUrlValidator = (value) => {
  if (!value || typeof value !== "string") return true;
  if (value.length > MAX_IMAGE_URL_LENGTH) {
    throw new Error(`Image URL must be at most ${MAX_IMAGE_URL_LENGTH} characters`);
  }
  if (!IMAGE_URL_REGEX.test(value)) {
    throw new Error("Image must be a valid HTTP/HTTPS URL");
  }
  return true;
};

export const createProductValidator = checkSchema({
  name: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Product name cannot be empty" },
    isString: { errorMessage: "Product name must be a string" },
  },
  price: {
    in: ["body"],
    notEmpty: { errorMessage: "Price is required" },
    isFloat: { options: { min: 0 }, errorMessage: "Price must be a positive number" },
  },
  mrp: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "MRP must be a positive number" },
  },
  category: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Category cannot be empty" },
    isString: { errorMessage: "Category must be a string" },
  },
  subCategory: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "SubCategory must be a string" },
  },
  brand: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Brand must be a string" },
  },
  unit: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Unit cannot be empty" },
    isString: { errorMessage: "Unit must be a string" },
  },
  warehouseId: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Warehouse ID cannot be empty" },
    isUUID: { errorMessage: "Warehouse ID must be a valid UUID" },
  },
  supplierId: {
    in: ["body"],
    optional: true,
    isUUID: { errorMessage: "Supplier ID must be a valid UUID" },
  },
  description: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Description must be a string" },
  },
  images: {
    in: ["body"],
    optional: true,
    isArray: { errorMessage: "Images must be an array of strings", options: { max: MAX_IMAGES } },
    custom: {
      options: (val) => {
        if (!Array.isArray(val)) return true;
        for (let i = 0; i < val.length; i++) {
          try {
            imageUrlValidator(val[i]);
          } catch (e) {
            throw new Error(`images[${i}]: ${e.message}`);
          }
        }
        return true;
      }
    },
  },
  weight: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "Weight must be a positive number" },
  },
  dimensions: {
    in: ["body"],
    optional: true,
    isObject: { errorMessage: "Dimensions must be a valid JSON object" },
  },
  stock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "Stock must be a non-negative integer" },
  },
  threshold: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "Threshold must be a non-negative integer" },
  },
  stockGap: {
    in: ["body"],
    optional: true,
    isInt: { errorMessage: "StockGap must be an integer" },
  },
  minStock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "minStock must be a non-negative integer" },
  },
  maxStock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "maxStock must be a non-negative integer" },
  },
  costPrice: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "Cost price must be a positive number" },
  },
  margin: {
    in: ["body"],
    optional: true,
    isFloat: { errorMessage: "Margin must be a number" },
  },
  batchNumber: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Batch number must be a string" },
  },
  certifications: {
    in: ["body"],
    optional: true,
    isObject: { errorMessage: "Certifications must be a valid JSON object" },
  },
  isActive: {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "isActive must be a boolean" },
  },
  isFeatured: {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "isFeatured must be a boolean" },
  },
  tags: {
    in: ["body"],
    optional: true,
    isArray: { errorMessage: "Tags must be an array of strings" },
  },
});


export const bulkStockValidator = checkSchema({
  items: {
    in: ["body"],
    isArray: { errorMessage: "items must be an array", options: { min: 1 } },
    custom: {
      options: (val) => {
        if (!Array.isArray(val) || val.length === 0) throw new Error("items must be a non-empty array");
        for (let i = 0; i < val.length; i++) {
          if (!val[i] || typeof val[i].productId !== "string" || val[i].productId.trim() === "") {
            throw new Error(`items[${i}].productId is required`);
          }
          const q = val[i].quantity;
          if (q === undefined || q === null || isNaN(Number(q)) || Number(q) < 0) {
            throw new Error(`items[${i}].quantity must be a non-negative number`);
          }
        }
        return true;
      }
    },
  },
});

export const bulkDeactivateValidator = checkSchema({
  productIds: {
    in: ["body"],
    isArray: { errorMessage: "productIds must be an array", options: { min: 1 } },
    custom: {
      options: (val) => {
        if (!Array.isArray(val) || val.length === 0) throw new Error("productIds must be a non-empty array");
        return true;
      }
    },
  },
});

export const updateProductValidator = checkSchema({
  name: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Product name must be a string" },
    trim: true,
  },
  price: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "Price must be a positive number" },
  },
  mrp: {
    in: ["body"],
    optional: true,
    custom: {
      options: (value) => {
        // Allow null explicitly (used to clear/rollback an offer or flash deal)
        if (value === null) return true;
        // Allow omitted field
        if (value === undefined) return true;
        // Must be a non-negative number when provided
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) throw new Error("MRP must be a non-negative number");
        return true;
      },
    },
  },
  category: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Category must be a string" },
    trim: true,
  },
  subCategory: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "SubCategory must be a string" },
  },
  brand: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Brand must be a string" },
  },
  unit: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Unit must be a string" },
    trim: true,
  },
  warehouseId: {
    in: ["body"],
    optional: true,
    isUUID: { errorMessage: "Warehouse ID must be a valid UUID" },
  },
  supplierId: {
    in: ["body"],
    optional: true,
    isUUID: { errorMessage: "Supplier ID must be a valid UUID" },
  },
  description: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Description must be a string" },
  },
  images: {
    in: ["body"],
    optional: true,
    isArray: { errorMessage: "Images must be an array of strings", options: { max: MAX_IMAGES } },
    custom: {
      options: (val) => {
        if (!Array.isArray(val)) return true;
        for (let i = 0; i < val.length; i++) {
          try {
            imageUrlValidator(val[i]);
          } catch (e) {
            throw new Error(`images[${i}]: ${e.message}`);
          }
        }
        return true;
      }
    },
  },
  weight: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "Weight must be a positive number" },
  },
  dimensions: {
    in: ["body"],
    optional: true,
    isObject: { errorMessage: "Dimensions must be a valid JSON object" },
  },
  stock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "Stock must be a non-negative integer" },
  },
  threshold: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "Threshold must be a non-negative integer" },
  },
  stockGap: {
    in: ["body"],
    optional: true,
    isInt: { errorMessage: "StockGap must be an integer" },
  },
  minStock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "minStock must be a non-negative integer" },
  },
  maxStock: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 }, errorMessage: "maxStock must be a non-negative integer" },
  },
  costPrice: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 }, errorMessage: "Cost price must be a positive number" },
  },
  margin: {
    in: ["body"],
    optional: true,
    isFloat: { errorMessage: "Margin must be a number" },
  },
  batchNumber: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: "Batch number must be a string" },
  },
  certifications: {
    in: ["body"],
    optional: true,
    isObject: { errorMessage: "Certifications must be a valid JSON object" },
  },
  isActive: {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "isActive must be a boolean" },
  },
  isFeatured: {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "isFeatured must be a boolean" },
  },
  tags: {
    in: ["body"],
    optional: true,
    isArray: { errorMessage: "Tags must be an array of strings" },
  },
  flashDealEnd: {
    in: ["body"],
    optional: true,
    custom: {
      options: (value) => {
        if (value === null) return true;
        // Accept string representation of date or Date object
        const parsed = Date.parse(value);
        if (isNaN(parsed)) {
          throw new Error("flashDealEnd must be a valid ISO Date or null");
        }
        return true;
      }
    }
  }
});

export const bulkStatusValidator = checkSchema({
  productIds: {
    in: ["body"],
    isArray: { errorMessage: "productIds must be an array", options: { min: 1 } },
    custom: {
      options: (val) => {
        if (!Array.isArray(val) || val.length === 0) throw new Error("productIds must be a non-empty array");
        if (val.some((id) => typeof id !== "string" || !id.trim())) throw new Error("Each productId must be a non-empty string");
        return true;
      }
    },
  },
  status: {
    in: ["body"],
    notEmpty: { errorMessage: "status is required" },
    isIn: { options: [["APPROVED", "REJECTED"]], errorMessage: "status must be APPROVED or REJECTED" },
  },
});




