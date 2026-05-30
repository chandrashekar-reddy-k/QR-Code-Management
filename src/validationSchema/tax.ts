import * as yup from 'yup';

export const taxSchema = yup.object({
  title: yup
    .string()
    .required('Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  
  percentage: yup
    .number()
    .required('Percentage is required')
    .min(0, 'Percentage must be a positive number')
    .max(100, 'Percentage cannot exceed 100')
    .transform((value, originalValue) => {
      // Handle empty string or undefined
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return undefined;
      }
      const parsed = typeof originalValue === 'string' ? parseFloat(originalValue) : originalValue;
      return isNaN(parsed) ? undefined : parsed;
    }),
});

export type TaxFormData = yup.InferType<typeof taxSchema>;

