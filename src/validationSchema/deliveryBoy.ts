import * as yup from "yup";

export const deliveryBoySchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),

  dateOfBirth: yup.string().required("Date of birth is required"),

  mobile: yup
    .string()
    .required("Mobile is required")
    .matches(/^[0-9]{10}$/, "Mobile must be exactly 10 digits"),

  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format")
    .trim(),

  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),

  confirmPassword: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("password")], "Passwords must match"),

  ifscCode: yup
    .string()
    .required("IFSC code is required")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .trim(),

  bankName: yup.string().required("Bank name is required").trim(),

  accountNumber: yup.string().required("Account number is required").trim(),

  bankAccountName: yup
    .string()
    .required("Bank account name is required")
    .trim(),

  city: yup.string().required("City is required"),

  state: yup.string().optional().nullable(),

  street: yup.string().optional().nullable(),

  latitude: yup
    .number()
    .required("Latitude is required")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: yup
    .number()
    .required("Longitude is required")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  address: yup.string().optional().nullable(),

  pincode: yup
    .string()
    .required("Pincode is required")
    .matches(/^[0-9]{6}$/, "Pincode must be exactly 6 digits"),

  addressLabel: yup.string().optional().nullable(),

  otherPaymentInformation: yup.string().optional().nullable(),

  drivingLicense: yup
    .mixed<File>()
    .required("Driving license is required")
    .test("fileSize", "File size is too large", (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return true; // For string URLs in edit mode
    })
    .test("fileType", "Unsupported file format", (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
          "image/webp",
          "application/pdf",
        ].includes(value.type);
      }
      return true; // For string URLs in edit mode
    }),

  nationalIdentityCard: yup
    .mixed<File>()
    .required("National identity card is required")
    .test("fileSize", "File size is too large", (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return true; // For string URLs in edit mode
    })
    .test("fileType", "Unsupported file format", (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
          "image/webp",
          "application/pdf",
        ].includes(value.type);
      }
      return true; // For string URLs in edit mode
    }),

  bonusType: yup.string().optional().nullable(),

  avatar: yup
    .mixed<File>()
    .optional()
    .nullable()
    .test("fileSize", "File size is too large", (value) => {
      if (!value) return true; // Optional field
      if (value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return true; // For string URLs in edit mode
    })
    .test("fileType", "Unsupported file format", (value) => {
      if (!value) return true; // Optional field
      if (value instanceof File) {
        return [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
          "image/webp",
        ].includes(value.type);
      }
      return true; // For string URLs in edit mode
    }),
});

export type DeliveryBoyFormData = yup.InferType<typeof deliveryBoySchema>;
