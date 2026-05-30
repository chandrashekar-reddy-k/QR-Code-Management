import * as yup from 'yup';

export const subCategorySchema = yup.object().shape({
  parentCategory: yup
    .string()
    .required('Parent category is required')
    .test('valid-parent', 'Please select a valid parent category', (value) => {
      return value !== '';
    }),

  categoryName: yup
    .string()
    .required('Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters'),

  slug: yup
    .string()
    .required('Slug is required')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must not exceed 100 characters'),

  categorySubtitle: yup
    .string()
    .required('Category subtitle is required')
    .min(2, 'Category subtitle must be at least 2 characters')
    .max(200, 'Category subtitle must not exceed 200 characters'),

  image: yup
    .mixed<File>()
    .nullable()
    .test('file-required', 'Image is required', function(value) {
      // Only validate on create (not on edit)
      const editingId = this.parent.editingId;
      if (editingId) return true; // Skip validation for edits
      return value !== null && value !== undefined;
    })
    .test('file-size', 'File size is too large (max 10MB)', function(value) {
      if (!value || !(value instanceof File)) return true;
      return value.size <= 10 * 1024 * 1024; // 10MB
    })
    .test('file-type', 'Unsupported file format', function(value) {
      if (!value || !(value instanceof File)) return true;
      return ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'].includes(value.type);
    }),

  metaTitle: yup
    .string()
    .nullable()
    .max(60, 'Meta title should not exceed 60 characters'),

  metaKeywords: yup
    .string()
    .nullable()
    .max(200, 'Meta keywords should not exceed 200 characters'),

  schemaMarkup: yup
    .string()
    .nullable()
    .test('json-valid', 'Invalid JSON format', function(value) {
      if (!value || value.trim() === '') return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }),

  metaDescription: yup
    .string()
    .nullable()
    .max(160, 'Meta description should not exceed 160 characters'),
});

export type SubCategoryFormData = yup.InferType<typeof subCategorySchema>;