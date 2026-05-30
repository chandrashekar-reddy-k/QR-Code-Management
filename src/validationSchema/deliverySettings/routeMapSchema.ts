import * as yup from "yup";

export const routeMapSchema = yup.object({
  routeArea: yup
    .string()
    .required("Route/Area is required")
    .min(2, "Route/Area must be at least 2 characters")
    .max(25, "Route/Area cannot exceed 25 characters")
    .trim(),
});

export type RouteMapFormData = yup.InferType<typeof routeMapSchema>;
