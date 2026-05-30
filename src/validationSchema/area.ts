import * as yup from "yup";

export const areaSchema = yup.object({
  district: yup.string().required("District is required").trim(),

  cityName: yup
    .string()
    .required("City name is required")
    .min(2, "City name must be at least 2 characters")
    .max(100, "City name cannot exceed 100 characters")
    .trim(),
});

export type AreaFormData = yup.InferType<typeof areaSchema>;

