// Helper function to convert File to base64 string
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Interface for form data (matches VendorFormData from schema)
interface VendorFormData {
  name: string;
  surname?: string;
  vendorDesignation?: string;
  email?: string | null;
  phone: string;
  password?: string | null;
  confirmPassword?: string | null;
  storeName: string;
  categoryIds: string; // Comma-separated string
  storeDescription?: string | null;
  taxName: string; // Required by API and validation schema
  taxNumber: string; // Required by API and validation schema
  panNumber: string;
  commission: number;
  productStatus: boolean;
  requireProductApproval: boolean;
  selfPickupMode: boolean;
  city: string;
  state: string;
  line1: string;
  line2?: string | null;
  pincode: string;
  latitude: number;
  longitude: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankAccountName: string;
  branch?: string | null;
  logo: string; // URL string - required
  nationalIdentityCard: string; // URL string - required
  addressProof: string; // URL string - required
}

// Interface for API payload
export interface VendorApiPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  avatar: string; // Required by API
  bankInfo: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  store: {
    name: string;
    description?: string;
    categoryIds: number[];
    taxName: string; // Required by API
    taxNumber: string; // Required by API
    panNumber: string;
    commission: number;
    logoUrl: string; // Required by API
    nationalIdUrl: string; // Required by API
    addressProofUrl: string; // Required by API
  };
  settings: {
    requireProductApproval: boolean;
    selfPickupMode: boolean;
  };
}

/**
 * Maps form data to API payload structure
 * Converts files to base64 strings (URLs)
 */
export const mapVendorFormToApiPayload = async (
  formData: VendorFormData
): Promise<VendorApiPayload> => {
  // Convert categoryIds string to array of numbers
  const categoryIdsArray = formData.categoryIds
    .split(',')
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id));

  // Image URLs - form data now provides URLs directly (validated by schema)
  const logoUrl = formData.logo.trim();
  const nationalIdUrl = formData.nationalIdentityCard.trim();
  const addressProofUrl = formData.addressProof.trim();
  const avatar = logoUrl; // Use logo as avatar

  // Tax name and tax number are required (validated by schema)
  const taxName = formData.taxName.trim();
  const taxNumber = formData.taxNumber.trim();

  // Build API payload
  const payload: VendorApiPayload = {
    name: formData.name,
    phone: formData.phone,
    ...(formData.email && formData.email.trim() ? { email: formData.email.trim() } : {}),
    ...(formData.password && { password: formData.password }),
    // Avatar (use logo URL) - required field
    avatar: avatar,
    bankInfo: {
      accountHolderName: formData.bankAccountName,
      accountNumber: formData.accountNumber,
      ifsc: formData.ifscCode,
      bankName: formData.bankName,
      ...(formData.branch && { branch: formData.branch }),
    },
    address: {
      line1: formData.line1,
      ...(formData.line2 && { line2: formData.line2 }),
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      location: {
        lat: formData.latitude,
        lng: formData.longitude,
      },
    },
    store: {
      name: formData.storeName,
      ...(formData.storeDescription &&  { description: formData.storeDescription }),
      categoryIds: categoryIdsArray,
      // Tax name and tax number are required (validated by schema, but ensure they're strings)
      taxName: taxName,
      taxNumber: taxNumber,
      panNumber: formData.panNumber,
      commission: formData.commission,
      // Image URLs (required fields)
      logoUrl: logoUrl,
      nationalIdUrl: nationalIdUrl,
      addressProofUrl: addressProofUrl,
    },
    settings: {
      requireProductApproval: formData.requireProductApproval,
      selfPickupMode: formData.selfPickupMode,
    },
  };

  // Log payload for debugging
  console.log('Vendor Payload being sent:', JSON.stringify(payload, null, 2));

  return payload;
};

