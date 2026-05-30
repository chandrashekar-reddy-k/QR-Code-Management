import * as yup from "yup";

export const partnerSchema = yup.object({
  warehouseAddress: yup
    .string()
    .required('Warehouse address is required')
    .min(2, 'Warehouse address must be at least 2 characters'),
  city: yup
    .string()
    .required('City is required'),
  lat: yup
    .string()
    .required('Latitude is required'),
  lang: yup
    .string()
    .required('Longitude is required'),
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),

  mobile: yup
    .string()
    .required("Mobile number is required")
    .matches(/^[0-9]{10}$/, "Mobile must be exactly 10 digits"),

  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format")
    .trim(),

  password: yup
    .string()
    .when("$isEditMode", {
      is: false,
      then: (schema) =>
        schema
          .required("Password is required")
          .min(6, "Password must be at least 6 characters")
          .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            "Password must contain uppercase, lowercase, number and special character"
          ),
      otherwise: (schema) => schema.optional().nullable(),
    }),

  confirmPassword: yup
    .string()
    .when("$isEditMode", {
      is: false,
      then: (schema) =>
        schema
          .required("Confirm password is required")
          .oneOf([yup.ref("password")], "Passwords must match"),
      otherwise: (schema) => schema.optional().nullable(),
    }),

    warehouseName: yup
    .string()
    .required("Warehouse name is required")
    .min(2, "Warehouse name must be at least 2 characters")
    .max(200, "Warehouse name cannot exceed 200 characters")
    .trim(),

  status: yup
    .string()
    .required("Status is required")
    .oneOf(["active", "inactive"], "Status must be active or inactive"),
});

export type PartnerFormData = yup.InferType<typeof partnerSchema>;

