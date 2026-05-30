import * as yup from "yup";

export const roleSchema = yup.object({
  name: yup
    .string()
    .required("Role name is required")
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name cannot exceed 100 characters")
    .trim(),

  permissions: yup
    .array()
    .of(yup.string())
    .min(1, "At least one permission must be selected")
    .required("Permissions are required"),
});

export type RoleFormData = yup.InferType<typeof roleSchema>;
