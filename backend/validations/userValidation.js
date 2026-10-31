import { checkSchema } from "express-validator";
import * as prismaModule from '@prisma/client';

const UserRole = prismaModule.UserRole || prismaModule.default?.UserRole || {
  CONSUMER: 'CONSUMER',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  DELIVERY_AGENT: 'DELIVERY_AGENT',
  SUPER_ADMIN: 'SUPER_ADMIN',
  REGIONAL_ADMIN: 'REGIONAL_ADMIN',
  OPERATIONAL_ADMIN: 'OPERATIONAL_ADMIN',
  SUPPLIER: 'SUPPLIER',
  VENDOR: 'VENDOR',
  PARTNER: 'PARTNER',
  OWNER: 'OWNER',
  DIRECTOR: 'DIRECTOR',
  MANAGER: 'MANAGER',
  VEHICLE_AGENT: 'VEHICLE_AGENT',
  SHOPKEEPER: 'SHOPKEEPER'
};

export const sendOtpValidator = checkSchema({
  countryCode: {
    in: ["body"],
    trim: true,
    notEmpty: true,
    errorMessage: "Country code cannot be empty",
    isString: {
      errorMessage: "Country code must be string",
    },
  },
  phone: {
    in: ["body"],
    trim: true,
    notEmpty: true,
    errorMessage: "Mobile number cannot be empty",
    isString: {
      errorMessage: "Mobile number must be string",
    },
  },
});
export const verifyOtpValidator = checkSchema({
  countryCode: {
    in: ["body"],
    trim: true,
    notEmpty: true,
    errorMessage: "Country code cannot be empty",
    isString: {
      errorMessage: "Country code must be string",
    },
  },
  phone: {
    in: ["body"],
    trim: true,
    notEmpty: true,
    errorMessage: "Mobile number cannot be empty",
    isString: {
      errorMessage: "Mobile number must be string",
    },
  },
  otp: {
    in: ["body"],
    trim: true,
    notEmpty: true,
    errorMessage: "OTP cannot be empty",
    isString: {
      errorMessage: "OTP must be string",
    },
  },
});
export const createUserValidator = checkSchema({
  // Basic fields
  phone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Phone number cannot be empty" },
    isLength: {
      options: { min: 10, max: 10 },
      errorMessage: "Phone number must be 10 digits",
    },
    isNumeric: { errorMessage: "Phone number must contain only digits" },
  },

  role: {
    in: ["body"],
    notEmpty: { errorMessage: "Role cannot be empty" },
    isIn: {
      options: [Object.values(UserRole)],
      errorMessage: "Invalid role",
    },
  },

  name: {
    in: ["body"],
    notEmpty: { errorMessage: "Name cannot be empty" },
    custom: {
      options: (value) => {
        if (!value || typeof value !== "string") {
          throw new Error("Name must be a string");
        }

        // Strict regex: only alphabets and spaces
        const regex = /^[A-Za-z ]+$/;
        if (!regex.test(value)) {
          throw new Error(
            "Name must contain only alphabets and spaces (no numbers or special characters allowed)"
          );
        }
        return true;
      },
    },
  },

  email: {
    in: ["body"],
    optional: true,
    isEmail: { errorMessage: "Invalid email format" },
  },

  password: {
    in: ["body"],
    optional: true, // ✅ only hashed if provided
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters long",
    },
  },

  avatar: { in: ["body"], optional: false },
  vehicleType: { in: ["body"], optional: true },
  licensePlate: { in: ["body"], optional: true },

  region: {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.REGIONAL_ADMIN && !value) {
          throw new Error("Region is required for REGIONAL_ADMIN");
        }
        return true;
      },
    },
  },

  // Address validation (always required)
  "address.line1": {
    in: ["body"],
    notEmpty: { errorMessage: "Address line1 cannot be empty" },
  },
  "address.city": {
    in: ["body"],
    notEmpty: { errorMessage: "City cannot be empty" },
  },
  "address.state": {
    in: ["body"],
    notEmpty: { errorMessage: "State cannot be empty" },
  },
  "address.pincode": {
    in: ["body"],
    notEmpty: { errorMessage: "Pincode cannot be empty" },
    isLength: {
      options: { min: 6, max: 6 },
      errorMessage: "Pincode must be 6 digits",
    },
    isNumeric: { errorMessage: "Pincode must contain only digits" },
  },
  "address.label": { in: ["body"], optional: true, isString: true },
  "address.line2": { in: ["body"], optional: true, isString: true },
  "address.isDefault": {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "isDefault must be true or false" },
  },
  "address.location": {
    in: ["body"],
    optional: true,
    isObject: { errorMessage: "Location must be an object" },
  },

  // Warehouse validation (for WAREHOUSE_STAFF)
  "warehouse.name": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.WAREHOUSE_STAFF && !value) {
          throw new Error("Warehouse name is required for WAREHOUSE_STAFF");
        }
        return true;
      },
    },
  },
  "warehouse.location": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.WAREHOUSE_STAFF && !value) {
          throw new Error("Warehouse location is required for WAREHOUSE_STAFF");
        }
        return true;
      },
    },
  },
  "warehouse.address": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.WAREHOUSE_STAFF && !value) {
          throw new Error("Warehouse address is required for WAREHOUSE_STAFF");
        }
        return true;
      },
    },
  },
  "warehouse.servicePincodes": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (
          req.body.role === UserRole.WAREHOUSE_STAFF &&
          (!value || !Array.isArray(value) || value.length === 0)
        ) {
          throw new Error(
            "Warehouse servicePincodes are required for WAREHOUSE_STAFF"
          );
        }
        return true;
      },
    },
  },
  "warehouse.opensAt": { in: ["body"], optional: true },
  "warehouse.closesAt": { in: ["body"], optional: true },
  "warehouse.isActive": {
    in: ["body"],
    optional: true,
    isBoolean: { errorMessage: "Warehouse isActive must be true or false" },
  },

  // Supplier validation (for SUPPLIER)
  "supplier.companyName": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.SUPPLIER && !value) {
          throw new Error("Supplier companyName is required for SUPPLIER");
        }
        return true;
      },
    },
  },
  "supplier.businessAddress": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.SUPPLIER && !value) {
          throw new Error("Supplier businessAddress is required for SUPPLIER");
        }
        return true;
      },
    },
  },
  "supplier.gstin": { in: ["body"], optional: true },
  "supplier.licenseDocs": { in: ["body"], optional: true },
  "supplier.operatingHours": { in: ["body"], optional: true },
  "supplier.deliveryOptions": { in: ["body"], optional: true },
  // 🚗 VehicleInfo validation (for DELIVERY_AGENT)
  "vehicleInfo.vehicleType": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle type is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.brand": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle brand is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.model": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle model is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.year": {
    in: ["body"],
    optional: true,
    isInt: { errorMessage: "Vehicle year must be a valid integer" },
  },
  "vehicleInfo.color": { in: ["body"], optional: true },
  "vehicleInfo.registrationNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { registrationNumber: value },
          });

          // Allow if it's the same agent updating their own vehicle
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle registration number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.engineNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { engineNumber: value },
          });
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle engine number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.chassisNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { chassisNumber: value },
          });
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle chassis number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.insuranceProvider": { in: ["body"], optional: true },
  "vehicleInfo.policyNumber": { in: ["body"], optional: true },
  "vehicleInfo.insuranceExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "Insurance expiry must be a valid date" },
  },
  "vehicleInfo.drivingLicenseNumber": { in: ["body"], optional: true },
  "vehicleInfo.licenseExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "License expiry must be a valid date" },
  },
  "vehicleInfo.rcExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "RC expiry must be a valid date" },
  },
  "vehicleInfo.pucExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "PUC expiry must be a valid date" },
  },
});
export const updateUserValidator = checkSchema({
  userId: {
    in: ["params"],
    notEmpty: { errorMessage: "User ID is required" },
    isUUID: { errorMessage: "Invalid User ID format" },
  },

  phone: {
    in: ["body"],
    optional: true,
    isLength: {
      options: { min: 10, max: 10 },
      errorMessage: "Phone number must be 10 digits",
    },
    isNumeric: { errorMessage: "Phone number must contain only digits" },
  },

  name: {
    in: ["body"],
    optional: true,
    matches: {
      options: [/^[A-Za-z\s]+$/],
      errorMessage: "Name must contain only alphabets and spaces",
    },
  },

  email: {
    in: ["body"],
    optional: true,
    isEmail: { errorMessage: "Invalid email format" },
  },

  password: {
    in: ["body"],
    optional: true,
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters long",
    },
  },

  avatar: { in: ["body"], optional: true },
  vehicleType: { in: ["body"], optional: true },
  licensePlate: { in: ["body"], optional: true },
  region: { in: ["body"], optional: true },
  isActive: { in: ["body"], optional: true, isBoolean: true },

  // Optional nested fields
  "address.line1": { in: ["body"], optional: true },
  "address.city": { in: ["body"], optional: true },
  "address.state": { in: ["body"], optional: true },
  "address.pincode": {
    in: ["body"],
    optional: true,
    isLength: {
      options: { min: 6, max: 6 },
      errorMessage: "Pincode must be 6 digits",
    },
  },

  "warehouse.name": { in: ["body"], optional: true },
  "warehouse.location": { in: ["body"], optional: true },
  "warehouse.address": { in: ["body"], optional: true },
  "warehouse.servicePincodes": { in: ["body"], optional: true },

  "supplier.companyName": { in: ["body"], optional: true },
  "supplier.businessAddress": { in: ["body"], optional: true },
  // 🚗 VehicleInfo validation (for DELIVERY_AGENT)
  "vehicleInfo.vehicleType": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle type is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.brand": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle brand is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.model": {
    in: ["body"],
    custom: {
      options: (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && !value) {
          throw new Error("Vehicle model is required for DELIVERY_AGENT");
        }
        return true;
      },
    },
  },
  "vehicleInfo.year": {
    in: ["body"],
    optional: true,
    isInt: { errorMessage: "Vehicle year must be a valid integer" },
  },
  "vehicleInfo.color": { in: ["body"], optional: true },
  "vehicleInfo.registrationNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { registrationNumber: value },
          });

          // Allow if it's the same agent updating their own vehicle
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle registration number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.engineNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { engineNumber: value },
          });
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle engine number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.chassisNumber": {
    in: ["body"],
    custom: {
      options: async (value, { req }) => {
        if (req.body.role === UserRole.DELIVERY_AGENT && value) {
          const existing = await prisma.vehicleInfo.findUnique({
            where: { chassisNumber: value },
          });
          if (existing && existing.agentId !== req.params.userId) {
            throw new Error("Vehicle chassis number already exists");
          }
        }
        return true;
      },
    },
  },
  "vehicleInfo.insuranceProvider": { in: ["body"], optional: true },
  "vehicleInfo.policyNumber": { in: ["body"], optional: true },
  "vehicleInfo.insuranceExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "Insurance expiry must be a valid date" },
  },
  "vehicleInfo.drivingLicenseNumber": { in: ["body"], optional: true },
  "vehicleInfo.licenseExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "License expiry must be a valid date" },
  },
  "vehicleInfo.rcExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "RC expiry must be a valid date" },
  },
  "vehicleInfo.pucExpiry": {
    in: ["body"],
    optional: true,
    isISO8601: { errorMessage: "PUC expiry must be a valid date" },
  },
});
