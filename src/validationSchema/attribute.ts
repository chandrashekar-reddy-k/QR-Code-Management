import * as yup from 'yup';

export const attributeSchema = yup.object({
  name: yup
    .string()
    .required('Attribute name is required')
    .min(2, 'Attribute name must be at least 2 characters')
    .max(100, 'Attribute name cannot exceed 100 characters')
    .trim(),

  type: yup
    .string()
    .required('Attribute type is required')
    .oneOf(['SINGLE_SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN', 'DATE'], 'Invalid attribute type'),

  displayOrder: yup
    .number()
    .required('Display order is required')
    .min(0, 'Display order must be 0 or greater')
    .integer('Display order must be an integer'),

  isRequired: yup
    .boolean()
    .required('Required field must be specified'),

  isFilterable: yup
    .boolean()
    .required('Filterable field must be specified'),

  isSearchable: yup
    .boolean()
    .required('Searchable field must be specified'),
});

export type AttributeFormData = yup.InferType<typeof attributeSchema>;

