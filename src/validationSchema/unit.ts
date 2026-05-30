import * as yup from 'yup';

export const unitSchema = yup.object({
  name: yup
    .string()
    .required('Unit name is required')
    .min(2, 'Unit name must be at least 2 characters')
    .max(100, 'Unit name cannot exceed 100 characters')
    .trim(),
  
  shortCode: yup
    .string()
    .required('Short code is required')
    .min(1, 'Short code must be at least 1 character')
    .max(20, 'Short code cannot exceed 20 characters')
    .trim(),
  
  parentUnit: yup
    .string()
    .max(100, 'Parent unit cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  
  conversion: yup
    .number()
    .min(0, 'Conversion must be a positive number')
    .nullable()
    .transform((value, originalValue) => {
      // Handle empty string or undefined
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      const parsed = typeof originalValue === 'string' ? parseFloat(originalValue) : originalValue;
      return isNaN(parsed) ? null : parsed;
    })
    .test('conversion-required-if-parent', 'Conversion is required when parent unit is selected', function(value) {
      const parentUnit = this.parent.parentUnit;
      if (parentUnit && parentUnit.trim()) {
        return value !== null && value !== undefined;
      }
      return true;
    }),
});

export type UnitFormData = yup.InferType<typeof unitSchema>;

