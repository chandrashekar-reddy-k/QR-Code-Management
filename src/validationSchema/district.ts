import * as yup from "yup";

export const districtSchema = yup.object({
  stateId: yup.string().required("State is required").trim(),

  districtName: yup
    .string()
    .required("District name is required")
    .min(2, "District name must be at least 2 characters")
    .max(100, "District name cannot exceed 100 characters")
    .trim(),
});

export type DistrictFormData = yup.InferType<typeof districtSchema>;
