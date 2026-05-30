import * as yup from "yup";

export const adminSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),

  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),

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
          .max(20, "Password must not exceed 20 characters")
          .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            "Password must contain uppercase, lowercase, number and special character"
          ),
      otherwise: (schema) => schema.optional().nullable(),
    }),

  role: yup
    .string()
    .required("Role is required")
    .trim(),

  status: yup
    .string()
    .required("Status is required")
    .oneOf(["active", "inactive"], "Status must be active or inactive"),
});

export type AdminFormData = yup.InferType<typeof adminSchema>;

