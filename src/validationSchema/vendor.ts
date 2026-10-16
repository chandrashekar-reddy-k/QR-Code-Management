import * as yup from 'yup';

export const vendorSchema = yup.object({
  // Step 1: Basic Information
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),

  surname: yup
    .string()
    .max(100, 'Surname cannot exceed 100 characters')
    .trim()
    .optional(),

  vendorDesignation: yup
    .string()
    .max(100, 'Vendor designation cannot exceed 100 characters')
    .trim()
    .optional(),

  email: yup
    .string()
    .trim()
    .max(100, 'Email cannot exceed 100 characters')
    .test('valid-email', 'Invalid email address', function(value) {
      if (!value || value.trim() === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    })
    .optional()
    .nullable(),

  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),

  password: yup
    .string()
    .nullable()
    .test('password-required', 'Password is required', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode) return true; // Optional in edit mode
      return value !== null && value !== undefined && value !== '';
    })
    .test('password-min', 'Password must be at least 8 characters', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return value.length >= 8;
    })
    .test('password-max', 'Password cannot exceed 32 characters', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return value.length <= 32;
    })
    .test('password-uppercase', 'Password must contain at least one uppercase letter', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return /[A-Z]/.test(value);
    })
    .test('password-lowercase', 'Password must contain at least one lowercase letter', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return /[a-z]/.test(value);
    })
    .test('password-number', 'Password must contain at least one number', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return /[0-9]/.test(value);
    })
    .test('password-special', 'Password must contain at least one special character', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      if (isEditMode && (!value || value === '')) return true; // Skip if edit mode and no password
      if (!value) return false; // Required validation handled above
      return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    }),

  confirmPassword: yup
    .string()
    .nullable()
    .test('confirm-password-required', 'Please confirm your password', function(value) {
      const isEditMode = this.parent.isEditMode || this.options.context?.isEditMode;
      const password = this.parent.password;
      if (isEditMode && !password) return true; // Optional in edit mode if password not provided
      if (!isEditMode) {
        return value !== null && value !== undefined && value !== '';
      }
      return true;
    })
    .test('passwords-match', 'Passwords must match', function(value) {
      const password = this.parent.password;
      if (!password) return true; // Skip if password is empty
      return value === password;
    }),

  // Step 2: Store Information
  storeName: yup
    .string()
    .required('Store name is required')
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name cannot exceed 100 characters')
    .trim(),

  categoryIds: yup
    .string()
    .required('At least one category is required')
    .test('not-empty', 'At least one category is required', (value) => {
      return value !== '' && value.trim() !== '';
    }),

  storeDescription: yup
    .string()
    .max(1000, 'Store description cannot exceed 1000 characters')
    .trim()
    .optional()
    .nullable(),

  // Step 3: Tax & Business Information
  taxName: yup
    .string()
    .required('Tax name is required')
    .min(2, 'Tax name must be at least 2 characters')
    .max(50, 'Tax name cannot exceed 50 characters')
    .trim(),

  taxNumber: yup
    .string()
    .required('Tax number is required')
    .min(2, 'Tax number must be at least 2 characters')
    .max(50, 'Tax number cannot exceed 50 characters')
    .trim(),

  panNumber: yup
    .string()
    .required('PAN number is required')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format (e.g., ABCDE1234F)')
    .trim()
    .uppercase(),

  commission: yup
    .number()
    .required('Commission is required')
    .min(0, 'Commission cannot be negative')
    .max(100, 'Commission cannot exceed 100%')
    .typeError('Commission must be a number'),

  productStatus: yup
    .boolean()
    .required('Product status is required'),

  requireProductApproval: yup
    .boolean()
    .required('Product approval requirement is required'),

  selfPickupMode: yup
    .boolean()
    .required('Self pickup mode is required'),

  // Step 4: Location Information
  city: yup
    .string()
    .required('City is required')
    .test('valid-city', 'Please select a valid city', (value) => {
      return value !== '' && value !== '0';
    }),

  state: yup
    .string()
    .required('State is required')
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters')
    .trim(),

  line1: yup
    .string()
    .required('Address line 1 is required')
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters')
    .trim(),

  line2: yup
    .string()
    .max(200, 'Address line 2 cannot exceed 200 characters')
    .trim()
    .optional()
    .nullable(),

  pincode: yup
    .string()
    .required('Pincode is required')
    .matches(/^[0-9]{6}$/, 'Pincode must be exactly 6  digits')
    .trim(),

  latitude: yup
    .number()
    .required('Latitude is required')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .typeError('Latitude must be a number'),

  longitude: yup
    .number()
    .required('Longitude is required')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .typeError('Longitude must be a number'),

  // Step 5: Bank Information
  bankName: yup
    .string()
    .required('Bank name is required')
    .min(2, 'Bank name must be at least 2 characters')
    .max(100, 'Bank name cannot exceed 100 characters')
    .trim(),

  accountNumber: yup
    .string()
    .required('Account number is required')
    .min(9, 'Account number must be at least 9 digits')
    .max(18, 'Account number cannot exceed 18 digits')
    .matches(/^[0-9]+$/, 'Account number must contain only digits')
    .trim(),

  ifscCode: yup
    .string()
    .required('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., ABCD0123456)')
    .trim()
    .uppercase(),

  bankAccountName: yup
    .string()
    .required('Bank account name is required')
    .min(2, 'Bank account name must be at least 2 characters')
    .max(100, 'Bank account name cannot exceed 100 characters')
    .trim(),

  branch: yup
    .string()
    .max(100, 'Branch name cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),

  // Image URL fields (API requires URLs, not files)
  logo: yup
    .string()
    .required('Logo URL is required')
    .url('Logo must be a valid URL')
    .test('url-format', 'Logo must be a valid URL starting with http:// or https://', function(value) {
      if (!value) return false;
      return /^https?:\/\/.+/.test(value);
    }),

  nationalIdentityCard: yup
    .string()
    .required('National Identity Card URL is required')
    .url('National Identity Card must be a valid URL')
    .test('url-format', 'National Identity Card must be a valid URL starting with http:// or https://', function(value) {
      if (!value) return false;
      return /^https?:\/\/.+/.test(value);
    }),

  addressProof: yup
    .string()
    .required('Address proof URL is required')
    .url('Address proof must be a valid URL')
    .test('url-format', 'Address proof must be a valid URL starting with http:// or https://', function(value) {
      if (!value) return false;
      return /^https?:\/\/.+/.test(value);
    }),
});

export type VendorFormData = yup.InferType<typeof vendorSchema>;

